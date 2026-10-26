// "Change this routine to the equipment I have" — the whole routine at once.
//
// The per-row Change button already narrows the library by equipment, one lift at a
// time and across every muscle. This is the other direction: pick what you have today
// (a hotel gym, a garage with dumbbells) and see, before anything is replaced, what each
// lift would become. It decides nothing itself — the proposals are the library's own
// muscle and equipment tags run through `equipmentSwitch.js`, over the list the server
// says this member can do. Nothing here saves anything itself, and Undo puts the rows back.
// The routine designer saves with Save routine; the live Today screen uses it for THIS
// session only (`collapsible`, `locked`, `scopeNote`) and never touches the routine.
// It costs nothing and earns nothing, so there is no price to state.
import { useMemo, useState } from "react";
import EquipmentPicker, { EQUIPMENT_LABEL, toggleEquipment } from "./EquipmentPicker.jsx";
import { MUSCLE_LABEL } from "./ExercisePicker.jsx";
import { planEquipmentSwitch, applyEquipmentSwitch, sameLifts } from "../equipmentSwitch.js";

export default function EquipmentSwitch({ rows, exercises, pool, onApply, locked, collapsible = false,
                                         scopeNote = "Free. Nothing is saved until Save routine." }) {
  const [open, setOpen] = useState(!collapsible);
  const [equipment, setEquipment] = useState([]);
  const [picks, setPicks] = useState({});
  const [before, setBefore] = useState(null);
  const plan = useMemo(
    () => planEquipmentSwitch(rows, exercises, pool || exercises, equipment, locked),
    [rows, exercises, pool, equipment, locked],
  );
  const label = equipment.map((k) => EQUIPMENT_LABEL[k] || k).join(" / ");
  const n = plan.changes.length;

  const toggle = (k) => { setEquipment((c) => toggleEquipment(c, k)); setPicks({}); setBefore(null); };
  const apply = () => {
    const next = applyEquipmentSwitch(rows, plan.changes, picks);
    setBefore({ prev: rows, applied: next });
    onApply(next, "apply");
    setPicks({});
  };
  // Only while the rows are still exactly what the swap made: an Undo after further edits
  // would silently throw those edits away.
  const undo = () => { onApply(before.prev, "undo"); setBefore(null); };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} data-tour="bodiez-equipment-switch"
              className="text-xs text-mcz-cyan hover:underline">
        Different equipment today?
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-tour="bodiez-equipment-switch">
      <div className="flex items-center justify-between">
        <p className="re-label">Change by equipment</p>
        {collapsible && (
          <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-white/40 hover:text-white">Hide</button>
        )}
      </div>
      <p className="text-[11px] text-white/45">
        {collapsible
          ? "Pick what you have. Each lift that needs something else is swapped for one for the same muscle, and its target weight is cleared."
          : `Pick what you have today. Each lift that needs something else is offered a lift for the same muscle on
        the equipment you picked. Sets, reps and supersets stay. Weights are cleared for the lifts that change, because a
        barbell load is not a dumbbell load. You see every change before anything is replaced.`}
      </p>
      <EquipmentPicker selected={equipment} onToggle={toggle} />

      {equipment.length > 0 && rows.length > 0 && (
        <div className="space-y-1.5">
          {n > 0 && (
            <ul className="space-y-1">
              {plan.changes.map((c) => (
                <li key={c.index} className="flex flex-wrap items-center gap-1.5 text-xs text-white/70">
                  <span className="text-white/45 line-through decoration-white/20">{c.from.name}</span>
                  <span className="text-white/30">→</span>
                  <select aria-label={`Replace ${c.from.name} with`} data-nomemo="true"
                          value={picks[c.index] ?? c.pick}
                          onChange={(e) => setPicks((p) => ({ ...p, [c.index]: Number(e.target.value) }))}
                          className="max-w-[14rem] rounded-lg border border-white/[0.08] bg-black/40 px-1.5 py-1 text-[11px] text-white outline-none">
                    {c.options.slice(0, 10).map((o) => (
                      <option key={o.id} value={o.id}>{o.name} · {EQUIPMENT_LABEL[o.equipment] || o.equipment}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
          {plan.stuck.map((s) => (
            <p key={s.index} className="text-[11px] text-white/45">
              Kept {s.from.name} — no {label} lift for {MUSCLE_LABEL[s.from.muscle_group] || s.from.muscle_group} that
              you can do and that is not already in the plan.
            </p>
          ))}
          {n === 0 && plan.stuck.length === 0 && (
            <p className="text-[11px] text-emerald-300/80">
              {plan.unknown > 0 && plan.fits === 0
                ? "Nothing here can be matched to the library, so nothing is offered."
                : `Every lift here already uses ${label}.`}
            </p>
          )}
          {plan.locked > 0 && (
            <p className="text-[11px] text-white/35">
              {plan.locked} already started, so {plan.locked === 1 ? "it stays" : "they stay"} as {plan.locked === 1 ? "it is" : "they are"}.
            </p>
          )}
          {plan.fits > 0 && n > 0 && (
            <p className="text-[11px] text-white/35">{plan.fits} already use{plan.fits === 1 ? "s" : ""} {label} and stay as they are.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={n === 0} onClick={apply}
                className="neon-btn-primary !w-auto px-3 py-1.5 text-xs disabled:opacity-40">
          {n === 0 ? "Swap lifts" : `Swap ${n} lift${n === 1 ? "" : "s"}`}
        </button>
        {before && sameLifts(rows, before.applied) && (
          <button type="button" onClick={undo} className="text-xs text-mcz-cyan hover:underline">Undo</button>
        )}
        <span className="text-[11px] text-white/35">{scopeNote}</span>
      </div>
    </div>
  );
}
