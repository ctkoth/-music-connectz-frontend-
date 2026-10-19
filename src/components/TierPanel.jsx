import { APP_BENEFITS, TIER_BLURB, TIER_ORDER } from "../tierBenefits.js";
import { TIER_LABEL, useTierLadder } from "../limits.js";
import { goToSpot } from "../goto.js";

// What each tier buys in THIS app, in every app's ⓘ panel, with the door to
// buy it. The copy is tierBenefits.js (no numbers); the numbers are the
// server's ladder; the prices are MembershipZ's, one tap away. So an app
// describes its tiers without becoming the eleventh place a tier number lives.

const money = (c) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

export default function TierPanel({ tab, label, onGo }) {
  const { tiers, tier } = useTierLadder();
  const mine = (tier || "free").toLowerCase() === "debug" ? "statz" : (tier || "free").toLowerCase();
  const entry = APP_BENEFITS.find((a) => a.app.toLowerCase().split(" · ").some((n) => n === (label || "").toLowerCase()));
  const go = (target) => { onGo?.(); goToSpot("membershipz", target); };
  return (
    <div className="mt-3 space-y-2 border-t border-white/[0.08] pt-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Tiers{entry ? ` in ${label}` : ""}</p>
      {TIER_ORDER.map((t) => {
        const line = entry?.[t] && entry[t] !== "—" ? entry[t] : TIER_BLURB[t];
        const ladder = tiers?.[t];
        return (
          <div key={t} className={`rounded-lg border px-2.5 py-1.5 ${t === mine ? "border-mcz-ember/50 bg-mcz-ember/10" : "border-white/10 bg-black/20"}`}>
            <p className="flex flex-wrap items-baseline justify-between gap-1 text-[11px]">
              <span className={`font-bold ${t === mine ? "text-mcz-ember" : "text-white/80"}`}>
                {TIER_LABEL[t]}{t === mine && <span className="ml-1 font-normal">· yours</span>}
              </span>
              {ladder && (
                <span className="text-white/45">
                  {ladder.month_cents ? `${money(ladder.month_cents)}/mo · ${money(ladder.year_cents)}/yr` : "free"}
                  {" · "}{ladder.char_limit >= 1e8 ? "unlimited" : Number(ladder.char_limit).toLocaleString()} characters
                </span>
              )}
            </p>
            <p className="text-[11px] leading-relaxed text-white/60">{line}</p>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2 pt-1">
        {mine !== "statz" && (
          <button className="neon-btn-primary !w-auto px-4 py-1.5 text-xs" onClick={() => go("membershipz-plans")}>
            Upgrade — monthly or yearly
          </button>
        )}
        <button className="re-btn !w-auto px-3 py-1.5 text-xs" onClick={() => go("membershipz-plans")}>
          Every app, every tier
        </button>
      </div>
    </div>
  );
}
