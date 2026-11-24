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
import { audible, beatSeconds, countInPlan, lengthOf, playlistOf } from "./session.js";
import { buildInsert, dbToGain } from "./plugins.js";
import { encodeWav } from "../mastering/wav.js";
import { laneOf, reads, schedule } from "./automation.js";
import { limiterWorkletSource } from "./limiterDsp.js";
import { cleanLatencyMode } from "./audioIO.js";

const CAPTURE_WORKLET = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0];
    if (ch && ch.length) this.port.postMessage({ frame: currentFrame, data: ch.map((c) => c.slice(0)) });
    return true;
  }
}
registerProcessor("mcz-capture", Capture);`;

/** Add the DSP worklets a session needs to this context, once, BEFORE its graph is built (a worklet can only be
 *  made after its module is in). Only when the session has an effect that uses one; a failure leaves the plain
 *  fallback chain in place, never a silent session. Works on a live context and on an OfflineAudioContext, so
 *  the bounce is the same DSP as the speakers. */
export async function loadDsp(ctx, session) {
  const uses = (session.tracks || []).some((t) => (t.inserts || []).some((i) => i.type === "limiter" && i.on));
  if (!uses || ctx.__mczLimiter || !ctx.audioWorklet || typeof AudioWorkletNode === "undefined") return;
  try {
    const url = URL.createObjectURL(new Blob([limiterWorkletSource()], { type: "text/javascript" }));
    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    ctx.__mczLimiter = true;
  } catch { /* fall back to the node chain */ }
}

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
  const disposers = [];     // effects that need telling they are finished (the worklet ones keep running until they are)
  for (const t of live ? session.tracks : session.tracks.filter((x) => heard.has(x.id))) {
    const sum = ctx.createGain();
    sum.gain.value = t.invert ? -1 : 1;   // polarity: the same sound upside down, set from the timing check
    let tail = sum;
    for (const ins of t.inserts || []) {
      const node = buildInsert(ctx, ins, { bpm: session.bpm });
      if (node.dispose) disposers.push(node.dispose);
      tail.connect(node.input);
      tail = node.output;
    }
    const fader = ctx.createGain();
    const pan = ctx.createStereoPanner();
    // A lane that is on and has points IS the fader / pan knob; otherwise the static value.
    if (reads(t, "volume")) schedule(fader.gain, "volume", laneOf(t, "volume"), from, t0, heard.has(t.id) ? 1 : 0);
    else fader.gain.value = heard.has(t.id) ? dbToGain(t.gain) : 0;
    if (reads(t, "pan")) schedule(pan.pan, "pan", laneOf(t, "pan"), from, t0);
    else pan.pan.value = t.pan;
    tail.connect(fader).connect(pan);
    let meter = null;
    if (live) {
      meter = ctx.createAnalyser();
      meter.fftSize = 1024;
      pan.connect(meter);
    }
    pan.connect(master);
    tracks[t.id] = { fader, pan, meter, sum };
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
  return { master, tracks, sources, disposers };
}

/** Stop whatever a param was scheduled to do and keep it where it is now (no jump when a lane is switched off). */
function hold(param, now) {
  if (param.cancelAndHoldAtTime) { param.cancelAndHoldAtTime(now); return; }
  const v = param.value;
  param.cancelScheduledValues(0);
  param.setValueAtTime(v, now);
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
  let clickTimers = [];
  // Seamless looping: while a loop is on, the NEXT pass is built and scheduled ahead on the audio clock, so the wrap is sample-
  // accurate and there is no gap. { session, loop, click, endT: when the current pass ends (context time), queue: [passes], timer }
  let loopCtl = null;
  let rec = null;
  let masterMeter = null;
  let recBoost = 0;          // dB added to the master only while a take runs (see startRecording)
  const scratch = new Float32Array(1024);

  const readMode = () => { try { return cleanLatencyMode(localStorage.getItem("mcz_daw_latency")); } catch { return "interactive"; } };
  const audio = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: readMode() });
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

  function disposeGraph(g) {
    if (!g) return;
    g.sources.forEach((s) => { try { s.stop(); } catch { /* already ended */ } });
    try { g.master.disconnect(); } catch { /* gone */ }
    g.disposers?.forEach((d) => d());
  }
  function stopSources() {
    clickTimers.forEach((t) => clearInterval(t)); clickTimers = [];
    if (loopCtl) { clearInterval(loopCtl.timer); loopCtl.queue.forEach((q) => disposeGraph(q.graph)); loopCtl = null; }
    if (graph) { disposeGraph(graph); graph = null; }
  }

  /** A scheduled pass has begun sounding: it becomes the current one, and the pass before it is freed a moment later. */
  function promote(now) {
    const L = loopCtl;
    if (!L) return;
    while (L.queue.length && now >= L.queue[0].t0) {
      const q = L.queue.shift();
      const old = graph;
      graph = q.graph; playing = { from: q.from, t0: q.t0 }; L.endT = q.endT;
      if (masterMeter) graph.master.connect(masterMeter);                // the master meter (and the clip warning) follow the pass that is sounding
      setTimeout(() => disposeGraph(old), 1500);          // its effects' tails ring on over the new pass, then it is freed
    }
  }
  function loopTick() {
    const L = loopCtl;
    if (!L || !playing) return;
    const now = ctx.currentTime;
    promote(now);
    while (L.loop?.on && L.queue.length < 8 && (L.queue.at(-1)?.endT ?? L.endT) < now + 0.6) {
      const lp = L.loop;
      const prevEnd = L.queue.at(-1)?.endT ?? L.endT;
      const prev = L.queue.at(-1)?.graph ?? graph;
      const g = buildGraph(ctx, L.session, buffers, { from: lp.start, t0: prevEnd, live: true });
      prev.sources.forEach((s) => { try { s.stop(prevEnd); } catch { /* already ended */ } });     // the old pass ends exactly where the new one begins
      L.queue.push({ from: lp.start, t0: prevEnd, endT: prevEnd + (lp.end - lp.start), graph: g });
      if (L.click) startClick(L.session, lp.start, prevEnd, lp.end);
    }
  }

  function startClick(session, from, t0, until = Infinity) {
    const c = audio();
    const beat = beatSeconds(session);
    let next = Math.ceil(from / beat - 1e-6);
    let timer = null;
    const schedule = () => {
      const horizon = c.currentTime + 0.3;
      for (;;) {
        if (next * beat >= until - 1e-6) { clearInterval(timer); return; }   // a loop's click stops at its end; the next pass has its own
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
    timer = setInterval(schedule, 100);
    clickTimers.push(timer);
  }

  /** Click `bars` bars (accent on each downbeat), resolving when the last beat's bar is over. Nothing is recorded meanwhile. */
  // resume() can sit unanswered for ever when the browser's audio output is held (another app, a device that is
  // gone). A take must say so instead of waiting on it.
  async function ensureRunning(c) {
    if (c.state === "running") return;
    await Promise.race([c.resume().catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
    if (c.state !== "running") throw new Error("The browser's audio output didn't start (it says \"" + c.state + "\"). Click anywhere on the page and press Record again; if it keeps happening, another app may be holding your speakers or headphones — check the 🎧 output menu.");
  }

  async function countIn(session, bars) {
    const plan = countInPlan(session, bars);
    if (!plan.beats.length) return;
    const c = audio();
    await ensureRunning(c);
    const t0 = c.currentTime + 0.1;
    for (const b of plan.beats) {
      const o = c.createOscillator(); const g = c.createGain();
      o.frequency.value = b.accent ? 1600 : 1000;
      g.gain.setValueAtTime(0.4, t0 + b.at);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + b.at + 0.05);
      o.connect(g).connect(c.destination);
      o.start(t0 + b.at); o.stop(t0 + b.at + 0.06);
    }
    await new Promise((done) => setTimeout(done, (0.1 + plan.seconds) * 1000));
  }

  async function play(session, from = 0, { click = false } = {}) {
    const c = audio();
    if (c.state !== "running") await c.resume();
    stopSources();
    const t0 = c.currentTime + 0.06;
    await loadDsp(c, session);
    graph = buildGraph(c, session, buffers, { from, t0, live: true });
    masterMeter = c.createAnalyser();
    masterMeter.fftSize = 1024;
    graph.master.connect(masterMeter);
    playing = { from, t0 };
    const lp = session.loop;
    const looping = !!(lp && lp.on && from < lp.end);
    if (looping) loopCtl = { session, loop: lp, click: !!click, endT: t0 + (lp.end - from), queue: [], timer: setInterval(loopTick, 40) };
    if (click) startClick(session, from, t0, looping ? lp.end : Infinity);
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
    promote(ctx.currentTime);
    return playing.from + Math.max(0, ctx.currentTime - playing.t0);
  }

  /** Move faders and pans of a playing session without restarting it. */
  function setLive(session) {
    if (loopCtl) { loopCtl.session = session; loopCtl.loop = session.loop; }       // a loop edge dragged while it plays is the next pass's
    if (!graph) return;
    const heard = new Set(audible(session).map((t) => t.id));
    graph.master.gain.setTargetAtTime(dbToGain(session.master + recBoost), ctx.currentTime, 0.01);
    for (const t of session.tracks) {
      const n = graph.tracks[t.id];
      if (!n) continue;
      // An automated param is re-laid from where playback is now, so a point drawn or a lane
      // switched off while it plays is heard at once; the rest glide to their static value.
      const now = ctx.currentTime, pos = position() ?? 0;
      if (reads(t, "volume")) schedule(n.fader.gain, "volume", laneOf(t, "volume"), pos, now, heard.has(t.id) ? 1 : 0);
      else { hold(n.fader.gain, now); n.fader.gain.setTargetAtTime(heard.has(t.id) ? dbToGain(t.gain) : 0, now, 0.01); }
      if (n.sum) n.sum.gain.setValueAtTime(t.invert ? -1 : 1, now);
      if (reads(t, "pan")) schedule(n.pan.pan, "pan", laneOf(t, "pan"), pos, now);
      else { hold(n.pan.pan, now); n.pan.pan.setTargetAtTime(t.pan, now, 0.01); }
    }
  }

  // The loudest single sample the master has played since Play, in dBFS. Above 0 the output clips, and a whole
  // song clipping sounds like static, not like music — the member hears noise and blames the DAW.
  let peakHold = -Infinity;
  function peak() {
    if (!masterMeter) return peakHold;
    masterMeter.getFloatTimeDomainData(scratch);
    let p = 0;
    for (let i = 0; i < scratch.length; i++) { const a = Math.abs(scratch[i]); if (a > p) p = a; }
    const db = p > 0 ? 20 * Math.log10(p) : -Infinity;
    if (db > peakHold) peakHold = db;
    return peakHold;
  }
  const resetPeak = () => { peakHold = -Infinity; };

  function meters() {
    const out = {};
    if (!graph) return out;
    for (const [id, n] of Object.entries(graph.tracks)) if (n.meter) out[id] = levelDb(n.meter, scratch);
    if (masterMeter) out.master = levelDb(masterMeter, scratch);
    return out;
  }

  /** Arm the mic. Resolves once the browser has said yes. Errors carry the browser's own `name`. */
  async function openMic(deviceId = "") {
    if (!navigator.mediaDevices?.getUserMedia) {
      const e = new Error("This page can't reach a microphone here — it needs a secure (https) address.");
      e.name = "NoMediaDevices";
      throw e;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 },
               ...(deviceId ? { deviceId: { exact: deviceId } } : {}) },
    });
    return stream;
  }

  /**
   * Record from `from` on the timeline while the session plays (overdub) — onto one track or several
   * at once. `inputs` is [{ key, stream, channel }]: one entry per armed track, `channel` "both" | "left"
   * | "right" of that stream. Every part is captured on the same AudioContext clock, so the takes line up
   * with each other and with the playback. `stopRecording()` resolves with one take per part.
   */
  async function startRecording(session, from, { click = false, stream, inputs, punch = null, cycle = null, boostDb = 0 }) {
    const c = audio();
    await ensureRunning(c);
    const list = inputs || [{ key: "", stream, channel: "both" }];
    // A take never loops the transport, except a cycle: the loop plays seamlessly and the capture is cut at its pass boundaries on stop.
    const t0 = cycle ? await play({ ...session, loop: { start: cycle.start, end: cycle.end, on: true } }, cycle.start, { click }) : await play({ ...session, loop: null }, from, { click });
    // Windows can turn everything else down by up to 80% the moment a mic opens, and no web page can switch that off.
    // The member may lift the beat for the length of the take to make up for it; a limiter after it means a hot beat
    // is held under 0 dB instead of clipping. Off (0) leaves the graph exactly as it was.
    recBoost = Math.max(0, Math.min(18, Number(boostDb) || 0));
    if (recBoost > 0 && graph) {
      graph.master.gain.setValueAtTime(dbToGain(session.master + recBoost), c.currentTime);
      try { graph.master.disconnect(c.destination); } catch { /* not connected there */ }
      const lim = c.createDynamicsCompressor();
      lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
      graph.master.connect(lim); lim.connect(c.destination);
      graph.__recLimiter = lim;
    }
    const startFrame = Math.round(t0 * c.sampleRate);
    const useWorklet = c.audioWorklet && typeof AudioWorkletNode !== "undefined";
    if (useWorklet && !rec?.workletReady) {
      const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "text/javascript" }));
      await c.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
    }
    // One source per stream, shared by the parts that read it (two channels of one interface).
    const sources = new Map();
    const parts = list.map((inp) => {
      if (!sources.has(inp.stream)) sources.set(inp.stream, c.createMediaStreamSource(inp.stream));
      const src = sources.get(inp.stream);
      const chunks = [];
      const take = (frame, data) => {
        const skip = Math.max(0, startFrame - frame);
        if (skip >= data[0].length) return;
        chunks.push(data.map((d) => (skip ? d.slice(skip) : d)));
      };
      let node;
      if (useWorklet) {
        node = new AudioWorkletNode(c, "mcz-capture", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2 });
        node.port.onmessage = (e) => take(e.data.frame, e.data.data);
      } else {
        node = c.createScriptProcessor(4096, 2, 2);
        node.onaudioprocess = (e) => {
          const frame = Math.round(e.playbackTime * c.sampleRate);
          take(frame, Array.from({ length: e.inputBuffer.numberOfChannels }, (_, i) => e.inputBuffer.getChannelData(i).slice(0)));
        };
      }
      // One channel of a stereo input becomes a mono part: split it out and send it alone.
      const extra = [];
      if (inp.channel === "left" || inp.channel === "right") {
        const split = c.createChannelSplitter(2), mono = c.createGain();
        mono.channelCount = 1; mono.channelCountMode = "explicit";
        src.connect(split); split.connect(mono, inp.channel === "left" ? 0 : 1); mono.connect(node);
        extra.push(split, mono);
      } else src.connect(node);
      // A silent sink keeps the node pulled without sending the mic to the speakers — monitoring the
      // mic through the page would feed it straight back into itself on a phone's speaker.
      const sink = c.createGain();
      sink.gain.value = 0;
      node.connect(sink).connect(c.destination);
      const track = inp.stream.getAudioTracks()[0];
      const inLatency = Number(track?.getSettings?.().latency) || 0;
      return { key: inp.key, node, sink, extra, chunks, inLatency };
    });
    const outLatency = (Number(c.outputLatency) || 0) + (Number(c.baseLatency) || 0);
    rec = { parts, sources: [...sources.values()], streams: [...sources.keys()], workletReady: useWorklet || rec?.workletReady, outLatency, from: cycle ? cycle.start : from, punch, cycle };
    return t0;
  }

  function assemble(c, chunks, offset, from, punch = null, keep = true) {
    const total = chunks.reduce((n, ch) => n + ch[0].length, 0);
    if (!total) return null;
    // Drop the samples the device's own delay put in front of the performance.
    const drop = Math.min(total - 1, Math.round(offset * c.sampleRate));
    let n = total - drop;
    // Punch: keep only [in, out]. The take then starts at the punch-in, not at the pre-roll.
    let cutFrom = 0;
    if (punch) {
      cutFrom = Math.max(0, Math.round((punch.in - from) * c.sampleRate));
      n = Math.min(n, Math.round((punch.out - from) * c.sampleRate)) - cutFrom;
      if (n < 1) return null;                                  // nothing was captured inside the window
    }
    const chans = Math.max(...chunks.map((ch) => ch.length));
    const buf = c.createBuffer(Math.min(2, chans), n, c.sampleRate);
    for (let ci = 0; ci < buf.numberOfChannels; ci++) {
      const out = buf.getChannelData(ci);
      let w = -drop - cutFrom;
      for (const ch of chunks) {
        const d = ch[ci] || ch[0];
        for (let i = 0; i < d.length; i++, w++) if (w >= 0 && w < n) out[w] = d[i];
      }
    }
    let peak = 0;
    const d0 = buf.getChannelData(0);
    for (let i = 0; i < d0.length; i += 8) peak = Math.max(peak, Math.abs(d0[i]));
    if (!keep) return { buf, from: punch ? punch.in : from, offset };         // the caller cuts it up and registers the pieces
    const id = srcId();
    buffers.set(id, buf);
    peaks.set(id, computePeaks(buf, peakCount(buf)));
    return { id, duration: buf.duration, channels: buf.numberOfChannels, rate: buf.sampleRate, offsetMs: Math.round(offset * 1000), from: punch ? punch.in : from, silent: peak < 1e-4 };
  }

  /** A cycle recording, one part: the capture cut at the loop's pass boundaries, each pass registered as its own take. */
  const MAX_PASSES = 32, MIN_PASS_SECONDS = 0.25;
  function cutPasses(c, p, r) {
    const whole = assemble(c, p.chunks, p.inLatency + r.outLatency, r.from, null, false);
    if (!whole) return [{ key: p.key, empty: true }];
    const rate = c.sampleRate, buf = whole.buf;
    const per = Math.max(1, Math.round((r.cycle.end - r.cycle.start) * rate));
    const out = [];
    for (let k = 0; k * per < buf.length && out.length < MAX_PASSES; k++) {
      const a = k * per, b = Math.min(buf.length, a + per);
      if ((b - a) / rate < MIN_PASS_SECONDS && k > 0) break;                  // a sliver left over when stop was pressed is not a take
      const piece = c.createBuffer(buf.numberOfChannels, b - a, rate);
      let peak = 0;
      for (let ci = 0; ci < buf.numberOfChannels; ci++) { const d = buf.getChannelData(ci).subarray(a, b); piece.copyToChannel(d, ci); if (ci === 0) for (let i = 0; i < d.length; i += 8) peak = Math.max(peak, Math.abs(d[i])); }
      const id = srcId();
      buffers.set(id, piece);
      peaks.set(id, computePeaks(piece, peakCount(piece)));
      out.push({ key: p.key, id, duration: piece.duration, channels: piece.numberOfChannels, rate, offsetMs: Math.round(whole.offset * 1000), from: r.cycle.start, silent: peak < 1e-4, pass: k + 1 });
    }
    const n = out.length;
    return out.length ? out.map((t) => ({ ...t, passes: n })) : [{ key: p.key, empty: true }];
  }

  /** Stop recording. One take per part, each `{ key, ...take }` (null where nothing was captured). */
  async function stopRecording() {
    const r = rec;
    recBoost = 0;
    stop();
    if (!r?.parts) return [];
    for (const p of r.parts) { try { p.node.disconnect(); p.sink.disconnect(); p.extra.forEach((x) => x.disconnect()); } catch { /* gone */ } }
    for (const s2 of r.sources) { try { s2.disconnect(); } catch { /* gone */ } }
    r.streams.forEach((st) => st.getTracks().forEach((t) => t.stop()));
    rec = { workletReady: r.workletReady };
    const c = audio();
    if (r.cycle) return r.parts.flatMap((p) => cutPasses(c, p, r));
    return r.parts.map((p) => {
      const t = assemble(c, p.chunks, p.inLatency + r.outLatency, r.from, r.punch);
      return t ? { key: p.key, ...t } : { key: p.key, empty: true };
    });
  }

  /** Render the session offline from 0 to its end (+ a tail for reverb and delay). */
  async function bounce(session, { tail = 2, rate } = {}) {
    const sr = rate || audio().sampleRate || 48000;
    const len = lengthOf(session);
    if (len <= 0) throw new Error("There's nothing on the timeline to bounce.");
    const frames = Math.ceil((len + tail) * sr);
    const off = new OfflineAudioContext(2, frames, sr);
    await loadDsp(off, session);
    buildGraph(off, session, buffers, { from: 0, t0: 0, live: false });
    return off.startRendering();
  }

  function toWav(buffer, bitDepth = 24) {
    const chans = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    return new Blob([encodeWav(chans, buffer.sampleRate, { bitDepth, dither: bitDepth === 16 })], { type: "audio/wav" });   // TPDF dither when it is 16-bit
  }

  function destroy() {
    stopSources();
    if (rec?.streams) rec.streams.forEach((st) => st.getTracks().forEach((t) => t.stop()));
    if (ctx) ctx.close().catch(() => {});
    ctx = null;
  }

  // ---- audio settings: an input meter, a monitor, and where the sound comes out ----
  let mon = null;
  /** A meter on a mic stream: `read()` fills one block of samples, `stop()` lets go. Nothing is recorded or heard. */
  function inputMeter(stream) {
    const c = audio();
    // A context made without a fresh tap starts suspended and reads pure silence, which looked exactly like a dead mic.
    if (c.state !== "running") c.resume().catch(() => {});
    const src = c.createMediaStreamSource(stream);
    const an = c.createAnalyser(); an.fftSize = 2048;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    return { read: () => { an.getFloatTimeDomainData(buf); return buf; }, stop: () => { try { src.disconnect(); an.disconnect(); } catch { /* already gone */ } } };
  }
  /** Hear the input through the output. Off unless the member turns it on, because a mic next to speakers feeds back. */
  async function monitorOn(stream, level = 0.8) {
    const c = audio();
    if (c.state !== "running") await c.resume();
    monitorOff();
    const src = c.createMediaStreamSource(stream); const g = c.createGain(); g.gain.value = level;
    src.connect(g).connect(c.destination);
    mon = { src, g };
  }
  function monitorOff() { if (mon) { try { mon.src.disconnect(); mon.g.disconnect(); } catch { /* already gone */ } mon = null; } }
  /** Send everything this DAW plays to another output (Chrome and Edge can; the screen says so where a browser can't). */
  async function setOutput(id) {
    const c = audio();
    if (typeof c.setSinkId !== "function") return { ok: false };
    // Pause the engine around the switch: changing the device under a running stream is where the click or burst of static comes from.
    // Suspended, nothing is being written to either device while the route changes, and it resumes on the new one at once.
    const was = c.state === "running";
    if (was) await c.suspend();
    try { await c.setSinkId(id || ""); } finally { if (was) await c.resume(); }
    return { ok: true };
  }
  /** Choose the engine's buffer size ("interactive" | "balanced" | "playback"). It only takes effect when the engine starts, so the engine is
   *  closed and made again on next use; the caller makes sure nothing is playing or recording. */
  async function setLatencyMode(mode) {
    const m = cleanLatencyMode(mode);
    try { localStorage.setItem("mcz_daw_latency", m); } catch { /* storage blocked */ }
    monitorOff();
    if (ctx) { const old = ctx; ctx = null; masterMeter = null; graph = null; try { await old.close(); } catch { /* already closed */ } }
    return m;
  }
  const latencyMode = readMode;
  /** What the audio engine is doing, for the screen: running or blocked, its rate, and the browser's own output delay. */
  function audioInfo() {
    const c = ctx;
    return c ? { state: c.state, rate: c.sampleRate, latencyMs: Math.round(((c.baseLatency || 0) + (c.outputLatency || 0)) * 1000) } : { state: "not started", rate: 0, latencyMs: 0 };
  }
  /** A short tone straight out of the output, so "is anything coming out of this device?" has an answer that is not the mix. */
  async function testTone() {
    const c = audio();
    if (c.state !== "running") await c.resume();
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = "sine"; o.frequency.value = 440;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 1);
    return audioInfo();
  }
  const outputCanChange = () => typeof (typeof AudioContext !== "undefined" ? AudioContext.prototype.setSinkId : undefined) === "function";
  return {
    inputMeter, monitorOn, monitorOff, setOutput, setLatencyMode, latencyMode, outputCanChange, audioInfo, testTone, context: () => audio(),
    decode, adopt, countIn, play, stop, position, setLive, meters, peak, resetPeak, openMic, startRecording, stopRecording, bounce, toWav, destroy,
    buffer: (id) => buffers.get(id), peaks: (id) => peaks.get(id), isPlaying: () => !!playing, isRecording: () => !!rec?.parts,
    sampleRate: () => ctx?.sampleRate || 48000,
  };
}
