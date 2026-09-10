import { useEffect, useState } from "react";
import { Zap, Clock } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

/**
 * Shows Energy regeneration rate and next refill time.
 * Displays tier benefit (how much Energy regenerates per hour).
 * Shown in header so users see it when planning their actions.
 */
export default function EnergyRegenerationDisplay() {
  const { user } = useAuth();
  const [energyInfo, setEnergyInfo] = useState(null);
  const [nextRefillTime, setNextRefillTime] = useState(null);

  useEffect(() => {
    async function loadEnergyInfo() {
      try {
        const profile = await api("/api/auth/me/");
        if (profile.reach && profile.tier) {
          // Energy regenerates at reach ÷ tier per hour
          const tierDivisor = {
            free: 1,
            premium: 0.5,   // 2x faster
            statz: 0.25,    // 4x faster
          };
          const divisor = tierDivisor[profile.tier] || 1;
          const regenPerHour = Math.ceil(profile.reach / divisor);

          setEnergyInfo({
            reach: profile.reach,
            tier: profile.tier,
            regenPerHour,
            tierDivisor,
          });
        }
      } catch {
        // If profile fetch fails, energy info is unavailable
      }
    }
    loadEnergyInfo();
  }, []);

  useEffect(() => {
    if (!energyInfo) return;

    // Calculate next refill time (on the hour)
    const updateNextRefill = () => {
      const now = new Date();
      const nextHour = new Date(now.getTime() + (60 - now.getMinutes()) * 60000);
      nextHour.setSeconds(0);
      nextHour.setMilliseconds(0);
      setNextRefillTime(nextHour);
    };

    updateNextRefill();
    const interval = setInterval(updateNextRefill, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [energyInfo]);

  if (!energyInfo || !nextRefillTime) return null;

  const now = new Date();
  const minsUntilRefill = Math.max(0, Math.ceil((nextRefillTime - now) / 60000));

  const tierLabels = {
    free: "1x regeneration",
    premium: "2x faster",
    statz: "4x faster",
  };

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-3 py-2 text-xs"
      title={`Energy regenerates ${energyInfo.regenPerHour}⚡/hour with your tier. Next refill at ${nextRefillTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
    >
      <Zap size={14} className="text-emerald-300 shrink-0" />
      <span className="text-white/70">
        +{energyInfo.regenPerHour}⚡/hr
      </span>
      <span className="text-white/40 text-[10px]">
        ({tierLabels[energyInfo.tier]})
      </span>
      {minsUntilRefill > 0 && minsUntilRefill < 60 && (
        <>
          <Clock size={12} className="text-white/30 ml-1 shrink-0" />
          <span className="text-white/50">{minsUntilRefill}m</span>
        </>
      )}
    </div>
  );
}
