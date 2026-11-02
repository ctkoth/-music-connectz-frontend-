// VideoZ's engine: draws a project onto a canvas — a still at any time while
// you scrub, playback with sound, and an EXPORT that records that playback into
// a file. Everything happens on the member's device; nothing is uploaded until
// they press Save.
//
// Preview and export are the SAME loop with the recorder on or off, so a member
// never approves one thing and gets another. The clock is the AudioContext's
// (it does not drift with the screen's frame rate) and every frame asks
// project.activeAt what to draw and play — the schedule lives there.
//
// Export runs at playback speed. A canvas recording captures what is drawn as
// it is drawn, which is the honest cost of doing this with no server: a
// three-minute video takes three minutes, and the tab has to stay on screen (a
// browser stops drawing a hidden tab). The screen says both before Export.
import { adjustPixels, cssFilter, fitRect, lookOf, placeRect, warmthTint, zoomAt } from "./look.js";
import { ASPECTS, FPS, activeAt, extFor, lengthOf, pickRecordType } from "./project.js";
import { mouthFor, voices } from "./lipsync.js";

export const canFilter = () =>
  typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;

export const canRecord = () =>
  typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement !== "undefined"
  && typeof HTMLCanvasElement.prototype.captureStream === "function";

export const recordType = () =>
  (typeof MediaRecorder === "undefined" ? "" : pickRecordType((t) => MediaRecorder.isTypeSupported(t)));

// Some browsers (Safari) stop decoding a video that is not in the document, so
// media sits in an invisible corner of it.
let stage = null;
function stageEl() {
  if (stage && document.body.contains(stage)) return stage;
  stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  Object.assign(stage.style, { position: "fixed", left: "0", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none", overflow: "hidden" });
  document.body.appendChild(stage);
  return stage;
}

const once = (el, ok, ms = 20000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => { done(); reject(new Error("The file took too long to open.")); }, ms);
  const yes = () => { done(); resolve(); };
  const no = () => { done(); reject(new Error("This browser couldn't open that file.")); };
  const done = () => { clearTimeout(t); el.removeEventListener(ok, yes); el.removeEventListener("error", no); };
  el.addEventListener(ok, yes);
  el.addEventListener("error", no);
});

/** Length and size of a file, read by opening it. */
export async function probeMedia(src, kind) {
  if (kind === "image") {
    const img = new Image();
    img.src = src;
    await img.decode().catch(() => { throw new Error("This browser couldn't open that photo."); });
    return { width: img.naturalWidth, height: img.naturalHeight, duration: 0 };
  }
  const v = document.createElement(kind === "audio" ? "audio" : "video");
  v.preload = "metadata";
  v.muted = true;
  v.src = src;
  await once(v, "loadedmetadata");
  let d = v.duration;
  // A recorded WebM can report Infinity until it is read to the end.
  if (!Number.isFinite(d)) {
    v.currentTime = 1e9;
    await once(v, "seeked").catch(() => {});
    d = v.duration;
  }
  const out = { width: v.videoWidth || 0, height: v.videoHeight || 0, duration: Number.isFinite(d) ? d : 0 };
  v.removeAttribute("src"); v.load();
  return out;
}

/** A file we host, fetched into this tab so a canvas may draw it and record it. */
export async function fetchAsLocal(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status === 404 || r.status === 410 ? "That file isn't on the server any more." : `Couldn't fetch it (${r.status}).`);
  const blob = await r.blob();
  return { src: URL.createObjectURL(blob), type: blob.type, size: blob.size };
}

