// Find an exercise by typing, narrowed by muscle — and make one if it isn't
// there.
//
// The dropdown this replaces listed every exercise in one long <select>, which
// is a scroll rather than a search, and a library can never hold everything a
// member actually does (a sled push, a physio's drill, the machine at their own
// gym). So the picker is a combobox: type, and the list narrows; pick a muscle
// and it narrows again; and if what they typed is not there, the last row is
// "create it", already filled in with what they typed.
//
// What it suggests, in order: THEIR OWN history first (exercises they have done,
// most recent first — the thing they are most likely reaching for), then the
// rest, ranked by how well the name matches. With nothing typed it shows their
// history; with something typed it ranks matches. It never suggests anything
// the server did not send, and it is given only exercises the member's access
// settings allow, so a restriction is never undone from here.
//
// Custom exercises are the member's own and private to them. The tags they give
// one (needs arms, needs legs, positions) feed the same access filter the library
// uses, and the form defaults to the cautious answer.
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { EQUIPMENT_LABEL } from "./EquipmentPicker.jsx";
import { suggest } from "../exerciseSearch.js";

export const MUSCLE_LABEL = {
  abs: "Abs", back: "Back", biceps: "Biceps", cardio: "Cardio", chest: "Chest",
  forearms: "Forearms", glutes: "Glutes", shoulders: "Shoulders", triceps: "Triceps",
  upper_legs: "Upper Legs", lower_legs: "Lower Legs", full_body: "Full Body",
};
const POSITION_LABEL = { standing: "Standing", seated: "Seated", lying: "Lying", kneeling: "Kneeling", floor: "On the floor" };
const MAX_SHOWN = 8;

/** { create(body) -> exercise } — BodieZ provides it so every picker shares one writer. */
export const ExerciseCtx = createContext({ create: async () => { throw new Error("Can't create exercises here."); } });

