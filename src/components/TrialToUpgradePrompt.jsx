import { Zap, Check } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Shows trial member what they unlock by signing up + upgrading.
 * Displayed after trial take is scored: "You got a 7 — here's what's next"
 * Bridges trial (anonymous) → signup (Free) → upgrade (Premium/StatZ)
 */
export default function TrialToUpgradePrompt({ score = 7 }) {
  return (
    <div className="rounded-lg border border-mcz-cyan/30 bg-black/40 p-4 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-mcz-cyan/70 mb-1">Keep your progress</p>
        <h3 className="font-display text-lg font-bold text-white">
          Your score: <span className="text-emerald-300">{score}</span>
        </h3>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-white/75">Sign up to:</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2 text-white/60">
            <Check size={14} className="text-emerald-300 shrink-0" />
            <span>Track your progress daily</span>
          </li>
          <li className="flex items-center gap-2 text-white/60">
            <Check size={14} className="text-emerald-300 shrink-0" />
            <span>Earn <span className="text-emerald-300">⚡ Energy</span> + <span className="text-mcz-gold">⭐ XP</span> on habits</span>
          </li>
          <li className="flex items-center gap-2 text-white/60">
            <Check size={14} className="text-emerald-300 shrink-0" />
            <span>Create a daily practice habit</span>
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-mcz-cyan/20 bg-mcz-cyan/5 p-3 space-y-2">
        <p className="text-xs font-medium text-mcz-cyan">Plus: Unlock with Premium</p>
        <div className="text-xs text-white/60 space-y-1">
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-mcz-cyan shrink-0" />
            <span>2x faster Energy gain</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-mcz-cyan font-semibold">🎙️</span>
            <span>AI vocal coach feedback</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-mcz-cyan font-semibold">📊</span>
            <span>Advanced analytics</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Link to="/register" className="flex-1 neon-btn-primary text-center py-2">
          Sign up free
        </Link>
        <Link to="/settings/membership" className="flex-1 re-btn text-center py-2">
          View plans
        </Link>
      </div>
    </div>
  );
}
