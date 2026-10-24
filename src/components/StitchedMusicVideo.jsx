import { goToSpot } from "../goto.js";
import Empty from "./Empty.jsx";
import { useEffect, useState } from "react";
import { Clapperboard, Download, Loader2, Plus, X } from "lucide-react";
import { api } from "../api.js";
import { MONEY, PROMPTZ } from "../resources.js";
import { playSound } from "../sound.js";
import { money, splitCost } from "../aiRun.js";

// A music video made of several shots with the member's OWN track under them.
// The server decides everything that matters — the prices (shots x clip price),
// the shot limits, which uploads are tracks, and what is joined; this renders it.
// Price sits beside the button before it is pressed, and a start that cannot
// begin every shot charges nothing.

const POLL_MS = 8000;
const POLL_TIMEOUT_MS = 150_000;
const STARTERS = ["Opening shot — set the scene", "The artist performing", "The crowd or the city", "Close-up on the emotion"];

function TotalPrice({ cents, promptz }) {
  const split = splitCost(cents, promptz);
  return (
    <span className="text-[11px] text-mcz-ember">
      {split ? (
        <>
          {split.promptz > 0 && <>−{split.promptz} {PROMPTZ} </>}
          {split.cents > 0 && <>−{money(split.cents)} {MONEY}</>}
        </>
      ) : <>−{cents} {PROMPTZ}</>}{" "}
      <span className="text-white/45">
        — held while it renders. A shot that fails is refunded and left out; if one can't start, nothing is charged.
      </span>
    </span>
  );
}

