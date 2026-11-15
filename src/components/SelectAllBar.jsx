import { useState } from "react";
import { Lock } from "lucide-react";
import { pickCount, pickEvery, pickState } from "../selectAll.js";
import { IN_SHELL } from "../standalone.js";
import { StatzSample, useStatzTrial } from "./StatzSample.jsx";

// The one "Select all / Clear" control. `all` is every key the list offers, `picked`
// the ones ticked, and `onChange` gets the next list. It decides nothing about what a
// pick costs or means — see selectAll.js for where it belongs and where it does not.
//
// SELECT ALL IS STATZ (Corey's call), or the running free sample. It is a tier on how
// FAST, never on whether: every row can still be ticked by hand at every tier, so
// nothing a member can do is taken away. Clear is never gated — a member must always
// be able to un-tick what is ticked. The lock is said on the control before it is
// pressed, with the sample beside it; a standalone shell sells nothing, so there the
// locked control is simply not drawn.

/** Whether this member may use the bulk controls, from the shared sample state. */
export function useSelectAllAllowed() {
  const { s } = useStatzTrial();
  return !!(s?.is_statz || s?.active);
}

export function SelectAllLocked({ label }) {
  const [open, setOpen] = useState(false);
  if (IN_SHELL) return null;
  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 underline text-mcz-gold/90">
        <Lock size={11} /> {label} · StatZ
      </button>
      {open && (
        <span className="basis-full">
          <StatzSample what="Select all" />
          <span className="block text-[11px] text-white/45">Ticking them one by one is free at every tier.</span>
        </span>
      )}
    </>
  );
}

export default function SelectAllBar({ all, picked, onChange, disabled = false, className = "", allLabel = "Select all" }) {
  const allowed = useSelectAllAllowed();
  if (!all || all.length < 2) return null;
  const state = pickState(all, picked);
  const n = pickCount(all, picked);
  return (
    <span className={`inline-flex flex-wrap items-center gap-3 text-[11px] ${className}`}>
      {state !== "all" && (allowed ? (
        <button type="button" disabled={disabled} className="underline text-mcz-cyan disabled:opacity-40"
                onClick={() => onChange(pickEvery(all, picked))}>
          {allLabel} ({all.length})
        </button>
      ) : <SelectAllLocked label={`${allLabel} (${all.length})`} />)}
      {n > 0 && (
        <button type="button" disabled={disabled} className="underline text-white/50 disabled:opacity-40"
                onClick={() => onChange((picked || []).filter((k) => !all.includes(k)))}>
          Clear ({n})
        </button>
      )}
    </span>
  );
}
