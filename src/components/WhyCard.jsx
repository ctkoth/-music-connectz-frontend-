import { useEffect, useState } from "react";
import { api } from "../api.js";
import { openDoor } from "../doors.js";
import { shellHas } from "../standalone.js";

// Why a member is here, said back to them with their own proof.
//
// A platform that never says what it did for you is one nobody can explain to a
// friend — and a member who can't explain it won't share it. Each reason shows the
// proof that is TRUE for this member (takes scored, a climb, cards opened, 🍥
// earned, a streak) or, where there is none yet, the free way to find out. The
// server words it and never invents a number; a failed fetch renders nothing.
export default function WhyCard() {
  const [d, setD] = useState(null);
  useEffect(() => { api("/api/economy/whyz/").then(setD).catch(() => {}); }, []);
  if (!d?.reasons?.length) return null;
  const rows = d.reasons.filter((r) => shellHas(r.tab));
  if (!rows.length) return null;
  return (
    <div className="space-y-2 rounded-xl border border-mcz-cyan/20 bg-mcz-cyan/[0.04] p-3 text-[12px]" data-tour="whyz">
      <p className="text-[11px] uppercase tracking-wide text-mcz-cyan/90">Why you're here</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <button key={r.key} type="button" onClick={() => openDoor({ tab: r.tab, target: r.target, carry: {} })}
                  className="rounded-lg bg-white/5 p-2 text-left hover:bg-white/10">
            <span className="block font-semibold text-white/90">{r.headline}</span>
            {r.proof
              ? <span className="block text-emerald-300">{r.proof}</span>
              : <span className="block text-white/55">{r.try_it}</span>}
            <span className="block text-[11px] text-white/45">{r.line}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