export function CustomExerciseForm({ initialName = "", initialMuscle = "", onCreated, onUseExisting, onCancel }) {
  const { create } = useContext(ExerciseCtx);
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState(initialMuscle);
  const [equipment, setEquipment] = useState("");
  const [positions, setPositions] = useState(["standing"]);
  const [needsArms, setNeedsArms] = useState(true);
  const [needsLegs, setNeedsLegs] = useState(true);
  const [oneArm, setOneArm] = useState(false);
  const [oneLeg, setOneLeg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [existing, setExisting] = useState(null);
  const togglePos = (p) => setPositions((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const ready = name.trim().length >= 2 && muscle && equipment && positions.length > 0;

  async function save() {
    setBusy(true); setErr(""); setExisting(null);
    try {
      const ex = await create({
        name: name.trim(), muscle_group: muscle, equipment, positions,
        needs_arms: needsArms, needs_legs: needsLegs,
        one_arm_ok: needsArms && oneArm, one_leg_ok: needsLegs && oneLeg,
      });
      onCreated(ex);
    } catch (e) {
      setErr(e.message || "Couldn't save that exercise.");
      if (e.data?.existing_id) setExisting(e.data.existing_id);
    } finally { setBusy(false); }
  }

  const sel = "w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none";
  const box = "flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/80";
  return (
    <div className="space-y-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">New custom exercise</p>
        <button type="button" className="rounded p-1.5 text-white/50 hover:bg-white/10" onClick={onCancel} aria-label="Cancel">
          <X size={14} />
        </button>
      </div>
      <input aria-label="Exercise name" className="neon-input !py-2 w-full text-sm" placeholder="Exercise name" maxLength={80}
             value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <select aria-label="Muscle worked" className={`${sel} min-w-0 flex-1`} value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          <option value="">Muscle worked…</option>
          {Object.entries(MUSCLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select aria-label="Equipment" className={`${sel} min-w-0 flex-1`} value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          <option value="">Equipment…</option>
          {Object.entries(EQUIPMENT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <fieldset className="space-y-1">
        <legend className="re-label">How can it be done?</legend>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(POSITION_LABEL).map(([k, l]) => (
            <label key={k} className={`${box} cursor-pointer`}>
              <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={positions.includes(k)} onChange={() => togglePos(k)} /> {l}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="re-label">What does it need?</legend>
        <div className="flex flex-wrap gap-1.5">
          <label className={`${box} cursor-pointer`}>
            <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={needsArms} onChange={(e) => setNeedsArms(e.target.checked)} /> Uses my arms
          </label>
          <label className={`${box} cursor-pointer`}>
            <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={needsLegs} onChange={(e) => setNeedsLegs(e.target.checked)} /> Uses my legs
          </label>
          {needsArms && (
            <label className={`${box} cursor-pointer`}>
              <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={oneArm} onChange={(e) => setOneArm(e.target.checked)} /> Works with one arm
            </label>
          )}
          {needsLegs && (
            <label className={`${box} cursor-pointer`}>
              <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={oneLeg} onChange={(e) => setOneLeg(e.target.checked)} /> Works with one leg
            </label>
          )}
        </div>
        <p className="text-[11px] text-white/45">
          These decide whether it shows up when you tell BodieZ what your body can do. Private to you.
        </p>
      </fieldset>
      {err && (
        <p className="text-xs text-mcz-ember" role="alert">
          {err}{" "}
          {existing && <button type="button" className="underline" onClick={() => onUseExisting(existing)}>Use that one</button>}
        </p>
      )}
      <button type="button" className="neon-btn-primary !w-auto px-4 py-2 text-xs disabled:opacity-40" disabled={!ready || busy} onClick={save}>
        <Plus size={13} /> Save exercise
      </button>
    </div>
  );
}

/**
 * exercises: what the member may pick (already filtered by their access settings)
 * value: selected exercise id (string or "")   onChange(id string)
 * all: every exercise, for showing the name of a selection the filter hides
 */
export default function ExercisePicker({ exercises, all, value, onChange, label = "Exercise", compact = false }) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const rootRef = useRef(null);
  const chosen = value ? (all || exercises).find((e) => String(e.id) === String(value)) : null;

  // The input shows the chosen exercise's name; typing replaces the choice.
  useEffect(() => { if (chosen) setQuery(chosen.name); }, [chosen?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const away = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const typed = chosen && query === chosen.name ? "" : query;   // a chosen name is not a filter
  const results = useMemo(() => suggest(exercises, typed, muscle), [exercises, typed, muscle]);
  const shown = results.slice(0, MAX_SHOWN);
  const exact = exercises.some((e) => e.name.toLowerCase() === query.trim().toLowerCase());
  const canCreate = !chosen && query.trim().length >= 2 && !exact;
  const rows = [...shown.map((e) => ({ kind: "ex", e })), { kind: "create" }];

  const pick = (e) => { onChange(String(e.id)); setQuery(e.name); setOpen(false); setCreating(false); };
  const clear = () => { onChange(""); setQuery(""); setActive(0); };

  function onKey(ev) {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, rows.length - 1)); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (ev.key === "Enter" && open) {
      ev.preventDefault();
      const r = rows[active];
      if (r?.kind === "ex") pick(r.e); else if (r) { setCreating(true); setOpen(false); }
    } else if (ev.key === "Escape") setOpen(false);
  }

  const heading = !typed && !muscle ? (shown.some((e) => e.times_done > 0) ? "Your recent exercises" : "Exercises") : `${results.length} match${results.length === 1 ? "" : "es"}`;

  return (
    <div ref={rootRef} className="relative w-full space-y-1.5">
      <div className="flex gap-2">
        <select aria-label="Narrow by muscle" value={muscle} onChange={(e) => { setMuscle(e.target.value); setActive(0); setOpen(true); }}
                className="max-w-[40%] shrink-0 rounded-lg border border-white/[0.08] bg-black/40 px-2 py-2 text-xs text-white outline-none">
          <option value="">All muscles</option>
          {Object.entries(MUSCLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
          <input role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-label={label}
                 aria-activedescendant={open ? `${uid}-opt-${active}` : undefined}
                 className={`w-full rounded-lg border border-white/[0.08] bg-black/40 py-2 pl-8 pr-8 text-white outline-none ${compact ? "text-xs" : "text-sm"}`}
                 placeholder="Type to search exercises…" value={query} autoComplete="off"
                 onFocus={() => setOpen(true)} onKeyDown={onKey}
                 onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); if (value) onChange(""); }} />
          {query && (
            <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-white/50 hover:text-white" onClick={clear} aria-label="Clear exercise">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {open && !creating && (
        <ul id={listId} role="listbox" aria-label={heading}
            className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0d0b16] p-1 shadow-xl">
          <li role="presentation" className="px-2 py-1 text-[11px] uppercase tracking-wide text-white/50">{heading}</li>
          {shown.map((e, i) => (
            <li key={e.id} id={`${uid}-opt-${i}`} role="option" aria-selected={active === i}
                onMouseEnter={() => setActive(i)} onMouseDown={(ev) => { ev.preventDefault(); pick(e); }}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm ${active === i ? "bg-white/10 text-white" : "text-white/80"}`}>
              <span className="min-w-0 truncate">
                {e.name}
                {e.custom && <span className="ml-1.5 rounded-full bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] text-fuchsia-200">yours</span>}
              </span>
              <span className="shrink-0 text-[11px] text-white/55">
                {MUSCLE_LABEL[e.muscle_group]}{e.times_done > 0 ? ` · ${e.times_done}×` : ""}
              </span>
            </li>
          ))}
          {shown.length === 0 && <li role="presentation" className="px-2.5 py-2 text-xs text-white/55">No exercise matches{muscle ? ` in ${MUSCLE_LABEL[muscle]}` : ""}.</li>}
          {results.length > shown.length && (
            <li role="presentation" className="px-2.5 py-1 text-[11px] text-white/45">+{results.length - shown.length} more — keep typing to narrow</li>
          )}
          <li id={`${uid}-opt-${shown.length}`} role="option" aria-selected={active === shown.length}
              onMouseEnter={() => setActive(shown.length)} onMouseDown={(ev) => { ev.preventDefault(); setCreating(true); setOpen(false); }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-mcz-cyan ${active === shown.length ? "bg-white/10" : ""}`}>
            <Plus size={14} aria-hidden="true" />
            {canCreate ? <>Create “{query.trim()}” as a custom exercise</> : "Create a custom exercise"}
          </li>
        </ul>
      )}

      {creating && (
        <CustomExerciseForm initialName={canCreate ? query.trim() : ""} initialMuscle={muscle}
                            onCreated={(ex) => { pick(ex); }}
                            onUseExisting={(id) => { const e = (all || exercises).find((x) => x.id === id); if (e) pick(e); }}
                            onCancel={() => setCreating(false)} />
      )}
    </div>
  );
}
