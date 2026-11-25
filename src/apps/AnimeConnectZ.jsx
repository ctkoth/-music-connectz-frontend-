// Anime ConnectZ — an AI anime from your CharacterZ cast and your idea.
//
// Two steps, each priced on its button, like MangaZ: PLAN (the writer turns the idea into shots —
// camera, setting, action, each character's lines in their own voice), editable before anything
// renders; then RENDER (every shot is a Video ConnectZ clip in anime style, at the clip price, started
// a few at a time and joined with the dialogue the model voiced). The lengths are the server's
// (PromptZ / ReelZ / EpisodeZ / MovieZ), and so is how many shots this tier may plan. Every piece is
// AI-made and says so. A finished piece opens in AnimeZ, where pieces join into full episodes.
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Loader2, PenLine } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { goToSpot } from "../goto.js";
import { handOff, onHandoff } from "../handoff.js";
import { PROMPTZ } from "../resources.js";
import { Price } from "../components/Price.jsx";
import AiEnergy from "../components/AiEnergy.jsx";
import LoadGate from "../components/LoadGate.jsx";
import Empty from "../components/Empty.jsx";
import Doors from "../components/Doors.jsx";

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

function ShotEditor({ work, cast, onSaved }) {
  const [shots, setShots] = useState(work.shots);
  const [msg, setMsg] = useState("");
  useEffect(() => setShots(work.shots), [work]);
  const edit = (i, patch) => setShots((xs) => xs.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const save = async () => {
    setMsg("");
    try { onSaved(await api(`/api/economy/animez/${work.id}/`, { method: "PATCH", body: { shots } })); setMsg("Saved."); }
    catch (e) { setMsg(e.message); }
  };
  return (
    <div className="space-y-2">
      {shots.map((s, i) => (
        <div key={i} className="space-y-1 rounded-lg bg-white/5 p-2 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Shot {i + 1} · {mmss(i * 8)}</p>
          <div className="grid gap-1 sm:grid-cols-2">
            <input className="neon-input !py-1 text-xs" value={s.camera} aria-label={`Shot ${i + 1} camera`} placeholder="Camera"
                   onChange={(e) => edit(i, { camera: e.target.value })} />
            <input className="neon-input !py-1 text-xs" value={s.setting} aria-label={`Shot ${i + 1} setting`} placeholder="Where"
                   onChange={(e) => edit(i, { setting: e.target.value })} />
          </div>
          <input className="neon-input !py-1 text-sm" value={s.action} aria-label={`Shot ${i + 1} action`} placeholder="What moves"
                 onChange={(e) => edit(i, { action: e.target.value })} />
          {s.dialogue.map((d, j) => (
            <div key={j} className="flex items-center gap-1.5">
              <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" aria-label="Speaker" value={d.who}
                      onChange={(e) => edit(i, { dialogue: s.dialogue.map((x, k) => (k === j ? { ...x, who: e.target.value } : x)) })}>
                {cast.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input className="neon-input !py-1 flex-1 text-sm" value={d.line} aria-label="Line" maxLength={160}
                     onChange={(e) => edit(i, { dialogue: s.dialogue.map((x, k) => (k === j ? { ...x, line: e.target.value } : x)) })} />
            </div>
          ))}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button className="re-btn !w-auto px-4" onClick={save}>Save the plan <span className="text-emerald-300">Free</span></button>
        {msg && <span className="text-[11px] text-white/60">{msg}</span>}
      </div>
    </div>
  );
}

function Piece({ s, work: initial, chars, onChange }) {
  const [work, setWork] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const timer = useRef(null);
  useEffect(() => setWork(initial), [initial]);
  // A rendering piece is asked again every 15 s; each ask moves it forward on the server.
  useEffect(() => {
    if (work.status !== "rendering") return undefined;
    timer.current = setInterval(async () => {
      try { const w = await api(`/api/economy/animez/${work.id}/`); setWork(w); if (w.status !== "rendering") onChange?.(w); } catch { /* next tick */ }
    }, 15000);
    return () => clearInterval(timer.current);
  }, [work.status, work.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const cast = chars.filter((c) => work.character_ids.includes(c.id));
  const fmt = s.formats.find((f) => f.key === work.fmt);
  const render = async () => {
    setBusy(true); setMsg("");
    try { const w = await api(`/api/economy/animez/${work.id}/render/`, { method: "POST" }); setWork(w); onChange?.(w); }
    catch (e) { setMsg(e.message || "Couldn't start. Nothing was charged."); } finally { setBusy(false); }
  };
  return (
    <div className="re-card space-y-3" data-tour="animez-piece">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-semibold text-white">{fmt?.emoji} {work.title}</h3>
        <span className="text-[11px] text-white/60">{fmt?.label} · {work.total} shots · about {mmss(work.seconds)} · {work.aspect}</span>
      </div>
      <p className="text-[11px] text-mcz-gold">{work.ai_label}</p>
      {work.status === "planned" && (
        <>
          <ShotEditor work={work} cast={cast} onSaved={setWork} />
          <div className="flex flex-wrap items-center gap-2">
            <button className="neon-btn-primary !w-auto px-5" disabled={busy || !s.configured} onClick={render}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Clapperboard size={14} />} Render {work.total} shot{work.total === 1 ? "" : "s"}
            </button>
            <span className="text-[11px]">
              <Price amount={work.render_price_cents} emoji={PROMPTZ} /> <span className="text-white/55">
                ({work.total} × {s.clip_price_cents}) · a shot that fails is refunded and left out · starts {s.concurrent} at a time</span>
            </span>
          </div>
        </>
      )}
      {work.status === "rendering" && (
        <p className="text-sm text-white/70" role="status">
          <Loader2 size={13} className="mr-1 inline animate-spin" />
          {work.rendered} of {work.total} shots rendered · {work.rendering} rendering · {work.queued} waiting{work.failed ? ` · ${work.failed} failed (refunded)` : ""}.
          <span className="block text-[11px] text-white/60">Each shot takes a minute or two. You can leave — it carries on, and this page picks up where it is.</span>
        </p>
      )}
      {work.status === "failed" && <p className="text-sm text-mcz-ember">{work.error}</p>}
      {work.status === "done" && work.video_url && (
        <div className="space-y-2">
          <video src={work.video_url} controls className="w-full rounded-lg" />
          {work.failed > 0 && <p className="text-[11px] text-white/50">{work.failed} shot{work.failed === 1 ? "" : "s"} failed, were refunded and are left out.</p>}
          <div className="flex flex-wrap gap-2">
            <button className="neon-btn-primary !w-auto px-4" title="Join pieces into a full episode or movie, add your manga pages and titles — free, on your device"
                    onClick={() => handOff("animez", "", { video: { url: work.video_url, name: work.title, seconds: work.seconds } })}>🌸 Open in AnimeZ</button>
            <button className="re-btn !w-auto px-3" onClick={() => handOff("videoz", "", { url: work.video_url, name: work.title, kind: "video" })}>🎞️ Edit in VideoZ</button>
          </div>
          <Doors item={{ title: work.title, url: work.video_url, kind: "video", text: work.ai_label }} />
        </div>
      )}
      {msg && <p role="alert" className="text-xs text-mcz-ember">{msg}</p>}
    </div>
  );
}

export default function AnimeConnectZ() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [fmt, setFmt] = useState("reelz");
  const [shots, setShots] = useState(2);
  const [picked, setPicked] = useState([]);
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState("");
  const [aspect, setAspect] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(null);
  const load = () => api("/api/economy/animez/").then((d) => { setS(d); setErr(""); }).catch((e) => setErr(e.message || "Anime ConnectZ didn't load."));
  useEffect(() => { load(); }, []);
  // From MangaZ ("Animate it with AI"): the page's idea and cast as the starting brief.
  useEffect(() => onHandoff("animeconnectz", (p) => {
    if (p?.idea) setIdea(String(p.idea).slice(0, 2000));
    if (Array.isArray(p?.character_ids)) setPicked(p.character_ids.filter((i) => Number.isInteger(i)));
  }), []);
  if (!s) return <LoadGate error={err} what="Anime ConnectZ" onRetry={load} />;
  const f = s.formats.find((x) => x.key === fmt) || s.formats[0];
  const n = Math.max(f.min, Math.min(shots, f.shots_max || f.min));
  const pickFmt = (x) => { setFmt(x.key); setShots(x.min); setAspect(""); };

  const plan = async () => {
    setBusy(true); setMsg("");
    try {
      const w = await api("/api/economy/animez/plan/", { method: "POST",
        body: { fmt, shots: n, idea, character_ids: picked, style, aspect: aspect || f.aspects[0] } });
      setOpen(w); load();
    } catch (e) { setMsg(e.message || "Couldn't plan it. Nothing was charged."); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="re-card space-y-1">
        <h2 className="flex items-center gap-3 font-display text-xl font-extrabold">
          <IconImg icon="animeconnectz.png" alt="" className="h-11 w-11 rounded-xl" /> Anime ConnectZ
        </h2>
        <p className="text-sm text-white/60">Your characters and your idea, animated by AI. You edit the shots before anything renders.</p>
        <p className="text-[11px] text-mcz-gold">{s.ai_label}</p>
      </div>
      {s.characters.length === 0 ? (
        <Empty text="Anime ConnectZ needs at least one character to cast." action="Make one in CharacterZ" onAction={() => goToSpot("characterz", "")} />
      ) : (
        <div className="re-card space-y-3" data-tour="animez-new">
          <div className="grid gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Length">
            {s.formats.map((x) => (
              <button key={x.key} type="button" role="radio" aria-checked={fmt === x.key} disabled={!x.allowed}
                      onClick={() => pickFmt(x)}
                      className={`rounded-xl border p-2 text-left text-[11px] ${fmt === x.key ? "border-mcz-cyan bg-mcz-cyan/10" : "border-white/10"} disabled:opacity-45`}>
                <span className="block text-sm font-semibold text-white">{x.emoji} {x.label}</span>
                <span className="text-white/55">{x.what}</span>
                {!x.allowed && <span className="mt-1 block text-mcz-gold">{x.locked}</span>}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/60">{s.length_note}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {f.min !== f.max && (
              <label className="flex items-center gap-2">Shots
                <input type="range" min={f.min} max={f.shots_max || f.min} value={n} onChange={(e) => setShots(Number(e.target.value))} aria-label="Shots" />
                <span className="tabular-nums text-white">{n} · about {mmss(n * s.clip_seconds)}</span>
              </label>
            )}
            <span className="text-white/60">
              {s.shot_cap == null ? "Unlimited shots on your plan, up to the length's own ceiling" : `Your plan holds ${s.shot_cap} shots a piece`}
              {s.shot_cap != null && s.shot_cap < 60 && ` · Premium ${s.ladder.premium}, StatZ every one`}
            </span>
            {s.shot_cap != null && <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Plans</button>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {s.characters.map((c) => (
              <button key={c.id} type="button" className={`pill text-[12px] ${picked.includes(c.id) ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}
                      onClick={() => setPicked((x) => (x.includes(c.id) ? x.filter((i) => i !== c.id) : [...x, c.id].slice(0, s.max_characters)))}>
                {c.name}
              </button>
            ))}
            <button className="re-link text-[12px]" onClick={() => goToSpot("characterz", "")}>+ character</button>
            <span className="text-[11px] text-white/60">{picked.length} of {s.max_characters} in the cast</span>
          </div>
          <textarea className="neon-input text-sm" rows={3} maxLength={s.idea_max} placeholder="What happens?"
                    value={idea} onChange={(e) => setIdea(e.target.value)} aria-label="Idea" />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select aria-label="Style" className="neon-input !w-auto !py-1 text-xs" value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="">Any anime style</option>
              {s.styles.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
            {f.aspects.length > 1 && (
              <select aria-label="Shape" className="neon-input !w-auto !py-1 text-xs" value={aspect || f.aspects[0]} onChange={(e) => setAspect(e.target.value)}>
                {f.aspects.map((a) => <option key={a} value={a}>{a === "9:16" ? "Vertical 9:16" : "Wide 16:9"}</option>)}
              </select>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="neon-btn-primary !w-auto px-5" disabled={busy || !f.allowed || !picked.length || !idea.trim() || !s.configured} onClick={plan}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />} Plan {n} shot{n === 1 ? "" : "s"}
            </button>
            <span className="text-[11px]"><Price amount={s.plan.cost_cents} emoji={PROMPTZ} freeToday={s.plan.free_today} /> <AiEnergy />{" "}
              <span className="text-white/55">for the plan, not charged if nothing comes back · rendering is after, at {n} × {s.clip_price_cents}</span></span>
          </div>
          {!s.configured && <p className="text-xs text-mcz-ember">Anime ConnectZ isn't switched on yet.</p>}
          {msg && <p role="alert" className="text-xs text-mcz-ember">{msg}</p>}
        </div>
      )}
      {open && <Piece s={s} work={open} chars={s.characters} onChange={(w) => { setOpen(w); load(); }} />}
      {s.works.length > 0 && (
        <div className="space-y-1">
          <p className="re-label">Your anime</p>
          {s.works.map((w) => (
            <button key={w.id} className="block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10" onClick={() => setOpen(w)}>
              {w.title} <span className="text-[11px] text-white/55">· {s.formats.find((x) => x.key === w.fmt)?.label} · {w.total} shots · {w.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
