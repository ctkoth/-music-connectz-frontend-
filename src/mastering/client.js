// The browser half of Mix ConnectZ: decoding a file into samples, and talking
// to the mastering worker. Everything that measures or changes audio is in the
// pure modules beside this; this file only moves samples between them and the
// page.
import { sniffSampleRate } from "./sniff.js";

// One worker for the page. Created lazily so opening the IntelligenceZ hub
// does not spin one up for a member who never masters anything.
let worker = null;
let seq = 0;
const pending = new Map();

function fail(message, extra = {}) {
  const e = new Error(message);
  Object.assign(e, extra);
  return e;
}

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./mastering.worker.js", import.meta.url), { type: "module" });
  worker.onmessage = (e) => {
    const { id, progress, stage, ok, result, error } = e.data || {};
    const job = pending.get(id);
    if (!job) return;
    if (progress != null) { job.onProgress && job.onProgress(progress, stage); return; }
    pending.delete(id);
    if (ok) job.resolve(result); else job.reject(fail(error || "The mastering engine stopped."));
  };
  // A worker script is a hashed file like every lazy chunk, so a tab opened
  // before a deploy asks for one that is gone and gets the site's HTML back.
  // That is the stale-chunk failure chunkError.js exists for: say what it is,
  // and that a reload fixes it, instead of a spinner that never ends.
  worker.onerror = (e) => {
    e.preventDefault && e.preventDefault();
    const err = fail("The mastering engine didn't load — usually a new version just shipped. Reload the page and try again.", { stale: true });
    for (const [, job] of pending) job.reject(err);
    pending.clear();
    worker && worker.terminate();
    worker = null;
  };
  return worker;
}

export function run(op, payload, { onProgress, transfer = [] } = {}) {
  const w = getWorker();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    w.postMessage({ id, op, ...payload }, transfer);
  });
}

// The longest song accepted. Past it, the samples alone need more memory than
// a phone browser will give one tab, and the failure there is the tab
// crashing — so it is refused up front with the reason.
export const MAX_SECONDS = 15 * 60;

// Decode at the file's OWN sample rate. decodeAudioData resamples to its
// context's rate, so the rate is read from the file header first (sniff.js)
// and the decoding context is built at it. A file whose header we cannot read
// is decoded at 44.1 kHz, and `resampled` says so — the screen states it
// rather than letting a member download a different rate without knowing.
export async function decodeFile(fileOrBuffer) {
  const buf = fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await fileOrBuffer.arrayBuffer();
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Off) throw fail("This browser can't decode audio. Try Chrome, Edge, Firefox or Safari.");
  const native = sniffSampleRate(new Uint8Array(buf, 0, Math.min(buf.byteLength, 9 * 1024 * 1024)));
  const rate = native || 44100;
  // Safari's older decodeAudioData only has the callback form, so both are handled.
  const decodeWith = (ctx, data) => new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(data, resolve, reject);
    if (p && p.then) p.then(resolve, reject);
  });
  let audio;
  try {
    audio = await decodeWith(new Off(2, 1, rate), buf.slice(0));
  } catch {
    throw fail("That file couldn't be read as audio. WAV, MP3, M4A/AAC, FLAC and OGG all work; a video file's sound usually does too.");
  }
  if (audio.duration > MAX_SECONDS) {
    throw fail(`That song is ${Math.round(audio.duration / 60)} minutes long. Mix ConnectZ masters up to ${MAX_SECONDS / 60} minutes — on a phone, more than that runs out of memory.`);
  }
  const channels = [];
  for (let c = 0; c < Math.min(2, audio.numberOfChannels); c++) channels.push(Float32Array.from(audio.getChannelData(c)));
  return { channels, sampleRate: audio.sampleRate, seconds: audio.duration, resampled: !native };
}

export function toAudioBuffer(ctx, channels, sampleRate) {
  const b = ctx.createBuffer(channels.length, channels[0].length, sampleRate);
  channels.forEach((x, i) => b.copyToChannel(x, i));
  return b;
}

export function saveBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slug(s) {
  return String(s || "master").toLowerCase().replace(/\.[a-z0-9]{2,4}$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "master";
}