export default function StitchedMusicVideo() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [trackId, setTrackId] = useState(null);
  const [startAt, setStartAt] = useState(0);
  const [look, setLook] = useState("");
  const [shots, setShots] = useState(["", "", ""]);
  const [aspect, setAspect] = useState("9:16");
  const [face, setFace] = useState(null);
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState(null);

  const load = () => api("/api/economy/videoz/stitch/").then((d) => {
    setS(d);
    setTrackId((cur) => cur ?? d.tracks?.[0]?.id ?? null);
    const p = (d.videos || []).find((v) => v.status === "pending");
    if (p) setVideo((cur) => (cur?.status === "pending" ? cur : p));
  }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll until it is joined or failed; each poll is scheduled after the last answered.
  useEffect(() => {
    if (video?.status !== "pending") return undefined;
    let alive = true;
    let t = null;
    const poll = async () => {
      try {
        const v = await api(`/api/economy/videoz/stitch/${video.id}/`, { timeoutMs: POLL_TIMEOUT_MS });
        if (!alive) return;
        setVideo(v);
        if (v.status !== "pending") { load(); playSound(v.status === "done" ? "build_done" : "build_fail"); return; }
      } catch { /* a missed poll just waits for the next one */ }
      if (alive) t = setTimeout(poll, POLL_MS);
    };
    t = setTimeout(poll, POLL_MS);
    return () => { alive = false; clearTimeout(t); };
  }, [video?.id, video?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return err ? <p className="text-sm text-mcz-ember">{err}</p> : null;

  const filled = shots.map((x) => x.trim()).filter(Boolean);
  const n = filled.length;
  const cents = s.prices?.[String(n)] ?? 0;
  const enough = n >= s.min_shots && (s.owner_free || (s.promptz || 0) + s.money_cents >= cents);
  const pending = video?.status === "pending";
  const ready = s.configured && s.can_join && trackId && n >= s.min_shots && enough && !pending;

  async function make() {
    setErr(""); setBusy(true);
    try {
      const v = await api("/api/economy/videoz/stitch/", { method: "POST",
        body: { track_id: trackId, track_start: Number(startAt) || 0, look, shots: filled, aspect, face_id: face || undefined },
        timeoutMs: 120_000 });
      setVideo(v); load(); playSound("build_start");
    } catch (e) { playSound("error"); setErr(e.message); load(); }
    finally { setBusy(false); }
  }

  const seconds = Math.max(n, 0) * s.clip_seconds;

  return (
    <div className="neon-frame space-y-4 p-4" data-tour="stitched-video">
      <div>
        <h3 className="font-semibold text-mcz-cyan">🎬 Music video with your track</h3>
        <p className="text-xs text-white/60">{s.what_you_get}</p>
      </div>

      {!s.configured && <p className="text-sm text-mcz-gold">Video ConnectZ isn't switched on yet.</p>}
      {s.configured && !s.can_join && (
        <p className="text-sm text-mcz-gold">Joining shots isn't available on the server yet, so nothing can be started.</p>
      )}

      <div className="space-y-2">
        <p className="text-sm text-white/70">Your track</p>
        {s.tracks?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Your track" data-nomemo="true" className="neon-input !w-auto !py-2 text-xs"
              value={trackId ?? ""} onChange={(e) => setTrackId(Number(e.target.value))}>
              {s.tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs text-white/60">
              starts at
              <input type="number" min="0" max="3600" className="neon-input !w-20 !py-1 text-xs" aria-label="Start the track at this many seconds"
                value={startAt} onChange={(e) => setStartAt(e.target.value)} /> s
            </label>
            <span className="text-[11px] text-white/45">Pick the chorus: it plays for the length of the video (about {seconds || s.clip_seconds * s.min_shots}s).</span>
          </div>
        ) : (
          <Empty className="text-xs" text="No audio uploads yet. A track you post appears here." action="Post a track" onAction={() => goToSpot("postz", "post-compose")} />
        )}
      </div>

      <input className="neon-input w-full text-sm" maxLength={300} aria-label="The look of the whole video"
        placeholder="The look, applied to every shot — e.g. neon rain, 35mm film grain, moody"
        value={look} onChange={(e) => setLook(e.target.value)} />

      <div className="space-y-2">
        <p className="text-sm text-white/70">Shots <span className="text-white/40">({s.min_shots}–{s.max_shots}, each about {s.clip_seconds}s, joined in order)</span></p>
        {shots.map((x, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 text-xs text-white/40">{i + 1}</span>
            <input className="neon-input w-full text-sm" aria-label={`Shot ${i + 1}`} placeholder={STARTERS[i % STARTERS.length]}
              value={x} onChange={(e) => setShots(shots.map((y, j) => (j === i ? e.target.value : y)))} />
            {shots.length > s.min_shots && (
              <button className="re-btn !w-auto px-2" aria-label={`Remove shot ${i + 1}`}
                onClick={() => setShots(shots.filter((_, j) => j !== i))}><X size={12} /></button>
            )}
          </div>
        ))}
        {shots.length < s.max_shots && (
          <button className="re-link text-xs" onClick={() => setShots([...shots, ""])}><Plus size={12} className="inline" /> Add a shot</button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-white/60">Shape</span>
        {s.aspects.map((a) => (
          <button key={a} onClick={() => setAspect(a)}
            className={`rounded-full border px-3 py-1 ${aspect === a ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>
            {a === "16:9" ? "16:9 · YouTube" : "9:16 · Reels / TikTok"}
          </button>
        ))}
        {s.faces?.length > 0 && (
          <span className="ml-2 flex items-center gap-1">
            <button onClick={() => setFace(null)} className={`rounded border px-2 py-1 text-xs ${face === null ? "border-mcz-cyan" : "border-white/15 text-white/60"}`}>No face</button>
            {s.faces.slice(0, 6).map((f) => (
              <button key={f.id} onClick={() => setFace(f.id)} aria-label="Use this FaceZ photo" aria-pressed={face === f.id}
                className={`h-8 w-8 overflow-hidden rounded border-2 ${face === f.id ? "border-mcz-cyan" : "border-transparent"}`}>
                <img src={f.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="neon-btn-primary !w-auto px-5" disabled={busy || !ready} onClick={make}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Clapperboard size={16} />} Make the music video
        </button>
        {n >= s.min_shots
          ? <TotalPrice cents={cents} promptz={s.promptz} />
          : <span className="text-[11px] text-white/45">Write at least {s.min_shots} shots to see the price.</span>}
      </div>
      {n >= s.min_shots && !enough && (
        <p className="text-xs text-mcz-ember">
          {n} shots cost {money(cents)} ({PROMPTZ} first, then your balance). You hold {s.promptz} {PROMPTZ} and {money(s.money_cents)} {MONEY}.
          Fewer shots cost less.
        </p>
      )}
      {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}

      {video && (
        <div key={video.id} className="mcz-reveal space-y-3 border-t border-white/10 pt-3">
          {video.status === "pending" && (
            <p className="text-sm text-white/70">
              <Loader2 className="mr-2 inline animate-spin" size={14} />
              {video.rendered} of {video.total} shots rendered{video.failed ? ` · ${video.failed} failed and refunded` : ""}. The video is joined
              with your track when the last one lands. You can leave this tab; open Video ConnectZ again to collect it.
            </p>
          )}
          {video.status === "failed" && <p className="text-sm text-mcz-ember">{video.error}</p>}
          {video.status === "done" && video.video_url && (
            <>
              <p className="text-xs text-white/60">
                {video.rendered} of {video.total} shots{video.failed ? ` (${video.failed} failed and were refunded and left out)` : ""}, with your track.
              </p>
              <video src={video.video_url} controls playsInline
                className={`w-full rounded-xl bg-black ${video.aspect === "9:16" ? "mx-auto max-w-xs" : ""}`} />
              <a className="re-btn !w-auto px-4" href={video.video_url} download><Download size={14} /> Download</a>
            </>
          )}
        </div>
      )}

      {s.videos?.length > 0 && !video && (
        <div className="space-y-1">
          {s.videos.map((v) => (
            <button key={v.id} onClick={() => setVideo(v)} className="block text-left text-xs text-white/60 hover:text-white">
              Music video #{v.id} — {v.status === "done" ? "ready" : v.status === "pending" ? "rendering…" : "didn't render"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
