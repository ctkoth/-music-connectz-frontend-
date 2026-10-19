import { useEffect, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { api } from "./api.js";
import { ENERGY, SPINAZ, PROMPTZ, MONEY, XP } from "./resources.js";
import { goToSpot } from "./goto.js";

// FunnelZ offers — the promotions, on screen, and the reason this component is
// small is that it decides nothing.
//
// Who sees which offer is entirely `/api/economy/offerz/funnel/`. A client that
// knew a free member should be shown the Premium ladder would be the second
// place that targeting rule lives, and the two would disagree within a year —
// the same reason a tier number never gets typed into a screen, applied to the
// question of WHO rather than HOW MUCH.
//
// Three things it does do, and each is one of the server's five rules made
// visible:
//
// * **The price sits on the button.** A promotion is the one place it's most
//   tempting to lead with the gain and put the cost in the small print. The
//   cost renders in ember, immediately beside the CTA, before it's pressed.
// * **The X is real.** Dismissing posts to the server and the offer never comes
//   back. An offer that reappears after being closed is not a promotion, it's
//   an obstruction, and a member's only answer to it is to stop opening the app.
// * **The CTA lands on the CONTROL.** `goToSpot(tab, target)`, not a tab
//   switch — "go to MembershipZ" is where a funnel dies, because the member
//   arrives at the top of a screen they've never seen, hunts, and leaves.

const EMOJI = { energy: ENERGY, spinaz: SPINAZ, promptz: PROMPTZ, money: MONEY, xp: XP };

/** `+300 🍥` / `−10 🏷️`, in the two colours the rule names and nothing else. */
function Line({ line }) {
  const minus = line.sign === "−";
  // A zero amount means "there's a gain but it isn't a number" — a streak kept,
  // a price that's a percentage. The emoji still shows so the member can see
  // WHICH resource is involved; inventing a figure to fill the slot would be
  // the substance rule's failure case with a promotion attached.
  return (
    <span className={minus ? "font-semibold text-mcz-ember" : "font-semibold text-emerald-300"}>
      {line.amount ? `${line.sign}${line.amount} ` : ""}{EMOJI[line.resource] || ""}
    </span>
  );
}

function Offer({ o, onDismiss }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-black/30 p-3">
      <button onClick={() => onDismiss(o.key)}
              aria-label="Dismiss this offer"
              title="Close this — it won't come back"
              className="absolute right-2 top-2 rounded-lg p-1 text-white/25 hover:bg-white/5 hover:text-white/60">
        <X size={13} />
      </button>

      <p className="pr-6 font-display font-bold" style={{ color: "#ffcf3f" }}>{o.title}</p>
      {o.body && <p className="pt-0.5 text-xs leading-relaxed text-white/60">{o.body}</p>}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button className="neon-btn !px-3 !py-1 text-xs"
                onClick={() => goToSpot(o.tab, o.target)}>
          {o.cta} <ArrowRight size={11} className="inline" />
        </button>

        {/* Beside the button, never in the result. If the member has to press
            it to learn the price, it's wrong. */}
        {(o.cost?.length > 0 || o.gain?.length > 0) && (
          <span className="text-sm">
            {o.cost?.map((l, i) => <Line key={`c${i}`} line={l} />)}
            {o.cost?.length > 0 && o.gain?.length > 0 && <span className="px-1 text-white/20">→</span>}
            {o.gain?.map((l, i) => (
              <span key={`g${i}`}>
                {i > 0 && <span className="px-0.5 text-white/20">/</span>}
                <Line line={l} />
              </span>
            ))}
            {o.gain_note && <span className="pl-1 text-[10px] text-white/35">{o.gain_note}</span>}
          </span>
        )}
      </div>
    </div>
  );
}

export default function OfferPanel({ className = "" }) {
  const [offers, setOffers] = useState(null);

  useEffect(() => {
    api("/api/economy/offerz/funnel/")
      .then((r) => setOffers(r.offers || []))
      // Silent. An offers panel is the one surface where a visible error is
      // strictly worse than nothing — the member didn't ask for it, so telling
      // them it failed is an interruption about an interruption.
      .catch(() => setOffers([]));
  }, []);

  async function dismiss(key) {
    // Optimistic, because the alternative is an X that appears not to work for
    // as long as the round trip takes, on the one control whose entire job is
    // making the thing go away.
    setOffers((cur) => (cur || []).filter((o) => o.key !== key));
    try {
      const r = await api("/api/economy/offerz/funnel/", { method: "POST", body: { key } });
      // The server answers with what's LEFT, so closing one shows whatever
      // takes its place without a second round trip.
      if (r?.offers) setOffers(r.offers);
    } catch {
      // It stays hidden for this session either way. Putting it back because
      // the write failed would punish the member for our outage.
    }
  }

  if (!offers?.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {offers.map((o) => <Offer key={o.key} o={o} onDismiss={dismiss} />)}
    </div>
  );
}
