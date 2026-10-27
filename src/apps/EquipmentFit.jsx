// "I have dumbbells and a band — make this routine use only those." The Planner (free: no AI, no 🏷️)
// swaps each lift that needs other gear for one in the same muscle group that uses only what was picked,
// and the member sees every swap, with its reason, before anything is saved. The rules live in
// equipmentFit.js; this only draws them and asks for the member's call where the Planner cannot make one.
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import EquipmentPicker, { EQUIPMENT_LABEL, toggleEquipment } from "./EquipmentPicker.jsx";
import { MUSCLE_LABEL } from "./ExercisePicker.jsx";
import { applyFit, fitRoutine, showByEquipment, stillOff } from "../equipmentFit.js";
import { checkMoves, moveText, stillYours } from "../planRating.js";
import PairMode from "../components/PairMode.jsx";

const KEY = "bodiez.fitEquipment";
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.filter((k) => k in EQUIPMENT_LABEL) : []; } catch { return []; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* not remembered */ } };

export default function EquipmentFit({ routine, exercises, pickable, onApply, onSaveNew, onStart, sessionOpen, onClose }) {
  const [equipment, setEquipmentRaw] = useState(read);
  // Reset the member's per-row choices in the handler that changes what they were choices ABOUT, never in an effect after it.
  const [choices, setChoices] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const setEquipment = (next) => { setEquipmentRaw(next); write(next); setChoices({}); setDone(""); setErr(""); };

  const rows = useMemo(() => (Array.isArray(routine.exercises) ? routine.exercises : []).slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [routine]);
  const plan = useMemo(() => fitRoutine({ rows, exercises, pickable, equipment }), [rows, exercises, pickable, equipment]);
  const result = useMemo(() => applyFit(plan, choices), [plan, choices]);
  const off = stillOff({ plan, choices, exercises, equipment });
  const ticket = useRef(0);
  const label = equipment.map((k) => EQUIPMENT_LABEL[k]).join(" + ");
  // A row counts as changed when the result differs from what was in the routine — an explicit "keep" is not a swap.
  const changed = plan.filter((p) => {
    if (p.ok) return false;
    const pick = choices[p.index];
    if (pick === "remove") return true;
    const id = pick != null ? pick : p.best?.id;
    return id != null && id !== p.row.exercise_id;
  }).length;
  const nothingToDo = equipment.length === 0 || (changed === 0);
  const lib = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const shown = showByEquipment({ pickable, equipment });

  // The Plan, before anything is saved: the server judges the swapped list, applies the Planner's own fix (big lifts
  // first, reps and sets inside the goal's range) and says how the routine's score moves and which check moved it. A slower
  // old answer must never overwrite a newer one, hence the ticket.
  const [pairMode, setPairMode] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewErr, setPreviewErr] = useState("");
  const resultKey = JSON.stringify(result.map((r) => [r.exercise_id, r.sets, r.reps, r.group || ""]));
  useEffect(() => {
    if (equipment.length === 0 || changed === 0) { setPreview(null); setPreviewErr(""); return undefined; }
    const mine = ++ticket.current;
    const t = setTimeout(() => {
      api("/api/economy/bodiez/routines/plan/", {
        method: "POST", body: { exercises: result, goal: routine.goal || "", polish: true, compare_to: routine.id, equipment,
                                ...(pairMode ? { pair_mode: pairMode } : {}) } })
        .then((d) => { if (mine === ticket.current) { setPreview(d); setPreviewErr(""); } })
        .catch(() => { if (mine === ticket.current) { setPreview(null); setPreviewErr("Couldn't check the Plan, so only your swaps will be saved."); } });
    }, 250);
    return () => clearTimeout(t);
  }, [resultKey, routine.id, routine.goal, equipment.length, changed, pairMode]); // eslint-disable-line react-hooks/exhaustive-deps
  // What is saved is the Planner's list when it could be made (the member just saw every change in it), else the swaps alone.
  const toSave = preview?.polished?.exercises || result;

  const run = async (fn) => {
    setBusy(true); setErr(""); setDone("");
    try { return await fn(); } catch (e) { setErr(e?.message || "Couldn't save that. Nothing was changed."); return false; }
    finally { setBusy(false); }
  };
  const apply = async () => {
    const moved = preview?.polished?.compare;
    if (await run(() => onApply(toSave))) setDone(`Updated this routine.${moved ? ` Plan ${moveText(moved)}.` : ""}`);
  };
  const saveNew = async () => {
    const name = (title || `${routine.title} — ${label}`).trim().slice(0, 80);
    if (await run(() => onSaveNew(name, toSave))) setDone(`Saved “${name}” as a new routine.`);
  };

  return (
    <div className="space-y-2 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.04] p-3 text-xs text-white/75" data-testid="equipment-fit">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">Fit “{routine.title}” to my equipment</p>
        {onClose && <button type="button" className="text-white/40 hover:text-white" onClick={onClose} aria-label="Close">✕</button>}
      </div>
      <p className="text-white/55">
        Pick what you have. The Planner swaps any lift that needs other gear for one in the same muscle group that
        uses only what you picked — free, no AI. You see every swap first and can change it.
      </p>
      <EquipmentPicker selected={equipment} onToggle={(k) => setEquipment(toggleEquipment(equipment, k))} />

      {equipment.length === 0 ? (
        <p className="text-white/45">Nothing is picked, so nothing changes. Pick the equipment you have.</p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {plan.map((p) => {
              const cur = lib[p.row.exercise_id];
              const name = cur?.name || `Exercise #${p.row.exercise_id}`;
              if (p.ok) {
                return <li key={p.index} className="text-white/45">✓ {name} <span className="text-white/30">— already {EQUIPMENT_LABEL[cur?.equipment] || "fits"}</span></li>;
              }
              const picked = choices[p.index];
              return (
                <li key={p.index} className="space-y-1 rounded bg-white/5 p-2">
                  <p className="text-white">
                    {name} <span className="text-white/40">({EQUIPMENT_LABEL[cur?.equipment] || "?"})</span>
                    {p.best || picked != null ? <span className="text-mcz-cyan"> →</span> : null}
                  </p>
                  {p.candidates.length > 0 ? (
                    <>
                      <select data-nomemo="true" aria-label={`Replace ${name}`} className="neon-input !py-1.5 w-full text-xs"
                              value={String(picked ?? p.best?.id ?? p.row.exercise_id)}
                              onChange={(e) => setChoices((c) => ({ ...c, [p.index]: e.target.value === "remove" ? "remove" : Number(e.target.value) }))}>
                        {p.candidates.map((c) => <option key={c.id} value={c.id}>{c.name} ({EQUIPMENT_LABEL[c.equipment]})</option>)}
                        <option value={p.row.exercise_id}>Keep {name} as it is</option>
                        <option value="remove">Remove it from the routine</option>
                      </select>
                      {p.why && picked == null && <p className="text-[11px] text-white/40">{p.why}</p>}
                    </>
                  ) : (
                    <>
                      <p className="text-amber-200">
                        Nothing in {label} works {MUSCLE_LABEL[cur?.muscle_group] || "that muscle"} in the library, so it stays as it is.
                      </p>
                      <button type="button" className="text-[11px] text-mcz-cyan hover:underline"
                              onClick={() => setChoices((c) => ({ ...c, [p.index]: c[p.index] === "remove" ? undefined : "remove" }))}>
                        {picked === "remove" ? "Keep it after all" : "Remove it from the routine"}
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="text-white/50">
            {changed} swapped · {plan.filter((p) => !p.ok).length - changed} kept{off.length ? ` · ${off.length} still need other gear` : ""}.
            {" "}A swapped lift's weight is cleared — a barbell number isn't a dumbbell number — and your last weight for the new lift fills in when you log it.
          </p>

          <PairMode value={pairMode} onChange={setPairMode} disabled={busy} />
          {preview?.polished?.pair?.blocked && <p className="text-amber-200">{preview.polished.pair.detail}</p>}
          {preview?.polished && (
            <div className="space-y-1 rounded bg-white/5 p-2" data-testid="fit-plan">
              <p className="font-semibold text-white">
                Plan {moveText(preview.polished.compare)}
                <span className="font-normal text-white/45"> — {preview.polished.plan.passed} of {preview.polished.plan.applicable} checks after the swaps</span>
              </p>
              {preview.polished.changes.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-4 text-white/65">
                  {preview.polished.changes.map((c, i) => <li key={i}>{c.what}</li>)}
                </ul>
              )}
              {checkMoves(preview.polished.compare).map((m) => (
                <p key={m.key} className="text-white/45">{m.text}{m.why ? ` — ${m.why}` : ""}</p>
              ))}
              {stillYours(preview.polished.plan).length > 0 && (
                <p className="text-amber-200">Still yours to fix: {stillYours(preview.polished.plan).map((c) => c.detail).join(" ")}</p>
              )}
              <p className="text-white/35">{preview.caveat}</p>
            </div>
          )}
          {previewErr && <p className="text-amber-200">{previewErr}</p>}

          <details>
            <summary className="cursor-pointer text-mcz-cyan">Just show me everything I can do with {label}</summary>
            <div className="mt-1.5 space-y-1">
              {Object.entries(shown).map(([m, list]) => (
                <p key={m}><b className="text-white/70">{MUSCLE_LABEL[m] || m}:</b> {list.map((e) => e.name).join(", ")}</p>
              ))}
              {Object.keys(shown).length === 0 && <p className="text-white/45">Nothing you can use with that.</p>}
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
            <button type="button" className="neon-btn-primary !w-auto px-3 py-1.5 text-xs" disabled={busy || nothingToDo} onClick={apply}
                    title="Replaces this routine's lifts. Save as a new routine to keep the original.">
              Edit this routine
            </button>
            <input aria-label="Name for the new routine" className="neon-input !py-1.5 min-w-0 flex-1 basis-40 text-xs" maxLength={80}
                   placeholder={`${routine.title} — ${label}`} value={title} onChange={(e) => setTitle(e.target.value)} />
            <button type="button" className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" disabled={busy || nothingToDo} onClick={saveNew}>
              Save as a new routine
            </button>
            <span className="text-white/40">Free · nothing is saved until you press one.</span>
          </div>
        </>
      )}
      {err && <p role="alert" className="text-mcz-ember">{err}</p>}
      {done && (
        <p className="flex flex-wrap items-center gap-2 text-emerald-300">
          {done}
          {onStart && !sessionOpen && <button type="button" className="rounded-full border border-emerald-300/40 px-3 py-0.5 text-[11px]" onClick={() => onStart(routine.id)}>Start “{routine.title}”</button>}
        </p>
      )}
    </div>
  );
}
