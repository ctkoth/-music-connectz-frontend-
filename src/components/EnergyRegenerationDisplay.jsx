import { useEffect, useState } from "react";
import { Zap, Clock } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ENERGY } from "../resources.js";

/**
 * The Energy regeneration rate and the next refill, in the header.
 *
 * The rate is the SERVER's: `energy_per_hour` on /api/auth/me/ is the number passive Energy is actually paid at
 * (reach ÷ the plan's divisor, or the plan's floor, whichever is larger). It used to be worked out here from reach
 * with divisors of its own, which disagreed with the server and labelled the plans "2x" and "4x faster" — neither
 * true for a new member, who sits on the floor. Nothing renders until the server's number arrives.
 */
export default function EnergyRegenerationDisplay() {
  const { user } = useAuth();
  // AuthContext already holds the server's /api/auth/me/ payload on every page load, and the rate rides on it.
  // Only a sign-in's own payload lacks it, so that one case is fetched — never a second request per mount.
  const served = user?.energy_per_hour ?? null;
  const [fetched, setFetched] = useState(null);
  const perHour = served ?? fetched;
  const [nextRefillTime, setNextRefillTime] = useState(null);

  useEffect(() => {
    setFetched(null);
    if (!user || served != null) return;
    let on = true;
    api("/api/auth/me/")
      .then((profile) => {
        if (on && profile?.energy_per_hour != null) setFetched(profile.energy_per_hour);
      })
      .catch(() => {
        // A failed fetch shows nothing: the header never invents a rate.
      });
    return () => { on = false; };
  }, [user?.username, served]);

  useEffect(() => {
    if (perHour == null) return;

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
  }, [perHour]);

  if (perHour == null || !nextRefillTime) return null;

  const now = new Date();
  const minsUntilRefill = Math.max(0, Math.ceil((nextRefillTime - now) / 60000));

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-3 py-2 text-xs"
      title={`Energy regenerates ${perHour}${ENERGY}/hour on your plan. Next refill at ${nextRefillTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
    >
      <Zap size={14} className="text-emerald-300 shrink-0" />
      <span className="text-emerald-300">
        +{perHour}{ENERGY}/hr
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
