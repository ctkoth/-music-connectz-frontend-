// What to do instead, when an earner is switched off.
//
// AdZ and OfferZ both said "being switched on — check back soon" and stopped
// there. That is a screen showing you a fact and giving you nowhere to take it
// — the exact dead end the cross-pollination rule exists to prevent — and it
// was the whole answer for a member sitting on 0 SpinaZ wondering why.
//
// Every row states its gain the way the cost/gain rule requires (green plus,
// resource emoji, never a bare number) and links to the control that earns it,
// not just the tab. The numbers come from /api/economy/earn/, so nothing here
// can drift from what the server actually pays.
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { api } from "./api.js";
import { goToSpot, goToTab } from "./goto.js";
import { ENERGY, PROMPTZ, SPINAZ } from "./resources.js";

const EMOJI = { spinaz: SPINAZ, energy: ENERGY, promptz: PROMPTZ };

export default function EarnInstead({ exclude = [], title = "Here's what pays right now" }) {
  const [ways, setWays] = useState(null);
  // What the SpinaZ in that list is FOR. A screen that lists five ways to earn
  // a currency and no door out of it is the same dead end it exists to fix —
  // and until SpinaZ could buy PromptZ there genuinely wasn't one.
  const [spend, setSpend] = useState([]);

  useEffect(() => {
    api("/api/economy/earn/")
      .then((d) => {
        setWays(Array.isArray(d?.available) ? d.available : []);
        setSpend(Array.isArray(d?.spend) ? d.spend : []);
      })
      .catch(() => setWays([]));
  }, []);

  if (!ways) {
    return <p className="flex items-center gap-2 text-[11px] text-white/40">
      <Loader2 className="animate-spin" size={12} /> Finding what pays…
    </p>;
  }

  const rows = ways.filter((w) => !exclude.includes(w.key));
  if (!rows.length && !spend.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">{title}</p>
      <ul className="space-y-1.5">
        {rows.map((w) => (
          <li key={w.key}>
            <button
              className="group flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-ember/40"
              onClick={() => (w.target ? goToSpot(w.tab, w.target) : goToTab(w.tab))}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-white/85">{w.label}</span>
                {(w.note || w.cap) && (
                  <span className="block truncate text-[10px] text-white/35">
                    {[w.note, w.cap && `Up to ${w.cap}`].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {w.gain > 0 && (
                  <span className="text-[12px] font-bold text-emerald-300">
                    +{w.gain} {EMOJI[w.resource] || ""}
                  </span>
                )}
                <ArrowRight size={13} className="text-white/25 group-hover:text-mcz-ember" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {spend.length > 0 && (
        <>
          <p className="pt-1 text-[11px] font-semibold uppercase tracking-widest text-white/45">
            And what it buys
          </p>
          <ul className="space-y-1.5">
            {spend.map((s) => (
              <li key={s.key}>
                <button
                  className="group flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-ember/40"
                  onClick={() => (s.target ? goToSpot(s.tab, s.target) : goToTab(s.tab))}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-white/85">{s.label}</span>
                    {s.note && (
                      <span className="block truncate text-[10px] text-white/35">{s.note}</span>
                    )}
                  </span>
                  {/* The rate, both halves, before the button is pressed. */}
                  <span className="flex shrink-0 items-center gap-2 text-[12px] font-bold">
                    <span className="text-mcz-ember">
                      −{s.cost?.amount} {EMOJI[s.cost?.resource] || ""}
                    </span>
                    <span className="text-emerald-300">
                      +{s.gain?.amount} {EMOJI[s.gain?.resource] || ""}
                    </span>
                    <ArrowRight size={13} className="text-white/25 group-hover:text-mcz-ember" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
