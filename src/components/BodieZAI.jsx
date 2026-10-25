// BodieZ AI coach — the two reads and the list that keeps them.
//
// A LOG READ (AskAI, on a workout, a routine or a muscle) reads what was logged and
// says what's working, what to change and the next session. It has no score of its
// own: the number on it is the Thorough rating the server already works out. A FORM
// CHECK (FormCheck) watches one video of one set and is scored — Setup, Range,
// Control, Path, Bracing — labelled "Form", never "Thorough".
//
// Decides nothing: the price, the parts, what each means, the caveats and the
// results are all /api/economy/bodiez/ai/. The price sits beside every control that
// spends it, before it is pressed, and a read that can't be done says it wasn't
// charged. Every paid read is kept, so it reopens and downloads from the list.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Bot, Download, Loader2, Trash2, Video } from "lucide-react";
import { api } from "../api.js";
import { PROMPTZ } from "../resources.js";
import { Price } from "./Price.jsx";
import { RatingNumber, RatingRow } from "./Rating.jsx";
import { saveText } from "../download.js";

const Ctx = createContext(null);

export function BodieZAIProvider({ children }) {
  const [state, setState] = useState(null);
  const reload = useCallback(() => api("/api/economy/bodiez/ai/").then(setState).catch(() => setState(null)), []);
  useEffect(() => { reload(); }, [reload]);
  return <Ctx.Provider value={{ state, reload }}>{children}</Ctx.Provider>;
}

const useAI = () => useContext(Ctx) || { state: null, reload: () => {} };

/** The price of one read, as it applies to this member right now. */
export function ReadPrice() {
  const { state } = useAI();
  if (!state) return null;
  return <Price amount={state.cost_cents} emoji={PROMPTZ} freeToday={state.free_today} />;
}

function Whys({ title, rows }) {
  if (!rows?.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">{title}</p>
      {rows.map((x, i) => (
        <div key={i} className="rounded-lg bg-white/[0.04] p-2 text-[12px]">
          <p className="font-semibold text-white/90">{x.what}</p>
          {x.why && <p className="text-white/60"><span className="text-white/40">Why: </span>{x.why}</p>}
          {x.how && <p className="text-white/70"><span className="text-white/40">How: </span>{x.how}</p>}
        </div>
      ))}
    </div>
  );
}

