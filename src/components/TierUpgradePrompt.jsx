import { ArrowRight } from "lucide-react";
import { monthPrice, useTierLadder } from "../limits.js";

/**
 * Shows tier benefits when user hits a limit (e.g., char limit, storage).
 * Helps convert Free → Premium by showing the upgrade path, not just the wall.
 */
export default function TierUpgradePrompt({ limit, current, userTier = "free", onUpgrade }) {
  // The ladder AND the prices come from the server. This file used to carry
  // its own copy of both — three limit tables and "$6/mo" / "$15/mo" typed in
  // — which is the pattern that put "20 free prompts" in nine places. The
  // price half is worse than the limit half: an upgrade panel quoting a figure
  // Stripe then charges differently is a member being shown a price that is
  // not the price.
  const ladder = useTierLadder();

  // Nothing is rendered until the real numbers arrive. A fallback table here
  // would be the copy this change exists to delete, and a panel that flashes
  // stale figures for a moment has still shown them.
  if (!ladder.ready) return null;

  const valueFor = (t) => {
    const row = ladder.tiers[t] || {};
    if (limit === "char") return row.char_limit_unlimited ? Infinity : row.char_limit;
    return row[limit];
  };

  const tiers = [
    {
      name: "Free",
      key: "free",
      color: "text-white/60",
      borderColor: "border-white/10",
      bgColor: "bg-white/5",
      current: userTier === "free",
      limit: valueFor("free"),
    },
    {
      name: "Premium",
      key: "premium",
      color: "text-mcz-cyan",
      borderColor: "border-mcz-cyan/30",
      bgColor: "bg-mcz-cyan/10",
      current: userTier === "premium",
      limit: valueFor("premium"),
      price: monthPrice(ladder.tiers.premium?.month_cents),
    },
    {
      name: "StatZ",
      key: "statz",
      color: "text-mcz-gold",
      borderColor: "border-mcz-gold/30",
      bgColor: "bg-mcz-gold/10",
      current: userTier === "statz",
      limit: valueFor("statz"),
      price: monthPrice(ladder.tiers.statz?.month_cents),
    },
  ];

  const limitLabel = {
    char: "Characters",
    upload_mb: "Per upload",
    storage_mb: "Total storage",
  };

  return (
    <div className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/5 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-white mb-1">You've hit your {limitLabel[limit]} limit</p>
        <p className="text-xs text-white/60">Upgrade to keep going</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiers.map((tier) => (
          <div
            key={tier.key}
            className={`rounded-lg border p-2 text-center transition ${
              tier.current ? tier.borderColor + " " + tier.bgColor : "border-white/10 bg-white/5"
            }`}
          >
            <p className={`text-xs font-medium mb-1 ${tier.color}`}>{tier.name}</p>
            <p className="text-sm font-bold text-white">
              {tier.limit === Infinity ? "Unlimited" : tier.limit.toLocaleString()}
            </p>
            {tier.price && <p className="text-[10px] text-white/50 mt-1">{tier.price}</p>}
            {tier.current && <p className="text-[10px] text-white/40 mt-1">Your plan</p>}
          </div>
        ))}
      </div>

      {userTier === "free" && (
        <button
          onClick={onUpgrade}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-mcz-cyan/20 hover:bg-mcz-cyan/30 border border-mcz-cyan/50 text-mcz-cyan py-2 text-sm font-medium transition"
        >
          Upgrade to Premium <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
