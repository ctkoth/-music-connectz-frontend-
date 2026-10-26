// "Change this routine to the equipment I have" — the whole routine at once.
//
// The per-row Change button already narrows the library by equipment, one lift at a
// time and across every muscle. This is the other direction: pick what you have today
// (a hotel gym, a garage with dumbbells) and see, before anything is replaced, what each
// lift would become. It decides nothing itself — the proposals are the library's own
// muscle and equipment tags run through `equipmentSwitch.js`, over the list the server
// says this member can do. Nothing here is saved until Save routine, and Undo puts the
// rows back. It costs nothing and earns nothing, so there is no price to state.
import { useMemo, useState } from "react";
import EquipmentPicker, { EQUIPMENT_LABEL, toggleEquipment } from "./EquipmentPicker.jsx";
import { MUSCLE_LABEL } from "./ExercisePicker.jsx";
import { planEquipmentSwitch, applyEquipmentSwitch } from "../equipmentSwitch.js";

export default function EquipmentSwitch({ rows, exercises, pool, onApply }) {
  const [equipment, setEquipment] = useState([]);
  const [picks, setPicks] = useState({});
  const [before, setBefore] = useState(null);
  const plan = useMemo(
    () => planEquipmentSwitch(rows, exercises, pool || exercises, equipment),
    [rows, exercises, pool, equipment],
  );
  const nameOf = (id) => exercises.find((x) => x.id === id)?.name || `#${id}`;
  const label = equipment.map((k) => EQUIPMENT_LABEL[k] || k).join(" / ");
  const n = plan.changes.length;

  const toggle = (k) => { setEquipment((c) => toggleEquipment(c, k)); setPicks({}); setBefore(null); };
  const apply = () => {
    const next = applyEquipmentSwitch(rows, plan.changes, picks);
    setBefore({ prev: rows, applied: next });
    onApply(next);
    setPicks({});
  };
  // Only while the rows are still exactly what the swap made: an Undo after further edits
  // would silently throw those edits away.
  const undo = () => { onApply(before.prev); setBefore(null); };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-tour="bodiez-equipment-switch">
      <p className="re-label">Change by equipment</p>
      <p className="text-[11px] text-white/45">
        Pick what you have today. Each lift that needs something else is offered a lift for the same muscle on
        the equipment you picked. Sets, reps and supersets stay. Weights are cleared for the lifts that change, because a
        barbell load is not a dumbbell load. You see every change before anything is replaced.
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
              you can do and that is not already in this routine.
            </p>
          ))}
          {n === 0 && plan.stuck.length === 0 && (
            <p className="text-[11px] text-emerald-300/80">
              {plan.unknown > 0 && plan.fits === 0
                ? "Nothing here can be matched to the library, so nothing is offered."
                : `Every lift here already uses ${label}.`}
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
        {before && rows === before.applied && (
          <button type="button" onClick={undo} className="text-xs text-mcz-cyan hover:underline">Undo</button>
        )}
        <span className="text-[11px] text-white/35">Free. Nothing is saved until Save routine.</span>
      </div>
    </div>
  );
}
