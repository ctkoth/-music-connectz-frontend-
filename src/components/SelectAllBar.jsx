import { pickCount, pickEvery, pickState } from "../selectAll.js";

// The one "Select all / Clear" control. `all` is every key the list offers, `picked`
// the ones ticked, and `onChange` gets the next list. It decides nothing about what a
// pick costs or means — see selectAll.js for where it belongs and where it does not.
export default function SelectAllBar({ all, picked, onChange, disabled = false, className = "", allLabel = "Select all" }) {
  if (!all || all.length < 2) return null;
  const state = pickState(all, picked);
  const n = pickCount(all, picked);
  return (
    <span className={`inline-flex flex-wrap items-center gap-3 text-[11px] ${className}`}>
      {state !== "all" && (
        <button type="button" disabled={disabled} className="underline text-mcz-cyan disabled:opacity-40"
                onClick={() => onChange(pickEvery(all, picked))}>
          {allLabel} ({all.length})
        </button>
      )}
      {n > 0 && (
        <button type="button" disabled={disabled} className="underline text-white/50 disabled:opacity-40"
                onClick={() => onChange((picked || []).filter((k) => !all.includes(k)))}>
          Clear ({n})
        </button>
      )}
    </span>
  );
}
