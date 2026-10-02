import { useEffect, useRef, useState } from "react";
import { Clapperboard, Download, Loader2 } from "lucide-react";
import { useCharLimit } from "../limits.js";
import CharLimit from "../CharLimit.jsx";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { PROMPTZ } from "../resources.js";
import { playSound } from "../sound.js";
import UseIn from "../components/UseIn.jsx";

// Video ConnectZ — music, bio and promo videos, optionally starting from the
// member's own FaceZ photo. Price, kinds and faces come from
// /api/economy/videoz/. The price is HELD while a video renders and handed
// back in full if it fails, so the line beside the button says so.

const POLL_MS = 8000;
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Price({ s }) {
  if (!s) return null;
  const c = s.price_cents;
  const fromPromptz = s.promptz >= c;
  return (
    <span className="text-[11px] text-mcz-ember">
      −{c} {PROMPTZ}{" "}
      <span className="text-white/45">
        {fromPromptz ? `from your ${s.promptz} PromptZ` : `($${(c / 100).toFixed(2)}, PromptZ first then balance)`} —
        held while it renders, refunded in full if it fails
      </span>
    </span>
  );
}

export default function VideoConnectZ() {
  const cl = useCharLimit();
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [kind, setKind] = useState("music");
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [face, setFace] = useState(null);
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef(null);

  const load = () => api("/api/economy/videoz/").then(setS).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  // A render keeps going server-side; poll until it lands or fails.
  useEffect(() => {
    clearInterval(timer.current);
    if (work?.status !== "pending") return undefined;
    const started = Date.parse(work.created_at);
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const clockT = setInterval(tick, 1000);
    timer.current = setInterval(async () => {
      try {
        const w = await api(`/api/economy/videoz/${work.id}/`);
        if (w.status !== "pending") {
          setWork(w); load();
          playSound(w.status === "done" ? "build_done" : "build_fail");
        }
      } catch { /* a missed poll just waits for the next one */ }
    }, POLL_MS);
    return () => { clearInterval(timer.current); clearInterval(clockT); };
  }, [work?.id, work?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const [uploading, setUploading] = useState(false);
  async function addFace(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setErr("");
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("name", "Video ConnectZ");
      const f = await api("/api/economy/facez/", { method: "POST", body });
      await load();
      const id = f?.face?.id ?? f?.id;
      if (id) setFace(id);
    } catch (x) { setErr(x.message); } finally { setUploading(false); }
  }

  async function start() {
    setErr(""); setBusy(true);
    try {
      const w = await api("/api/economy/videoz/", { method: "POST",
        body: { kind, prompt, aspect, face_id: face || undefined } });
      setWork(w); load();
      playSound("build_start");
    } catch (e) { setErr(e.message); playSound("error"); load(); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="videoconnectz.png" alt="Video ConnectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Video ConnectZ</h2>
          <p className="text-sm text-white/60">Music, bio and promo videos — starring your FaceZ if you want.</p>
        </div>
      </header>

      {s && !s.configured && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">Video ConnectZ isn't switched on yet.</p>}

      <div className="neon-frame space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {(s?.kinds || []).map((k) => (
            <button key={k.key} onClick={() => setKind(k.key)}
              className={`rounded-full border px-3 py-1.5 text-sm ${kind === k.key ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/70"}`}>
              {k.emoji} {k.label}
            </button>
          ))}
        </div>
        <textarea className="neon-input min-h-24 w-full" maxLength={cl.limit}
          placeholder="Describe the video — the scene, the mood, what happens."
          value={prompt} onChange={(e) => setPrompt(cl.clamp(e.target.value))} />
        <CharLimit cl={cl} value={prompt} />

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/60">Shape</span>
          {(s?.aspects || ["16:9", "9:16"]).map((a) => (
            <button key={a} onClick={() => setAspect(a)}
              className={`rounded-full border px-3 py-1 ${aspect === a ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>
              {a === "16:9" ? "16:9 · YouTube" : "9:16 · Reels / TikTok"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/70">Star in it <span className="text-white/40">(optional — your FaceZ photo becomes the first frame)</span></p>
          {s?.faces?.length ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFace(null)}
                className={`h-14 rounded-lg border px-3 text-xs ${face === null ? "border-mcz-cyan" : "border-white/15 text-white/60"}`}>No face</button>
              {s.faces.map((f) => (
                <button key={f.id} onClick={() => setFace(f.id)}
                  className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${face === f.id ? "border-mcz-cyan" : "border-transparent"}`}>
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/50">No FaceZ photos yet — add a clear, front-facing one below.</p>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-mcz-cyan">
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={addFace} />
            {uploading ? <Loader2 className="animate-spin" size={12} /> : "+"} Add a FaceZ photo
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="neon-btn-primary !w-auto px-5" disabled={busy || !prompt.trim() || (s && !s.can_afford) || work?.status === "pending"}
            onClick={start}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Clapperboard size={16} />} Make the video
          </button>
          <Price s={s} />
        </div>
        {s && !s.can_afford && (
          <p className="text-xs text-white/55">
            A video needs {s.price_cents} {PROMPTZ} (or ${(s.price_cents / 100).toFixed(2)}) — you have {s.promptz} {PROMPTZ} and ${(s.money_cents / 100).toFixed(2)}.
          </p>
        )}
        {s?.royalty_rule && <p className="text-xs text-white/50">{s.royalty_rule}</p>}
        {err && <p className="text-sm text-mcz-ember">{err}</p>}
      </div>

      {work && (
        <div key={work.id} className="mcz-reveal neon-frame space-y-3 p-4">
          <h3 className="font-semibold">{work.label} · {work.aspect}</h3>
          {work.status === "pending" && (
            <p className="text-sm text-white/70">
              <Loader2 className="mr-2 inline animate-spin" size={14} />
              Rendering — {clock(elapsed)} so far. Videos usually take a few minutes; you can leave this tab and come back.
            </p>
          )}
          {work.status === "failed" && (
            <p className="text-sm text-mcz-ember">It didn't render ({work.error}). Your PromptZ/balance has been handed back.</p>
          )}
          {work.status === "done" && work.video_url && (
            <>
              <video src={work.video_url} controls playsInline
                className={`w-full rounded-xl bg-black ${work.aspect === "9:16" ? "mx-auto max-w-xs" : ""}`} />
              <a className="re-btn !w-auto px-4" href={work.video_url} download><Download size={14} /> Download</a>
              <UseIn source="video" sourceId={work.id} pct={work.royalty_pct ?? 10} />
            </>
          )}
        </div>
      )}

      {s?.works?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/70">Your videos</h3>
          {s.works.map((w) => (
            <button key={w.id} onClick={() => setWork(w)}
              className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-white/30">
              {w.label} <span className="text-white/45">— {w.status === "done" ? "ready" : w.status === "pending" ? "rendering…" : "didn't render"} · {w.prompt.slice(0, 60)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
