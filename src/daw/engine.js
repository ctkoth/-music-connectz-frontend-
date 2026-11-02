// The DAW engine every DawZ workflow shares: decoding, playback, recording and the bounce.
//
// ONE graph builder serves the speakers and the bounce (an AudioContext and an OfflineAudioContext
// take the same calls), so what the member approved by ear is what the file contains — the same rule
// VideoZ's engine follows.
//
// Per track:   regions ─► (region gain + fades) ─► inserts ─► fader ─► pan ─► meter ─► master ─► out
//
// Recording is taken from the mic INSIDE the same AudioContext (an AudioWorklet, or a
// ScriptProcessor where worklets are missing), so every captured sample has a position on the same
// clock the playback runs on. A MediaRecorder starts whenever the browser gets round to it, which
// is how takes land a few tens of milliseconds late and flam against the beat. What the device itself
// adds — the time playback takes to reach the speaker and the mic to reach the page — is measured
// where the browser reports it and taken off, and the screen says by how much.
import { audible, beatSeconds, lengthOf, playlistOf } from "./session.js";
import { buildInsert, dbToGain } from "./plugins.js";
import { encodeWav } from "../mastering/wav.js";

const CAPTURE_WORKLET = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0];
    if (ch && ch.length) this.port.postMessage({ frame: currentFrame, data: ch.map((c) => c.slice(0)) });
    return true;
  }
}
registerProcessor("mcz-capture", Capture);`;

let seq = 0;
const srcId = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

/** About 100 buckets a second, so a zoomed-in region still has detail, capped for very long files. */
const peakCount = (buf) => Math.min(40000, Math.max(200, Math.round(buf.duration * 100)));

/** Peaks for drawing: `n` buckets of [min, max] over the source, mono-summed. */
export function computePeaks(buffer, n = 1000) {
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const len = buffer.length;
  const per = Math.max(1, Math.floor(len / n));
  const out = new Float32Array(n * 2);
  for (let b = 0; b < n; b++) {
    let lo = 0; let hi = 0;
    const start = b * per;
    const end = Math.min(len, start + per);
    for (let i = start; i < end; i += 4) {
      let v = 0;
      for (const c of chans) v += c[i];
      v /= chans.length;
      if (v < lo) lo = v; if (v > hi) hi = v;
    }
    out[b * 2] = lo; out[b * 2 + 1] = hi;
  }
  return out;
}

/**
 * Wire a session into `ctx` from timeline time `from`, starting at context time `t0`.
 * Returns the per-track nodes so a live session can move faders without a restart.
 * `live` builds every track (muted ones at zero, so unmuting is instant) and meters them;
 * a bounce builds only what is heard.
 */
export function buildGraph(ctx, session, buffers, { from = 0, t0 = ctx.currentTime, live = false } = {}) {
  const master = ctx.createGain();
  master.gain.value = dbToGain(session.master);
  master.connect(ctx.destination);
  const heard = new Set(audible(session).map((t) => t.id));
  const tracks = {};
  const sources = [];
  for (const t of live ? session.tracks : session.tracks.filter((x) => heard.has(x.id))) {
    const sum = ctx.createGain();
    let tail = sum;
    for (const ins of t.inserts || []) {
      const node = buildInsert(ctx, ins, { bpm: session.bpm });
      tail.connect(node.input);
      tail = node.output;
    }
    const fader = ctx.createGain();
    fader.gain.value = heard.has(t.id) ? dbToGain(t.gain) : 0;
    const pan = ctx.createStereoPanner();
    pan.pan.value = t.pan;
    tail.connect(fader).connect(pan);
    let meter = null;
    if (live) {
      meter = ctx.createAnalyser();
      meter.fftSize = 1024;
      pan.connect(meter);
    }
    pan.connect(master);
    tracks[t.id] = { fader, pan, meter };
    for (const r of playlistOf(t).regions) {
      const buf = buffers.get(r.src);
      if (!buf) continue;
      const end = r.at + (r.out - r.in);
      if (end <= from) continue;
      const skip = Math.max(0, from - r.at);
      const when = t0 + Math.max(0, r.at - from);
      const dur = r.out - r.in - skip;
      if (dur <= 0) continue;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const g = ctx.createGain();
      const level = dbToGain(r.gain);
      // Fades as automation on the region's own gain: a straight line in, a straight line out.
      const len = r.out - r.in;
      const startPos = skip;                       // where in the region playback starts
      const at = (pos) => when + (pos - startPos);
      const levelAt = (pos) => {
        let v = level;
        if (r.fadeIn > 0 && pos < r.fadeIn) v *= pos / r.fadeIn;
        if (r.fadeOut > 0 && pos > len - r.fadeOut) v *= Math.max(0, (len - pos) / r.fadeOut);
        return v;
      };
      g.gain.setValueAtTime(levelAt(startPos), when);
      if (r.fadeIn > 0 && startPos < r.fadeIn) g.gain.linearRampToValueAtTime(level, at(r.fadeIn));
      if (r.fadeOut > 0) {
        const fadeStart = Math.max(startPos, len - r.fadeOut);
        g.gain.setValueAtTime(levelAt(fadeStart), at(fadeStart));
        g.gain.linearRampToValueAtTime(0, at(len));
      }
      s.connect(g).connect(sum);
      s.start(when, r.in + skip, dur);
      sources.push(s);
    }
  }
  return { master, tracks, sources };
}

/** RMS of an analyser right now, in dBFS (−Infinity for silence). */
function levelDb(an, scratch) {
  an.getFloatTimeDomainData(scratch);
  let sum = 0;
  for (let i = 0; i < scratch.length; i++) sum += scratch[i] * scratch[i];
  const rms = Math.sqrt(sum / scratch.length);
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

export function createDaw() {
  let ctx = null;
  const buffers = new Map();
  const peaks = new Map();
  let graph = null;
  let playing = null;               // { from, t0 }
  let clickTimer = null;
  let rec = null;
  let masterMeter = null;
  const scratch = new Float32Array(1024);

  const audio = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
    return ctx;
  };

  async function decode(arrayBuffer, name) {
    const c = audio();
    const buf = await c.decodeAudioData(arrayBuffer.slice(0));
    const id = srcId();
    buffers.set(id, buf);
    peaks.set(id, computePeaks(buf, peakCount(buf)));
    return { id, name, duration: buf.duration, channels: buf.numberOfChannels, rate: buf.sampleRate };
  }

  /** Put a decoded buffer back under its old id (a session reopened from the device). */
  function adopt(id, buf) {
    buffers.set(id, buf);
    peaks.set(id, computePeaks(buf, peakCount(buf)));
  }

  function stopSources() {
    if (clickTimer) { clearInterval(clickTimer); clickTimer = null; }
    if (graph) {
      graph.sources.forEach((s) => { try { s.stop(); } catch { /* already ended */ } });
      try { graph.master.disconnect(); } catch { /* gone */ }
      graph = null;
    }
  }

  function startClick(session, from, t0) {
    const c = audio();
    const beat = beatSeconds(session);
    let next = Math.ceil(from / beat - 1e-6);
    const schedule = () => {
      const horizon = c.currentTime + 0.3;
      for (;;) {
        const when = t0 + (next * beat - from);
        if (when > horizon) break;
        if (when >= c.currentTime - 0.01) {
          const o = c.createOscillator(); const g = c.createGain();
          o.frequency.value = next % session.meter === 0 ? 1600 : 1000;
          g.gain.setValueAtTime(0.35, when);
          g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
          o.connect(g).connect(c.destination);
          o.start(when); o.stop(when + 0.06);
        }
        next += 1;
      }
    };
    schedule();
    clickTimer = setInterval(schedule, 100);
  }

  async function play(session, from = 0, { click = false } = {}) {
    const c = audio();
    if (c.state !== "running") await c.resume();
    stopSources();
    const t0 = c.currentTime + 0.06;
    graph = buildGraph(c, session, buffers, { from, t0, live: true });
    masterMeter = c.createAnalyser();
    masterMeter.fftSize = 1024;
    graph.master.connect(masterMeter);
    playing = { from, t0 };
    if (click) startClick(session, from, t0);
    return t0;
  }

  function stop() {
    const pos = position();
    stopSources();
    playing = null;
    return pos;
  }

  function position() {
    if (!playing || !ctx) return null;
    return playing.from + Math.max(0, ctx.currentTime - playing.t0);
  }

  /** Move faders and pans of a playing session without restarting it. */
  function setLive(session) {
    if (!graph) return;
    const heard = new Set(audible(session).map((t) => t.id));
    graph.master.gain.setTargetAtTime(dbToGain(session.master), ctx.currentTime, 0.01);
    for (const t of session.tracks) {
      const n = graph.tracks[t.id];
      if (!n) continue;
      n.fader.gain.setTargetAtTime(heard.has(t.id) ? dbToGain(t.gain) : 0, ctx.currentTime, 0.01);
      n.pan.pan.setTargetAtTime(t.pan, ctx.currentTime, 0.01);
    }
  }

  function meters() {
    const out = {};
    if (!graph) return out;
    for (const [id, n] of Object.entries(graph.tracks)) if (n.meter) out[id] = levelDb(n.meter, scratch);
    if (masterMeter) out.master = levelDb(masterMeter, scratch);
    return out;
  }

  /** Arm the mic. Resolves once the browser has said yes. Errors carry the browser's own `name`. */
  async function openMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      const e = new Error("This page can't reach a microphone here — it needs a secure (https) address.");
      e.name = "NoMediaDevices";
      throw e;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    return stream;
  }

  /**
   * Record from `from` on the timeline while the session plays (overdub). Returns the context time
   * recording started. `stopRecording()` resolves with { id, duration, offset } for the new source.
   */
  async function startRecording(session, from, { click = false, stream }) {
    const c = audio();
    if (c.state !== "running") await c.resume();
    const t0 = await play(session, from, { click });
    const input = c.createMediaStreamSource(stream);
    const chunks = [];
    const startFrame = Math.round(t0 * c.sampleRate);
    const take = (frame, data) => {
      const skip = Math.max(0, startFrame - frame);
      if (skip >= data[0].length) return;
      chunks.push(data.map((d) => (skip ? d.slice(skip) : d)));
    };
    let node;
    if (c.audioWorklet && typeof AudioWorkletNode !== "undefined") {
      if (!rec?.workletReady) {
        const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "text/javascript" }));
        await c.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
      }
      node = new AudioWorkletNode(c, "mcz-capture", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2 });
      node.port.onmessage = (e) => take(e.data.frame, e.data.data);
    } else {
      node = c.createScriptProcessor(4096, 2, 2);
      node.onaudioprocess = (e) => {
        const frame = Math.round(e.playbackTime * c.sampleRate);
        take(frame, Array.from({ length: e.inputBuffer.numberOfChannels }, (_, i) => e.inputBuffer.getChannelData(i).slice(0)));
      };
    }
    // A silent sink keeps the node pulled without sending the mic to the speakers — monitoring the
    // mic through the page would feed it straight back into itself on a phone's speaker.
    const sink = c.createGain();
    sink.gain.value = 0;
    input.connect(node).connect(sink).connect(c.destination);
    const track = stream.getAudioTracks()[0];
    const inLatency = Number(track?.getSettings?.().latency) || 0;
    const outLatency = (Number(c.outputLatency) || 0) + (Number(c.baseLatency) || 0);
    rec = { node, input, sink, chunks, stream, workletReady: true, offset: inLatency + outLatency, from };
    return t0;
  }

  async function stopRecording() {
    const r = rec;
    stop();
    if (!r) return null;
    try { r.input.disconnect(); r.node.disconnect(); r.sink.disconnect(); } catch { /* gone */ }
    r.stream.getTracks().forEach((t) => t.stop());
    rec = { workletReady: r.workletReady };
    const c = audio();
    const total = r.chunks.reduce((n, ch) => n + ch[0].length, 0);
    if (!total) return null;
    // Drop the samples the device's own delay put in front of the performance.
    const drop = Math.min(total - 1, Math.round(r.offset * c.sampleRate));
    const n = total - drop;
    const chans = Math.max(...r.chunks.map((ch) => ch.length));
    const buf = c.createBuffer(Math.min(2, chans), n, c.sampleRate);
    for (let ci = 0; ci < buf.numberOfChannels; ci++) {
      const out = buf.getChannelData(ci);
      let w = -drop;
      for (const ch of r.chunks) {
        const d = ch[ci] || ch[0];
        for (let i = 0; i < d.length; i++, w++) if (w >= 0) out[w] = d[i];
      }
    }
    let peak = 0;
    const d0 = buf.getChannelData(0);
    for (let i = 0; i < d0.length; i += 8) peak = Math.max(peak, Math.abs(d0[i]));
    const id = srcId();
    buffers.set(id, buf);
    peaks.set(id, computePeaks(buf, peakCount(buf)));
    return { id, duration: buf.duration, channels: buf.numberOfChannels, rate: buf.sampleRate, offsetMs: Math.round(r.offset * 1000), from: r.from, silent: peak < 1e-4 };
  }

  /** Render the session offline from 0 to its end (+ a tail for reverb and delay). */
  async function bounce(session, { tail = 2, rate } = {}) {
    const sr = rate || audio().sampleRate || 48000;
    const len = lengthOf(session);
    if (len <= 0) throw new Error("There's nothing on the timeline to bounce.");
    const frames = Math.ceil((len + tail) * sr);
    const off = new OfflineAudioContext(2, frames, sr);
    buildGraph(off, session, buffers, { from: 0, t0: 0, live: false });
    return off.startRendering();
  }

  function toWav(buffer, bitDepth = 24) {
    const chans = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    return new Blob([encodeWav(chans, buffer.sampleRate, { bitDepth })], { type: "audio/wav" });
  }

  function destroy() {
    stopSources();
    if (rec?.stream) rec.stream.getTracks().forEach((t) => t.stop());
    if (ctx) ctx.close().catch(() => {});
    ctx = null;
  }

  return {
    decode, adopt, play, stop, position, setLive, meters, openMic, startRecording, stopRecording, bounce, toWav, destroy,
    buffer: (id) => buffers.get(id), peaks: (id) => peaks.get(id), isPlaying: () => !!playing, isRecording: () => !!rec?.node,
    sampleRate: () => ctx?.sampleRate || 48000,
  };
}