function vignette(ctx, r, amount) {
  if (!amount) return;
  const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.35, r.x + r.w / 2, r.y + r.h / 2, Math.hypot(r.w, r.h) / 2);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${((amount / 100) * 0.85).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

function caption(ctx, W, H, c) {
  if (!c.text) return;
  const size = Math.round(Math.min(W, H) * (c.kind === "text" ? 0.09 : 0.07) * (c.kind === "text" ? c.scale / 100 : 1));
  ctx.font = `800 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Wrap to 90% of the frame so a long line never runs off the edge.
  const lines = [];
  let cur = "";
  for (const w of c.text.split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > W * 0.9 && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  const lh = size * 1.2, block = lh * lines.length;
  let y0 = c.textAt === "top" ? H * 0.08 + lh / 2 : c.textAt === "middle" ? H / 2 - block / 2 + lh / 2 : H * 0.92 - block + lh / 2;
  const dx = c.kind === "text" ? (c.x / 100) * W : 0;
  if (c.kind === "text") y0 += (c.y / 100) * H;
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = size * 0.4;
  ctx.fillStyle = c.color || "#fff";
  lines.forEach((l, i) => ctx.fillText(l, W / 2 + dx, y0 + i * lh));
  ctx.shadowBlur = 0;
}

/**
 * Move the mouth inside a photo already drawn at `r`. The box marks the closed
 * lips; the lower lip and jaw are redrawn lower by how open the mouth is, the
 * upper lip lifts a little, the gap between them is the inside of a mouth, and
 * the patch is feathered back into the untouched photo so there is no seam.
 */
const mouthCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
function drawMouth(lx, img, r, box, m, filter) {
  if (!mouthCanvas || m.open < 0.02) return;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (!(iw > 0 && ih > 0)) return;
  const k = r.w / iw;                                  // photo px -> frame px
  const bw = box.w * r.w, bh = box.h * r.h;
  // The patch: the lips, some cheek either side, and the chin below.
  const R = { x: r.x + (box.x - box.w * 0.35) * r.w, y: r.y + (box.y - box.h * 0.6) * r.h, w: bw * 1.7, h: bh * 3.4 };
  const src = { x: (R.x - r.x) / k, y: (R.y - r.y) / k, w: R.w / k, h: R.h / k };
  const W = Math.max(2, Math.ceil(R.w)), H = Math.max(2, Math.ceil(R.h));
  mouthCanvas.width = W; mouthCanvas.height = H;
  const mx = mouthCanvas.getContext("2d");
  const mid = (r.y + (box.y + box.h / 2) * r.h) - R.y;  // where the lips meet, in the patch
  // A jaw opens in proportion to the mouth's WIDTH (about a third of it at most),
  // which stays right however loosely the box is drawn around the lips.
  const drop = m.open * Math.min(bw * 0.3, bh * 2.5);
  const lift = drop * 0.12;
  const piece = (sy0, sy1, dy0, dy1) => {
    const a = src.y + sy0 / k, b = src.y + sy1 / k;
    if (b - a <= 0 || dy1 - dy0 <= 0) return;
    mx.drawImage(img, src.x, a, src.w, b - a, 0, dy0, W, dy1 - dy0);
  };
  piece(0, H, 0, H);                                     // the face as it is
  const cx = W / 2, rx = (bw / 2) * 0.72 * (1 + 0.14 * m.wide);
  const g = mx.createRadialGradient(cx, mid + drop / 2, 0, cx, mid + drop / 2, Math.max(rx, 1));
  g.addColorStop(0, "#120406"); g.addColorStop(1, "#3a1216");
  mx.fillStyle = g;
  mx.beginPath();
  mx.ellipse(cx, mid + drop / 2 - lift / 2, rx, Math.max(0.5, (drop + lift) / 2 + 1), 0, 0, Math.PI * 2);
  mx.fill();
  piece(0, mid, 0, mid - lift);                          // upper lip, lifted
  piece(mid, H, mid + drop, H);                          // lower lip and jaw, dropped
  // Feather: keep the middle, fade to nothing at the patch's edge.
  mx.globalCompositeOperation = "destination-in";
  const f = mx.createRadialGradient(cx, mid, Math.min(W, H) * 0.2, cx, mid, Math.max(W, H) * 0.55);
  f.addColorStop(0, "rgba(0,0,0,1)"); f.addColorStop(1, "rgba(0,0,0,0)");
  mx.save(); mx.translate(cx, mid); mx.scale(1, H / W); mx.translate(-cx, -mid);
  mx.fillStyle = f; mx.fillRect(-W, -H * 2, W * 3, H * 5);
  mx.restore();
  mx.globalCompositeOperation = "source-over";
  lx.save();
  lx.beginPath(); lx.rect(r.x, r.y, r.w, r.h); lx.clip();
  if (filter) lx.filter = filter;
  lx.drawImage(mouthCanvas, R.x, R.y, R.w, R.h);
  lx.restore();
}

/**
 * One engine per editor. `setProject` keeps a media element per clip (a clip,
 * not a file: the same file used twice can play twice at once).
 */
export function createEngine(canvas) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  const monitor = ac.createGain();
  monitor.connect(ac.destination);
  let dest = ac.createMediaStreamDestination();
  const items = new Map();          // clip id -> { src, el, gain, ready }
  const pool = [];
  const filterOK = canFilter();
  let project = null;
  let W = 1280, H = 720;
  let playing = null;               // { stop(keep) }
  let lipAllowed = false;           // lip-sync is StatZ's (or the sample's); the screen says so

  function item(c) {
    let it = items.get(c.id);
    if (it && it.src === c.src) return it;
    if (it) drop(c.id);
    if (c.kind === "text" || !c.src) { it = { src: c.src, el: null, ready: Promise.resolve() }; items.set(c.id, it); return it; }
    if (c.kind === "image") {
      const img = new Image();
      img.src = c.src;
      it = { src: c.src, el: img, ready: img.decode().catch(() => {}) };
    } else {
      const el = document.createElement(c.kind === "audio" ? "audio" : "video");
      el.playsInline = true;
      el.preload = "auto";
      el.src = c.src;
      stageEl().appendChild(el);
      const gain = ac.createGain();
      gain.gain.value = 0;
      ac.createMediaElementSource(el).connect(gain);
      gain.connect(monitor);
      gain.connect(dest);
      it = { src: c.src, el, gain, ready: once(el, "loadeddata").catch(() => {}) };
    }
    items.set(c.id, it);
    return it;
  }
  function drop(id) {
    const it = items.get(id);
    if (!it) return;
    if (it.el instanceof HTMLMediaElement) { it.el.pause(); it.el.removeAttribute("src"); it.el.load(); it.el.remove(); }
    try { it.gain?.disconnect(); } catch { /* already gone */ }
    items.delete(id);
  }

  function setProject(p) {
    project = p;
    ({ w: W, h: H } = ASPECTS[p.aspect] || ASPECTS["16:9"]);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const keep = new Set(p.clips.map((c) => c.id));
    [...items.keys()].forEach((id) => { if (!keep.has(id)) drop(id); });
    p.clips.forEach(item);
  }

  function layerCanvas(i) {
    while (pool.length <= i) pool.push(document.createElement("canvas"));
    const lc = pool[i];
    if (lc.width !== W || lc.height !== H) { lc.width = W; lc.height = H; }
    return lc;
  }

  function draw(state) {
    const ctx = canvas.getContext("2d");
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    state.video.forEach((L, i) => {
      const c = L.clip;
      const lc = layerCanvas(i);
      const lx = lc.getContext("2d", { willReadFrequently: !filterOK });
      lx.clearRect(0, 0, W, H);
      if (c.kind !== "text") {
        const el = items.get(c.id)?.el;
        if (!el) return;
        const iw = el.videoWidth || el.naturalWidth, ih = el.videoHeight || el.naturalHeight;
        const r = placeRect(fitRect(iw, ih, W, H, project.fit, zoomAt(c.motion, L.into, c.seconds)), c, W, H);
        const look = lookOf(c);
        if (filterOK) lx.filter = cssFilter(look);
        try { lx.drawImage(el, r.x, r.y, r.w, r.h); } catch { /* a frame not decoded yet draws as nothing */ }
        lx.filter = "none";
        if (lipAllowed && c.kind === "image" && c.lip?.on) {
          drawMouth(lx, el, r, c.lip.box, mouthFor(c.lip.source, state.audio, voices), filterOK ? cssFilter(look) : "");
        }
        if (!filterOK) {
          const img = lx.getImageData(0, 0, W, H);
          adjustPixels(img.data, look);
          lx.putImageData(img, 0, 0);
        }
        // Warmth and vignette stay inside the picture, so a picture-in-picture
        // does not tint the clip beneath it.
        lx.save();
        lx.beginPath(); lx.rect(r.x, r.y, r.w, r.h); lx.clip();
        const tint = warmthTint(look.warmth);
        if (tint) { lx.globalCompositeOperation = "soft-light"; lx.fillStyle = tint; lx.fillRect(r.x, r.y, r.w, r.h); lx.globalCompositeOperation = "source-over"; lx.globalAlpha = 0.35; lx.fillRect(r.x, r.y, r.w, r.h); lx.globalAlpha = 1; }
        vignette(lx, r, look.vignette);
        lx.restore();
      }
      caption(lx, W, H, c);
      ctx.globalAlpha = L.alpha * state.master;
      ctx.drawImage(lc, 0, 0);
      ctx.globalAlpha = 1;
    });
  }

  const seekTo = (el, t) => new Promise((resolve) => {
    if (Math.abs(el.currentTime - t) < 1 / 60) { resolve(); return; }
    const done = () => { clearTimeout(timer); el.removeEventListener("seeked", done); resolve(); };
    const timer = setTimeout(done, 1500);
    el.addEventListener("seeked", done);
    el.currentTime = t;
  });

  /** The frame at `t`, for scrubbing and for the paused playhead. */
  let drawSeq = 0;
  async function drawAt(t) {
    if (!project || playing) return;
    // A scrub fires many of these; a slow seek must never paint over a newer frame.
    const mine = ++drawSeq;
    const st = activeAt(project, t);
    items.forEach((it) => { if (it.el instanceof HTMLMediaElement) it.el.pause(); });
    await Promise.all(st.video.map(async (L) => {
      const it = items.get(L.clip.id);
      if (!it) return;
      await it.ready;
      if (it.el instanceof HTMLVideoElement) await seekTo(it.el, Math.min(L.media, (it.el.duration || L.media) - 0.01));
    }));
    if (!playing && mine === drawSeq) draw(st);
  }

  /**
   * Play from `from` to the end (or until stopped). With `record`, resolve to
   * { blob, type, ext, hiddenSeconds }; otherwise to null. `onTick(t, total)`
   * moves the playhead.
   */
  async function play({ from = 0, record = false, onTick } = {}) {
    if (!project || playing) return null;
    await Promise.all([...items.values()].map((it) => it.ready));
    await ac.resume();
    const total = lengthOf(project);
    let rec = null;
    const chunks = [];
    const type = record ? recordType() : "";
    if (record) {
      // A fresh destination each export, so the file carries exactly this run's sound.
      dest = ac.createMediaStreamDestination();
      items.forEach((it) => it.gain?.connect(dest));
      const stream = canvas.captureStream(FPS);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 160_000 });
      rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
      rec.start(1000);
    }
    const t0 = ac.currentTime - from;
    let hiddenSeconds = 0;
    let lastWall = performance.now();
    const running = new Set();

    return new Promise((resolve, reject) => {
      let stopped = false;
      const finish = (keep) => {
        if (stopped) return;
        stopped = true;
        playing = null;
        items.forEach((it) => { if (it.el instanceof HTMLMediaElement) it.el.pause(); if (it.gain) it.gain.gain.value = 0; });
        if (!rec) { resolve(null); return; }
        rec.onstop = () => {
          if (!keep) { resolve(null); return; }
          const blob = new Blob(chunks, { type: (type || chunks[0]?.type || "video/webm").split(";")[0] });
          resolve({ blob, type: blob.type, ext: extFor(blob.type), hiddenSeconds: Math.round(hiddenSeconds) });
        };
        try { rec.requestData(); } catch { /* already flushing */ }
        rec.stop();
      };
      playing = { stop: finish };

      const frame = () => {
        if (stopped) return;
        try {
          const now = performance.now();
          if (document.hidden) hiddenSeconds += (now - lastWall) / 1000;
          lastWall = now;
          const t = ac.currentTime - t0;
          if (t >= total) { onTick?.(total, total); finish(true); return; }
          const st = activeAt(project, t);
          const live = new Map();
          st.audio.forEach((a) => live.set(a.clip.id, a));
          st.video.forEach((L) => { if (!live.has(L.clip.id)) live.set(L.clip.id, L); });
          items.forEach((it, id) => {
            if (!(it.el instanceof HTMLMediaElement)) return;
            const a = live.get(id);
            if (!a) {
              if (running.has(id)) { it.el.pause(); running.delete(id); }
              if (it.gain) it.gain.gain.value = 0;
              return;
            }
            const c = a.clip;
            // Started late, or drifted: put the file back where the timeline says.
            if (!running.has(id) || Math.abs(it.el.currentTime - a.media) > 0.25) it.el.currentTime = a.media;
            if (!running.has(id)) { it.el.playbackRate = c.speed; it.el.play().catch(() => {}); running.add(id); }
            if (it.gain) it.gain.gain.value = (a.gain ?? 0) * st.master;
          });
          draw(st);
          onTick?.(t, total);
        } catch (e) { finish(false); reject(e); return; }
        if (document.hidden) setTimeout(frame, 1000 / FPS); else requestAnimationFrame(frame);
      };
      frame();
    });
  }

  const stop = (keep = false) => playing?.stop(keep);
  const isPlaying = () => !!playing;
  function destroy() {
    stop(false);
    [...items.keys()].forEach(drop);
    ac.close().catch(() => {});
  }
  return {
    setProject, drawAt, play, stop, isPlaying, destroy,
    setMonitor: (on) => { monitor.gain.value = on ? 1 : 0; },
    setLipAllowed: (on) => { lipAllowed = !!on; },
  };
}