function Lines({ title, rows, tone = "text-white/75" }) {
  if (!rows?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">{title}</p>
      <ul className={`list-disc space-y-0.5 pl-5 text-[12px] ${tone}`}>{rows.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

/** One kept read — a log read or a form check — drawn from what the server stored. */
export function ReadResult({ row }) {
  const r = row?.result || {};
  if (row.kind === "form") {
    const labels = r.labels || {};
    return (
      <div className="space-y-2">
        <RatingRow value={r.overall} exact={r.overall} outOf label={`Form — ${r.exercise || ""}`}
                   detail={r.rule} size="lg" />
        <div className="grid gap-1.5 sm:grid-cols-2">
          {Object.keys(labels).map((k) => (
            r.scores?.[k] == null
              ? <p key={k} className="rounded-lg border border-white/10 p-2 text-[11px] text-white/45">
                  <span className="font-semibold text-white/70">{labels[k]}</span> — not seen from this angle, not guessed.
                </p>
              : <RatingRow key={k} value={r.scores[k]} label={labels[k]} detail={r.means?.[k]} />
          ))}
        </div>
        {r.reps_seen != null && <p className="text-[11px] text-white/50">{r.reps_seen} reps seen.</p>}
        {r.verdict && <p className="text-sm text-white/85">{r.verdict}</p>}
        <Lines title="Working" rows={r.working} tone="text-emerald-200/90" />
        <Whys title="Cues for the next set" rows={r.cues} />
        <Lines title="Watch for" rows={r.safety} tone="text-mcz-ember" />
        <p className="text-[10px] text-white/35">{r.caveat}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {r.thorough?.rating != null && (
        <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
          <RatingNumber value={r.thorough.rating} size="md" outOf />
          <span className="text-[11px] text-white/60"><span className="block text-[12px] font-semibold text-white/90">Thorough</span>{r.thorough.why}</span>
        </div>
      )}
      {r.verdict && <p className="text-sm text-white/85">{r.verdict}</p>}
      <Lines title="Working" rows={r.working} tone="text-emerald-200/90" />
      <Whys title="Change" rows={r.change} />
      <Lines title="Your next session" rows={r.next} />
      {r.caution && <p className="text-[12px] text-mcz-ember">⚠ {r.caution}</p>}
      <p className="text-[10px] text-white/35">{r.caveat}</p>
    </div>
  );
}

function Actions({ row, onDeleted }) {
  const [msg, setMsg] = useState("");
  async function download() {
    try { saveText(await api(`/api/economy/bodiez/ai/${row.id}/?export=txt`)); }
    catch (e) { setMsg(e.message || "Couldn't make the file."); }
  }
  async function remove() {
    if (!window.confirm("Delete this read? It can't be brought back.")) return;
    try { await api(`/api/economy/bodiez/ai/${row.id}/`, { method: "DELETE" }); onDeleted?.(); }
    catch (e) { setMsg(e.message || "Couldn't delete it."); }
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <button className="neon-btn-ghost !w-auto px-2.5 py-1 inline-flex items-center gap-1" onClick={download}>
        <Download size={12} /> Download <span className="text-emerald-300">Free</span>
      </button>
      <button className="text-white/35 hover:text-mcz-ember" onClick={remove} aria-label="Delete this read"><Trash2 size={13} /></button>
      {msg && <span className="text-mcz-ember">{msg}</span>}
    </div>
  );
}

/** "AI read" on a workout, routine or muscle — the price beside it, the result under it. */
export function AskAI({ scope, id, disabled = false }) {
  const { state, reload } = useAI();
  const [busy, setBusy] = useState(false);
  const [row, setRow] = useState(null);
  const [msg, setMsg] = useState("");
  if (!state) return null;
  async function ask() {
    setBusy(true); setMsg(""); setRow(null);
    try { setRow(await api("/api/economy/bodiez/ai/read/", { method: "POST", body: { scope, id } })); reload(); }
    catch (e) { setMsg(e.message || "The AI read didn't come back. Nothing was charged."); }
    finally { setBusy(false); }
  }
  return (
    <div className="w-full space-y-2">
      <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px]">
        <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                disabled={busy || disabled || !state.configured || !state.affordable} onClick={ask}
                title={state.read_note}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />} AI read
        </button>
        <ReadPrice /> <span className="text-white/35">· not charged if it can't be done</span>
      </span>
      {!state.configured && <p className="text-[11px] text-mcz-gold">The AI coach isn't switched on yet.</p>}
      {!state.affordable && <p className="text-[11px] text-mcz-ember">Today's free prompts are spent and a read costs more than you hold.</p>}
      {msg && <p role="alert" className="text-[11px] text-mcz-ember">{msg}</p>}
      {row && (
        <div className="space-y-2 rounded-lg border border-mcz-cyan/25 bg-white/[0.03] p-3">
          <ReadResult row={row} />
          <Actions row={row} onDeleted={() => { setRow(null); reload(); }} />
          <p className="text-[10px] text-white/40">Kept in the AI coach tab.</p>
        </div>
      )}
    </div>
  );
}

/** One video of one set, watched and scored. */
export function FormCheck({ exercises }) {
  const { state, reload } = useAI();
  const [exerciseId, setExerciseId] = useState("");
  const [file, setFile] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [row, setRow] = useState(null);
  const [msg, setMsg] = useState("");
  if (!state) return null;
  const tooBig = file && file.size > state.max_mb * 1024 * 1024;
  async function send() {
    setBusy(true); setMsg(""); setRow(null);
    const fd = new FormData();
    fd.append("video", file); fd.append("exercise_id", exerciseId);
    fd.append("confirm", confirm ? "true" : ""); if (note.trim()) fd.append("note", note.trim());
    try {
      const r = await api("/api/economy/bodiez/ai/form/", { method: "POST", body: fd });
      if (r.unreadable) setMsg(r.detail); else { setRow(r); reload(); }
    } catch (e) { setMsg(e.message || "The form check didn't come back. Nothing was charged."); }
    finally { setBusy(false); }
  }
  const sorted = [...(exercises || [])].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="re-card space-y-3" data-tour="bodiez-form-check">
      <p className="flex items-center gap-2 font-semibold"><Video size={16} className="text-mcz-cyan" /> Form check</p>
      <p className="text-sm text-white/60">{state.form_note}</p>
      <ul className="grid gap-x-4 text-[11px] text-white/50 sm:grid-cols-2">
        {Object.entries(state.form_scores || {}).map(([k, label]) => (
          <li key={k}><span className="text-white/75">{label}</span> — {state.form_means?.[k]}</li>
        ))}
      </ul>
      <select aria-label="Which lift" data-nomemo="true" className="neon-input" value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}>
        <option value="">Which lift is in the video?</option>
        {sorted.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
      </select>
      <input type="file" accept="video/*" capture="environment" className="block text-sm text-white/70"
             onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="Video of one set" />
      <p className="text-[11px] text-white/40">
        One set, the whole body and the weight in frame, side-on for most lifts. Up to {state.max_mb}MB.
      </p>
      {tooBig && <p className="text-[11px] text-mcz-ember">That video is over {state.max_mb}MB — trim it to one set.</p>}
      <input className="neon-input text-sm" maxLength={200} placeholder="Anything to look at? e.g. my knees (optional)"
             value={note} onChange={(e) => setNote(e.target.value)} aria-label="What to look at" />
      <label className="flex items-start gap-2 text-[12px] text-white/70">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5" />
        This is me, or someone who said I could send it.
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button className="neon-btn-primary !w-auto px-5 inline-flex items-center gap-1.5"
                disabled={busy || !file || tooBig || !exerciseId || !confirm || !state.configured || !state.affordable}
                onClick={send}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} Check my form
        </button>
        <span className="text-[11px]"><ReadPrice /> <span className="text-white/40">· {state.cost_note}</span></span>
      </div>
      {busy && <p className="text-[11px] text-white/50">Watching the set — up to two minutes for a long video.</p>}
      {!state.configured && <p className="text-[11px] text-mcz-gold">The AI coach isn't switched on yet.</p>}
      {msg && <p role="alert" className="text-[12px] text-mcz-ember">{msg}</p>}
      {row && (
        <div className="space-y-2 rounded-lg border border-mcz-cyan/25 bg-white/[0.03] p-3">
          <ReadResult row={row} />
          <Actions row={row} onDeleted={() => { setRow(null); reload(); }} />
        </div>
      )}
    </div>
  );
}

/** Every kept read, newest first, each one reopenable. */
export function AIReads() {
  const { state, reload } = useAI();
  const [open, setOpen] = useState(null);
  if (!state) return null;
  const reads = state.reads || [];
  return (
    <div className="re-card space-y-2">
      <p className="font-semibold">Your AI reads</p>
      {reads.length === 0 ? (
        <p className="text-sm text-white/50">
          None yet. Press <span className="text-white/75">AI read</span> on a workout or routine in RoutineZ, or on a
          muscle in BodyMap — or check a set's form above.
        </p>
      ) : reads.map((r) => (
        <div key={r.id} className="rounded-lg bg-white/[0.03]">
          <button className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                  onClick={() => setOpen(open === r.id ? null : r.id)}>
            <span>{r.title} <span className="text-[11px] text-white/40">· {r.kind_label} · {new Date(r.created_at).toLocaleDateString()}</span></span>
            {r.kind === "form" && r.result?.overall != null && <RatingNumber value={r.result.overall} exact={r.result.overall} size="sm" />}
          </button>
          {open === r.id && (
            <div className="space-y-2 border-t border-white/10 p-3">
              <ReadResult row={r} />
              <Actions row={r} onDeleted={() => { setOpen(null); reload(); }} />
            </div>
          )}
        </div>
      ))}
      {state.total > reads.length && <p className="text-[11px] text-white/40">Showing the newest {reads.length} of {state.total}.</p>}
    </div>
  );
}

/** The AI coach tab: what each read is, the form check, and everything kept. */
export function AICoachView({ exercises }) {
  const { state } = useAI();
  return (
    <div className="space-y-4">
      <div className="re-card space-y-1">
        <p className="font-semibold">AI coach</p>
        <p className="text-sm text-white/60">Two different reads, each priced before you press it:</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-white/65">
          <li><span className="text-white/85">AI read</span> — {state?.read_note || "reads what you logged."} It's on every workout and routine in RoutineZ and every muscle in BodyMap.</li>
          <li><span className="text-white/85">Form check</span> — {state?.form_note || "watches one video of one set."}</li>
        </ul>
        {state && <p className="text-[11px]">One read: <ReadPrice /> <span className="text-white/40">· {state.daily_prompts_left} of {state.daily_prompts} free prompts left today</span></p>}
      </div>
      <FormCheck exercises={exercises} />
      <AIReads />
    </div>
  );
}
