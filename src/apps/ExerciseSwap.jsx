// One way to change an exercise, everywhere BodieZ picks one for the member.
// Equipment chips narrow the list (the same toggles every other filter uses),
// the shared ExercisePicker chooses, and the caller decides what a swap MEANS
// (today only, this routine, this preview). Nothing here saves anything.
import { useMemo, useState } from "react";
import EquipmentPicker, { toggleEquipment } from "./EquipmentPicker.jsx";
import ExercisePicker from "./ExercisePicker.jsx";

export function ExerciseSwap({ current, all, choices, onPick, note }) {
  const [equipment, setEquipment] = useState([]);
  return (
    <div className="space-y-2 rounded-lg bg-black/30 p-2">
      {note && <p className="text-[11px] text-white/50">{note}</p>}
      <EquipmentPicker selected={equipment} onToggle={(k) => setEquipment((c) => toggleEquipment(c, k))} />
      <ExercisePicker compact label="Change exercise" all={all} value={String(current)}
                      exercises={choices.filter((x) => equipment.length === 0 || equipment.includes(x.equipment))}
                      onChange={(id) => { if (id) onPick(Number(id)); }} />
    </div>
  );
}

// For a list the app GENERATED (the three builders): swaps are kept by the
// original pick's id, applied to the list, and never leave the preview.
export function useSwappedPicks(picks, exercises, pickable) {
  const [swaps, setSwaps] = useState({});
  const out = useMemo(() => picks.map((p) => {
    const id = swaps[p.id];
    return (id && exercises.find((x) => x.id === id)) || p;
  }), [picks, swaps, exercises]);
  const choicesFor = (idx) => (pickable || exercises).filter((x) => x.id === out[idx]?.id || !out.some((p) => p.id === x.id));
  const swapAt = (idx, id) => setSwaps((cur) => ({ ...cur, [picks[idx].id]: id }));
  return { picks: out, choicesFor, swapAt, swapped: (idx) => out[idx]?.id !== picks[idx]?.id };
}

// One row of a generated list: name, demo link slot, and a Change toggle.
export function SwapRow({ label, extra, className = "", exercises, choices, current, onPick, swapped }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <div className={`flex items-center justify-between gap-2 ${className}`}>
        <span>{label}{swapped && <span className="ml-1.5 text-[10px] text-mcz-cyan/80">changed</span>}</span>
        <span className="flex shrink-0 items-center gap-2">
          {extra}
          <button type="button" className="rounded px-1.5 text-[11px] text-mcz-cyan hover:bg-white/10"
                  onClick={() => setOpen(!open)}>{open ? "Done" : "Change"}</button>
        </span>
      </div>
      {open && <ExerciseSwap current={current} all={exercises} choices={choices} onPick={onPick}
                             note="Use a different exercise here before saving." />}
    </div>
  );
}
