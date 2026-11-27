// The neon glow colour — which colours a member may pick from is the tier's number (`glow_colors`:
// Free 3, Premium 6, StatZ unlimited). It decides nothing: the count and the next plan's number come
// from /limits/. Colours beyond the count are SHOWN, locked, with the plan that has them, because a
// choice the member cannot see is one they cannot want.
import PlansLink from "./PlansLink.jsx";
import { useEffect, useState } from "react";
import { PALETTE, apply, effective, load, room, save } from "../glow.js";
import { loadLimits } from "../limits.js";

export default function GlowColor() {
  const [lim, setLim] = useState(null);
  const [pick, setPick] = useState(load);
  useEffect(() => { let on = true; loadLimits().then((d) => on && setLim(d)); return () => { on = false; }; }, []);
  const cap = lim && "glow_colors" in lim ? lim.glow_colors : undefined;
  const ready = !!lim && cap !== undefined;
  const n = room(cap);
  const next = lim?.tier === "free" ? (lim?.tiers?.premium?.glow_colors ?? null) : null;

  // The page follows the choice, and follows the plan: a lapse stops applying a colour the plan no
  // longer holds (the choice itself is kept on the device).
  useEffect(() => { if (ready) apply(effective(pick, cap)); }, [pick, cap, ready]);

  const choose = (c, locked) => {
    if (locked) return;
    const same = pick === c.key;
    setPick(same ? "" : c.key);
    save(same ? "" : c.key);
  };

  if (!ready) return null;
  return (
    <div className="space-y-2" data-tour="glow-color">
      <p className="re-label">Glow color</p>
      <p className="text-[11px] text-white/55">
        Your plan has {cap == null ? "every color" : `${cap} of ${PALETTE.length}`}
        {cap != null && (next ? ` — Premium has ${next}, StatZ has every one.` : " — StatZ has every one.")}
        {" "}Free to change; it only changes the neon on your screen, on this device.
        {cap != null && <PlansLink />}
      </p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Glow color">
        {PALETTE.map((c, i) => {
          const locked = i >= n;
          const on = pick === c.key && !locked;
          return (
            <button key={c.key} type="button" role="radio" aria-checked={on} disabled={locked} data-nomemo="true"
                    onClick={() => choose(c, locked)}
                    title={locked ? `${c.label} — on a higher plan` : on ? `${c.label} — press again for the default` : c.label}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${on ? "border-white text-white" : "border-white/15 text-white/70"} ${locked ? "opacity-40" : "hover:border-white/50"}`}>
              <span className="h-3 w-3 rounded-full" style={{ background: c.hex, boxShadow: locked ? "none" : `0 0 8px ${c.hex}` }} />
              {c.label}{locked && " 🔒"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
