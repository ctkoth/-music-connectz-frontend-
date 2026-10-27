import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { api } from "../api.js";
import { StatzSample, useStatzTrial } from "./StatzSample.jsx";

// "Supersets: none · compound + isolation · push + pull" — an OPTION on whatever the Planner is making or improving, so the
// pairing is chosen where the routine is made instead of in a separate step afterwards. It is the same two pairings and the same
// gate as `PairWithCoach` (the Coach CHOOSING the partner is StatZ's, or the free sample's; linking two lifts by hand is free at
// every tier and says so). It decides nothing: the modes, what each means and the example are `/api/economy/bodiez/pair/`'s, and
// the pairing itself is the server's. Without the gate it says so and offers the sample, never a refusal found by pressing.
let cached = null;

export default function PairMode({ value, onChange, disabled = false, className = "" }) {
  const { s } = useStatzTrial();
  const allowed = !!(s?.is_statz || s?.active);
  const [offer, setOffer] = useState(cached);
  useEffect(() => {
    if (cached) return undefined;
    let on = true;
    api("/api/economy/bodiez/pair/").then((o) => { cached = o; if (on) setOffer(o); }).catch(() => {});
    return () => { on = false; };
  }, []);
  // No modes means the endpoint was not there: render nothing rather than a control that cannot do what it says.
  if (!offer?.modes?.length) return null;
  const chosen = offer.modes.find((m) => m.key === value);
  const chip = (on) => `pill !py-1 text-[11px] ${on ? "pill-on" : "hover:text-white"} disabled:opacity-40`;
  return (
    <div className={`space-y-1.5 ${className}`} data-testid="pair-mode" data-tour="bodiez-pair-mode">
      <p className="re-label flex items-center gap-1.5"><Link2 size={12} /> Supersets</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Supersets">
        <button type="button" className={chip(!value)} disabled={disabled} aria-pressed={!value} onClick={() => onChange("")}>None</button>
        {offer.modes.map((m) => (
          <button key={m.key} type="button" className={chip(value === m.key)} disabled={disabled || !allowed} aria-pressed={value === m.key}
                  title={`${m.what} e.g. ${m.example}`} onClick={() => onChange(value === m.key ? "" : m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      {chosen && <p className="text-[11px] text-white/50">{chosen.what} <span className="text-white/35">e.g. {chosen.example}</span></p>}
      {!allowed && (
        <div className="space-y-1">
          <StatzSample what="Planner supersets" />
          <p className="text-[11px] text-white/45">{offer.manual} Use the link control on a lift's row.</p>
        </div>
      )}
      {allowed && <p className="text-[11px] text-white/35">Free · the Planner adds a partner only where a lift has none, and says which.</p>}
    </div>
  );
}
