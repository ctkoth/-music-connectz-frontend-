// Artist message — a short vertical to-camera video from you to your fans, planned by the coach from your
// CharacterZ, FaceZ and VoiceZ and rendered in Video ConnectZ.
//
// It decides nothing. The shape, the length, the caption limit, what is checked and what is only asked
// of the model, every price and every locked door are the server's (/api/economy/artistmsg/); this
// draws them BEFORE anything is pressed. Three honest lines are on it on purpose:
//   - the shape, length and caption are checked; no music / logos / text / filters is ASKED and
//     nothing looks at the finished video, so the member is told to watch it all the way through;
//   - the voice you hear is the model's, not the member's — VoiceZ shapes the words;
//   - it is AI-made and says so (the server's `ai_label`).
// The two steps are priced on their buttons, like Anime ConnectZ: plan, then shots × the clip price.
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Download, Loader2, PenLine } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { handOff } from "../handoff.js";
import { PROMPTZ } from "../resources.js";
import { Price } from "./Price.jsx";
import AiEnergy from "./AiEnergy.jsx";
import Doors from "./Doors.jsx";

const API = "/api/economy/artistmsg/";

function Checks({ checks }) {
  return (
    <ul className="space-y-0.5 text-[12px]" aria-label="What is checked">
      {checks.map((c) => (
        <li key={c.key} className={c.ok ? "text-emerald-300" : "text-mcz-ember"}>{c.ok ? "✓" : "✗"} {c.what}</li>
      ))}
    </ul>
  );
}

