import { useEffect, useState } from "react";
import { HeartPulse } from "lucide-react";
import { api } from "../api.js";
import { goToTab } from "../goto.js";
import { HIDE_HEALTH } from "../platform.js";

// A private pointer to HealthZ, on the screens where it matters: your own ProfileZ and BodieZ.
//
// It decides nothing and shows no condition's name — only counts, and only to their owner — so a
// profile page screenshot can never carry somebody's diagnosis. Renders nothing when HealthZ has
// nothing to say (no conditions, no switch on) or the request fails: an unrequested panel that
// reports its own failure is an interruption about an interruption. Hidden on iOS 1.0.
export default function HealthNote({ where }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    if (HIDE_HEALTH()) return;
    api("/api/economy/healthz/").then(setD).catch(() => setD(null));
  }, []);
  if (HIDE_HEALTH() || !d) return null;
  const n = (d.conditions || []).length;
  const told = d.coach_aware_count || 0;
  const findable = (d.conditions || []).filter((c) => c.shared).length;
  if (where === "bodiez") {
    if (!told) return null;
    return (
      <div className="re-card flex items-start gap-3 text-xs text-white/70" data-tour="bodiez-health-note">
        <HeartPulse size={16} className="mt-0.5 shrink-0 text-emerald-300" />
        <p className="min-w-0">
          Your coach and the AI workout read know about {told} thing{told === 1 ? "" : "s"} you told HealthZ, only as a
          note on their advice. Routines, the Planner and Thorough ratings don't change for them. For anything
          medical, check with a clinician.{" "}
          <button className="text-mcz-cyan underline" onClick={() => goToTab("healthz")}>Manage in HealthZ</button>
        </p>
      </div>
    );
  }
  if (!n && !d.sleep?.length) return null;
  return (
    <div className="re-card flex items-start gap-3 text-xs text-white/70" data-tour="profile-healthz">
      <HeartPulse size={16} className="mt-0.5 shrink-0 text-emerald-300" />
      <p className="min-w-0">
        HealthZ — private to you.{" "}
        {n ? `${n} condition${n === 1 ? "" : "s"}: ${findable} findable by adults, ${told} told to your coaches. ` : ""}
        {d.sleep?.length ? `${d.sleep.length} night${d.sleep.length === 1 ? "" : "s"} of sleep logged. ` : ""}
        Nothing here shows on your public profile.{" "}
        <button className="text-mcz-cyan underline" onClick={() => goToTab("healthz")}>Open HealthZ</button>
      </p>
    </div>
  );
}
