// What everyday engagement pays, before you do any of it.
//
// Rating, voting, commenting and answering a stranger are the four things a
// member does most, and they now pay — but a reward nobody knows about is a
// coincidence, and a coincidence changes nobody's behaviour. That is the
// forgotten half of the cost/gain rule: with a price, the member finds out by
// being billed; with a gain, they never find out at all.
//
// It renders the SERVER'S table (`/api/economy/karmaz/`) and computes nothing.
// A client that knew a vote pays 1 ⚡ against a 10/day cap would be the second
// place both numbers live, and the caps especially have to be the server's —
// a screen that promises ⚡ the server then declines to pay is worse than one
// that promised nothing.
//
// The counters matter more than the table. "10 a day" is a rule; "3 of 10 left
// today" is a reason to go and do something, and it is also how a member meets
// a cap by reading rather than by hitting it.
import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { api } from "./api.js";
import { asDict, asList } from "./shape.js";
import { ENERGY } from "./resources.js";

/** left-of-cap, shown only when there is a cap to be left of. */
function Allowance({ label, used, cap }) {
  if (cap == null) return null;
  const left = Math.max(0, cap - (used || 0));
  return (
    <span className="whitespace-nowrap text-[11px] text-white/55">
      {label}{" "}
      <b className={left ? "text-emerald-300" : "text-mcz-ember"}>{left}</b>
      <span className="text-white/35"> of {cap} left</span>
    </span>
  );
}

export default function KarmaRewards({ open: openDefault = false, className = "" }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(openDefault);

  useEffect(() => {
    let alive = true;
    api("/api/economy/karmaz/")
      .then((d) => alive && setData(d))
      // A failed fetch renders NOTHING. This panel is not something the member
      // asked for, so telling them it failed is an interruption about an
      // interruption — the same call OfferPanel makes, and for the same
      // reason. An empty rewards panel also reads as "engagement pays
      // nothing", which is the one wrong idea it exists to prevent.
      .catch(() => alive && setData(false));
    return () => { alive = false; };
  }, []);

  if (data === false) return null;
  if (!data) {
    return <p className={`flex items-center gap-2 text-[11px] text-white/35 ${className}`}>
      <Loader2 className="animate-spin" size={11} /> …
    </p>;
  }

  const rows = asList(data.rewards);
  const today = asDict(data.today);

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 ${className}`}
         data-tour="karma-rewards">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
          Today
        </span>
        <Allowance label="Ratings" used={today.rated} cap={today.rate_cap} />
        <Allowance label="Votes" used={today.voted} cap={today.vote_cap} />
        <Allowance label="Replies" used={today.replied} cap={today.cold_cap} />
        <button onClick={() => setOpen((o) => !o)}
                className="ml-auto flex items-center gap-1 text-[11px] text-mcz-cyan hover:underline">
          What pays
          <ChevronDown size={12} className={open ? "rotate-180" : ""} />
        </button>
      </div>

      {open && (
        <ul className="mt-2 space-y-1.5 border-t border-white/[0.07] pt-2">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
              {/* Green plus, resource emoji, never a bare number. `per` is
                  there because comment karma is paid PER net upvote rather
                  than as a flat amount, and "+1 ⚡" alone would read as a
                  much worse deal than it is. */}
              <span className="whitespace-nowrap font-semibold text-emerald-300">
                +{r.energy} {ENERGY}{r.per ? ` / ${r.per}` : ""}
              </span>
              <span className="text-white/75">{r.what}</span>
              {r.cap && <span className="text-white/40">({r.cap})</span>}
              {/* The reason each one is what it is. Written beside the numbers
                  on the server; a rule whose reason lives only in the code is
                  one the next person rewords into something that no longer has
                  one. */}
              {r.why && <p className="w-full text-[11px] text-white/35">{r.why}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