function Piece({ s, work: initial, onChange }) {
  const [work, setWork] = useState(initial);
  const [shots, setShots] = useState(initial.shots);
  const [caption, setCaption] = useState(initial.caption);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { setWork(initial); setShots(initial.shots); setCaption(initial.caption); }, [initial]);
  // A rendering piece is asked again every 15 s; each ask moves it forward on the server.
  useEffect(() => {
    if (work.status !== "rendering") return undefined;
    const t = setInterval(async () => {
      try { const w = await api(`${API}${work.id}/`); setWork(w); if (w.status !== "rendering") onChange?.(w); } catch { /* next tick */ }
    }, 15000);
    return () => clearInterval(t);
  }, [work.status, work.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const editShot = (i, patch) => setShots((xs) => xs.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const setLine = (i, line) => editShot(i, { dialogue: shots[i].dialogue.length ? shots[i].dialogue.map((d, j) => (j === 0 ? { ...d, line } : d)) : [{ who: work.speaker, line }] });
  const save = async () => {
    setMsg("");
    try { const w = await api(`${API}${work.id}/`, { method: "PATCH", body: { caption, shots } }); setWork(w); setMsg("Saved."); onChange?.(w); }
    catch (e) { setMsg(e.message); }
  };
  const render = async () => {
    setBusy(true); setMsg("");
    try {
      // What is on screen is what renders: the plan is saved first (free), so an edit is never lost to the press.
      await api(`${API}${work.id}/`, { method: "PATCH", body: { caption, shots } });
      const w = await api(`${API}${work.id}/render/`, { method: "POST" }); setWork(w); onChange?.(w);
    }
    catch (e) { setMsg(e.message || "Couldn't start. Nothing was charged."); } finally { setBusy(false); }
  };
  const over = caption.length > s.spec.caption_max;

  return (
    <div className="re-card space-y-3" data-tour="artistmsg-piece">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-semibold text-white">💬 {work.speaker}'s message</h3>
        <span className="text-[11px] text-white/60">{work.total} shot{work.total === 1 ? "" : "s"} · about {work.seconds} s · vertical</span>
      </div>
      <p className="text-[11px] text-mcz-gold">{work.ai_label}</p>

      {work.status === "planned" && (
        <>
          <div className="space-y-1">
            <label className="re-label" htmlFor={`cap-${work.id}`}>Caption</label>
            <input id={`cap-${work.id}`} className="neon-input text-sm" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <p className={`text-[11px] ${over ? "text-mcz-ember" : "text-white/55"}`}>{caption.length} of {s.spec.caption_max} characters{over ? " — it will be cut when you save" : ""}</p>
          </div>
          {shots.map((x, i) => (
            <div key={i} className="space-y-1 rounded-lg bg-white/5 p-2 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Shot {i + 1} · {i * s.clip_seconds}–{(i + 1) * s.clip_seconds} s</p>
              <input className="neon-input !py-1 text-xs" value={x.action} aria-label={`Shot ${i + 1} action`} onChange={(e) => editShot(i, { action: e.target.value })} />
              <input className="neon-input !py-1 text-sm" maxLength={160} value={x.dialogue[0]?.line || ""} placeholder={`What ${work.speaker} says`}
                     aria-label={`Shot ${i + 1} line`} onChange={(e) => setLine(i, e.target.value)} />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button className="re-btn !w-auto px-4" onClick={save}>Save the plan <span className="text-emerald-300">Free</span></button>
            {msg && <span className="text-[11px] text-white/60">{msg}</span>}
          </div>
          <Checks checks={work.checks} />
          <div className="flex flex-wrap items-center gap-2">
            <button className="neon-btn-primary !w-auto px-5" disabled={busy || !s.configured || !s.can_join && work.total > 1} onClick={render}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Clapperboard size={14} />} Render {work.total} shot{work.total === 1 ? "" : "s"}
            </button>
            <span className="text-[11px]">
              <Price amount={work.render_price_cents} emoji={PROMPTZ} />{" "}
              <span className="text-white/55">({work.total} × {s.clip_price_cents}) · a shot that fails is refunded and left out · your edits are saved first</span>
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
          <video src={work.video_url} controls playsInline className="mx-auto w-full max-w-xs rounded-xl bg-black" />
          <p className="text-sm text-white">{work.caption || <span className="text-mcz-ember">Write a caption before you submit it.</span>}</p>
          <Checks checks={work.checks} />
          <p role="note" className="rounded-lg border border-mcz-gold/40 bg-mcz-gold/10 p-2 text-[12px] text-white/85">
            <span className="font-semibold text-mcz-gold">Watch it all the way through before you submit it.</span>{" "}
            {s.spec.check_note}
          </p>
          {work.failed > 0 && <p className="text-[11px] text-white/50">{work.failed} shot{work.failed === 1 ? "" : "s"} failed, were refunded and are left out.</p>}
          <div className="flex flex-wrap gap-2">
            <a className="re-btn !w-auto px-4" href={work.video_url} download><Download size={14} /> Download</a>
            <button className="re-btn !w-auto px-3" onClick={() => handOff("videoz", "", { url: work.video_url, name: work.caption || "Artist message", kind: "video" })}>🎞️ Edit in VideoZ</button>
          </div>
          <Doors item={{ title: work.caption || "Artist message", url: work.video_url, kind: "video", text: work.ai_label }} />
        </div>
      )}
      {work.status !== "done" && msg && work.status !== "planned" && <p role="alert" className="text-xs text-mcz-ember">{msg}</p>}
    </div>
  );
}

export default function ArtistMessage() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [charId, setCharId] = useState("");
  const [faceId, setFaceId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [brief, setBrief] = useState("");
  const [shots, setShots] = useState(3);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(null);
  const firstLoad = useRef(true);
  const load = () => api(API).then((d) => {
    setS(d); setErr("");
    if (firstLoad.current) { firstLoad.current = false; setShots(d.shots_max); }
  }).catch((e) => setErr(e.message || "Artist messages didn't load."));
  useEffect(() => { load(); }, []);
  // Nothing renders when the server could not answer: a half-stated spec is worse than none, and an
  // error panel for a panel nobody asked for is an interruption about an interruption.
  if (!s) return err ? <p className="text-[11px] text-white/45" role="status">{err}</p> : null;

  const char = s.characters.find((c) => String(c.id) === String(charId));
  const face = s.faces.find((f) => String(f.id) === String(faceId)) || (char?.has_face ? { id: char.face_id, url: char.face_url } : null);
  const n = Math.max(1, Math.min(shots, s.shots_max));
  const something = charId || faceId || voiceId;

  const plan = async () => {
    setBusy(true); setMsg("");
    try {
      const w = await api(`${API}plan/`, { method: "POST", body: {
        brief, shots: n, character_id: charId || undefined, face_id: faceId || undefined, voice_id: voiceId || undefined } });
      setOpen(w); load();
    } catch (e) { setMsg(e.message || "Couldn't plan it. Nothing was charged."); } finally { setBusy(false); }
  };

  return (
    <div className="re-card space-y-3" data-tour="artistmsg">
      <div className="space-y-1">
        <h3 className="font-display text-lg font-extrabold text-white">💬 Artist message</h3>
        <p className="text-sm text-white/60">
          A short vertical message to your fans. The coach writes it in your voice from your character and your face, you edit every line, then it renders.
        </p>
        <p className="text-[12px] text-white/75" data-testid="artistmsg-spec">
          Made to: vertical · under {s.spec.max_seconds} s (up to {s.spec.longest_seconds} s here) · caption under {s.spec.caption_max + 1} characters · no music, logos, text or filters.
        </p>
        <p className="text-[11px] text-white/50">{s.spec.source_note}</p>
        <p className="text-[11px] text-mcz-gold">{s.ai_label}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="space-y-1 text-[11px] text-white/60">CharacterZ
          <select className="neon-input !py-1 text-xs" aria-label="Character" value={charId} onChange={(e) => setCharId(e.target.value)}>
            <option value="">None</option>
            {s.characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-[11px] text-white/60">FaceZ
          <select className="neon-input !py-1 text-xs" aria-label="Face" value={faceId} onChange={(e) => setFaceId(e.target.value)}>
            <option value="">{char?.has_face ? `${char.name}'s face` : "None"}</option>
            {s.faces.map((f) => <option key={f.id} value={f.id}>{f.name || `Face ${f.id}`}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-[11px] text-white/60">VoiceZ
          <select className="neon-input !py-1 text-xs" aria-label="Voice" value={voiceId} disabled={!s.can_voice} onChange={(e) => setVoiceId(e.target.value)}>
            <option value="">{char ? `${char.name}'s own voice` : "Plain"}</option>
            {s.voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
      </div>
      {!s.can_voice && <p className="text-[11px] text-white/50">{s.voices_locked}</p>}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/55">
        {face && <img src={face.url} alt="The face every shot starts from" className="h-10 w-10 rounded-lg object-cover" />}
        <span>{face ? "Every shot starts from this photo of you." : "No photo: the shots are made from the description only."}</span>
        <button className="re-link" onClick={() => goToSpot("characterz", "")}>+ character</button>
        <button className="re-link" onClick={() => goToSpot("facez", "")}>+ face</button>
        <button className="re-link" onClick={() => goToSpot("voicez", "")}>VoiceZ</button>
      </div>

      <textarea className="neon-input text-sm" rows={3} maxLength={s.brief_max} value={brief} onChange={(e) => setBrief(e.target.value)}
                placeholder="What do you want to tell them? Only what you say here goes in — nothing is invented." aria-label="What you want to say" />
      <label className="flex items-center gap-2 text-xs">Shots
        <input type="range" min={1} max={s.shots_max} value={n} onChange={(e) => setShots(Number(e.target.value))} aria-label="Shots" />
        <span className="tabular-nums text-white">{n} · about {n * s.clip_seconds} s</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button className="neon-btn-primary !w-auto px-5" disabled={busy || !brief.trim() || !something || !s.configured} onClick={plan}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />} Plan {n} shot{n === 1 ? "" : "s"}
        </button>
        <span className="text-[11px]">
          <Price amount={s.plan.cost_cents} emoji={PROMPTZ} freeToday={s.plan.free_today} /> <AiEnergy />{" "}
          <span className="text-white/55">for the plan, not charged if nothing comes back · rendering is after, at {n} × {s.clip_price_cents}</span>
        </span>
      </div>
      {!something && <p className="text-[11px] text-white/50">Pick a character, a face or a voice to build it from.</p>}
      {!s.configured && <p className="text-xs text-mcz-ember">Artist messages aren't switched on yet.</p>}
      {msg && <p role="alert" className="text-xs text-mcz-ember">{msg}</p>}

      {open && <Piece s={s} work={open} onChange={(w) => { setOpen(w); load(); }} />}
      {s.works.length > 0 && (
        <div className="space-y-1">
          <p className="re-label">Your messages</p>
          {s.works.map((w) => (
            <button key={w.id} className="block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10" onClick={() => setOpen(w)}>
              {w.caption || w.title} <span className="text-[11px] text-white/55">· {w.total} shots · {w.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
