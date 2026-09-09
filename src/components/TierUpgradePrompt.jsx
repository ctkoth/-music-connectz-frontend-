import { ArrowRight } from "lucide-react";

/**
 * Shows tier benefits when user hits a limit (e.g., char limit, storage).
 * Helps convert Free → Premium by showing the upgrade path, not just the wall.
 */
export default function TierUpgradePrompt({ limit, current, userTier = "free", onUpgrade }) {
  const limits = {
    char: { free: 400, premium: 1500, statz: Infinity },
    upload_mb: { free: 100, premium: 1024, statz: 10240 },
    storage_mb: { free: 500, premium: 5120, statz: 102400 },
  };

  const tiers = [
    {
      name: "Free",
      key: "free",
      color: "text-white/60",
      borderColor: "border-white/10",
      bgColor: "bg-white/5",
      current: userTier === "free",
      limit: limits[limit]?.free,
    },
    {
      name: "Premium",
      key: "premium",
      color: "text-mcz-cyan",
      borderColor: "border-mcz-cyan/30",
      bgColor: "bg-mcz-cyan/10",
      current: userTier === "premium",
      limit: limits[limit]?.premium,
      price: "$6/mo",
    },
    {
      name: "StatZ",
      key: "statz",
      color: "text-mcz-gold",
      borderColor: "border-mcz-gold/30",
      bgColor: "bg-mcz-gold/10",
      current: userTier === "statz",
      limit: limits[limit]?.statz,
      price: "$15/mo",
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
