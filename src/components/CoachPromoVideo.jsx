// Coach Review Promo Video — the member's take with the coach's read over it, made in
// the browser. Free: nothing is uploaded, nothing calls a model, nothing is charged.
// What is drawn is the read the member was shown (coachPromo.js decides the cards).
//
// 9:16 at 720x1280, the take (video frames, or bars from its audio) under a dark
// gradient, the score and a card at a time on top. The audio is the take's own, routed
// through WebAudio so it is in the recording. Saved as MP4 where the browser can record
// one (TikTok's own upload takes it), WebM otherwise, and the screen says which.
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Download, Loader2 } from "lucide-react";
import { DURATIONS, bestVideoMime, cardAt, schedule, scoreText, wrapLines } from "../coachPromo.js";

const W = 720, H = 1280;
const TONE = { verdict: "#22d3ee", good: "#6ee7b7", fix: "#fbbf24" };

function draw(ctx, { media, isVideo, analyser, bins, t, review, cards, label }) {
  ctx.fillStyle = "#06070d";
  ctx.fillRect(0, 0, W, H);
  if (isVideo && media.videoWidth) {
    const s = Math.max(W / media.videoWidth, H / media.videoHeight);
    const w = media.videoWidth * s, h = media.videoHeight * s;
    ctx.drawImage(media, (W - w) / 2, (H - h) / 2, w, h);
  } else if (analyser) {
    analyser.getByteFrequencyData(bins);
    const n = 48, bw = W / n;
    for (let i = 0; i < n; i += 1) {
      const v = bins[Math.floor((i / n) * bins.length * 0.7)] / 255;
      const h = 60 + v * 560;
      const g = ctx.createLinearGradient(0, H * 0.42 - h / 2, 0, H * 0.42 + h / 2);
      g.addColorStop(0, "#ec4899"); g.addColorStop(1, "#22d3ee");
      ctx.fillStyle = g;
      ctx.fillRect(i * bw + 3, H * 0.42 - h / 2, bw - 6, h);
    }
  }
  // The gradient the feedback sits on: clear at the top, near-black at the bottom.
  const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
  g.addColorStop(0, "rgba(6,7,13,0)"); g.addColorStop(0.45, "rgba(6,7,13,0.72)"); g.addColorStop(1, "rgba(6,7,13,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.35, W, H * 0.65);

  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 30px Poppins, system-ui, sans-serif";
  ctx.fillText("COACH REVIEW", 48, 64);
  ctx.font = "800 120px Poppins, system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${scoreText(review)}/10`, 44, 104);
  ctx.font = "500 32px Poppins, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(label, 48, 240);

  const c = cardAt(cards, t);
  if (c) {
    let y = H * 0.6;
    ctx.fillStyle = TONE[c.tone];
    ctx.font = "700 34px Poppins, system-ui, sans-serif";
    ctx.fillText(c.title.toUpperCase(), 48, y);
    y += 58;
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 46px Poppins, system-ui, sans-serif";
    for (const line of wrapLines(c.text, 26, 6)) { ctx.fillText(line, 48, y); y += 60; }
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 26px Poppins, system-ui, sans-serif";
  ctx.fillText(review.human ? "Human-made · scored by the Music ConnectZ coach" : "Scored by the Music ConnectZ coach", 48, H - 72);
  // Progress line, so the viewer sees the card change coming.
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(0, H - 8, W, 8);
  ctx.fillStyle = TONE[c?.tone || "verdict"];
  ctx.fillRect(0, H - 8, W * Math.min(1, t / (cards.at(-1)?.end || 1)), 8);
}

export default function CoachPromoVideo({ review, onClose }) {
  const canvasRef = useRef(null);
  const mediaRef = useRef(null);
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState("");
  const isVideo = review.media_kind === "video";
  const mime = typeof MediaRecorder !== "undefined" ? bestVideoMime((m) => MediaRecorder.isTypeSupported(m)) : "";
  const label = review.label || "Coach";
  const cards = schedule(review, seconds);

  useEffect(() => () => { if (out?.url) URL.revokeObjectURL(out.url); }, [out]);
  // A still preview of the first card, before anything is made.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, { media: mediaRef.current, isVideo: false, analyser: null, t: 0, review, cards, label });
  }, [seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  async function make() {
    setErr(""); setOut(null);
    const media = mediaRef.current, canvas = canvasRef.current;
    if (!media || !canvas || !mime || !canvas.captureStream) {
      return setErr("This browser can't record a video from the page. Chrome, Edge or Safari can.");
    }
    setBusy(true);
    let ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = ac.createMediaElementSource(media);
      const analyser = ac.createAnalyser(); analyser.fftSize = 256;
      const dest = ac.createMediaStreamDestination();
      src.connect(analyser); analyser.connect(dest); analyser.connect(ac.destination);
      const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
      const done = new Promise((res) => { rec.onstop = res; });
      const ctx = canvas.getContext("2d");
      const bins = new Uint8Array(analyser.frequencyBinCount);
      media.currentTime = 0;
      await media.play();
      rec.start(500);
      const t0 = performance.now();
      await new Promise((res) => {
        const tick = () => {
          const t = (performance.now() - t0) / 1000;
          draw(ctx, { media, isVideo, analyser, bins, t, review, cards, label });
          if (t >= seconds || media.ended) return res();
          requestAnimationFrame(tick);
        };
        tick();
      });
      media.pause();
      rec.stop();
      await done;
      const blob = new Blob(chunks, { type: mime.split(";")[0] });
      if (!blob.size) throw new Error("empty");
      setOut({ url: URL.createObjectURL(blob), ext: mime.startsWith("video/mp4") ? "mp4" : "webm", size: blob.size });
    } catch (e) {
      setErr(e?.message === "empty" ? "The recording came out empty. Try again with the tab in front." :
        "Couldn't make the video. Keep this tab in front while it records, and try again.");
    } finally {
      try { await ac?.close(); } catch { /* already closed */ }
      setBusy(false);
    }
  }

  return (
    <div className="re-card space-y-3 border-mcz-cyan/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5"><Clapperboard size={15} /> Coach Review Promo Video</p>
        {onClose && <button className="text-xs text-white/50 hover:text-white" onClick={onClose}>Close</button>}
      </div>
      <p className="text-[11px] text-white/50">
        Your take with the coach's read over it, 9:16 for TikTok, Reels and Shorts. Made in this browser:
        free, nothing uploaded. Keep the tab in front while it records ({seconds}s).
      </p>
      {isVideo
        ? <video ref={mediaRef} src={review.media_url} crossOrigin="anonymous" playsInline className="hidden" />
        : <audio ref={mediaRef} src={review.media_url} crossOrigin="anonymous" className="hidden" />}
      <div className="flex flex-wrap items-start gap-3">
        <canvas ref={canvasRef} width={W} height={H} className="w-40 rounded-lg border border-white/10 sm:w-52" />
        <div className="space-y-2">
          <label className="block text-[11px] text-white/60">Length
            <select className="ml-1 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-xs text-white"
                    value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} disabled={busy}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}
            </select>
          </label>
          <button className="neon-btn-primary !w-auto px-4 py-2 text-xs inline-flex items-center gap-1.5"
                  onClick={make} disabled={busy || !review.media_url}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Clapperboard size={13} />} {busy ? "Recording…" : "Make the video"}
          </button>
          {!review.media_url && <p className="text-[11px] text-mcz-gold">This take wasn't kept, so there's nothing to put under the read. Tick "Keep this take" next time.</p>}
          <p className="text-[10px] text-white/35">Saves as {mime.startsWith("video/mp4") ? "MP4" : mime ? "WebM" : "—"}{mime.startsWith("video/webm") ? " (TikTok's web upload takes it; some phone apps want MP4)" : ""}.</p>
          {out && (
            <a className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
               href={out.url} download={`coach-review-promo.${out.ext}`}>
              <Download size={12} /> Download ({(out.size / 1048576).toFixed(1)} MB)
            </a>
          )}
          {err && <p className="text-[11px] text-mcz-ember">{err}</p>}
        </div>
      </div>
    </div>
  );
}
