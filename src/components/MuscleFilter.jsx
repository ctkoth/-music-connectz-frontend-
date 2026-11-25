import { cycle, stateOf, isActive, EMPTY } from "../muscleFilter.js";
import { MUSCLE_LABEL } from "../apps/ExercisePicker.jsx";

// Tri-state muscle chips: tap once to show ONLY that muscle, again to HIDE it, again to clear.
// `muscles` is the list to offer (defaults to every muscle the library has). Decides nothing —
// the parent applies it, and SessionZ sends it to the server.
export default function MuscleFilter({ value, onChange, muscles }) {
  const list = muscles || Object.entries(MUSCLE_LABEL).map(([k, l]) => [k, l]);
  return (
    <div className="space-y-1" data-tour="muscle-filter">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Muscles">
        {list.map(([k, label]) => {
          const st = stateOf(value, k);
          return (
            <button key={k} onClick={() => onChange(cycle(value, k))}
                    aria-label={`${label}: ${st === "only" ? "showing only" : st === "hide" ? "hidden" : "all"}`}
                    className={`pill !py-1 text-xs ${st === "only" ? "!border-emerald-400/60 !text-emerald-300" : st === "hide" ? "!border-mcz-ember/60 !text-mcz-ember line-through" : ""}`}>
              {st === "only" ? "✓ " : st === "hide" ? "✕ " : ""}{label}
            </button>
          );
        })}
        {isActive(value) && <button className="text-xs text-mcz-cyan hover:underline" onClick={() => onChange(EMPTY)}>Show all</button>}
      </div>
      <p className="text-[11px] text-white/40">Tap once to show only that muscle, twice to hide it, three times to clear.</p>
    </div>
  );
}
