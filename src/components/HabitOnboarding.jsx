import { useState } from "react";
import { Zap, Music, X, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { track } from "../track.js";

/**
 * Quick onboarding modal to get new users to set a daily habit.
 * Shows after registration, lets them create their first vocal/rap practice habit.
 * Emphasizes the ⚡ and XP they earn daily by returning.
 */
export default function HabitOnboarding({ appKey = "singz", onComplete }) {
  const [step, setStep] = useState("intro"); // intro → confirm → done
  const [habitTitle, setHabitTitle] = useState("Daily vocal practice");
  const [frequency, setFrequency] = useState("daily");
  const [creating, setCreating] = useState(false);

  async function createHabit() {
    setCreating(true);
    try {
      const body = {
        title: habitTitle.trim() || "Daily vocal practice",
        app_key: appKey,
        frequency,
        repeat: frequency,
      };
      await api("/api/economy/habits/", { method: "POST", body });
      track("onboarding_habit_created", { app_key: appKey, frequency });
      setStep("done");
    } catch (err) {
      console.error("Failed to create habit:", err);
      // Fail gracefully — close modal if creation fails
      onComplete?.();
    } finally {
      setCreating(false);
    }
  }

  function skip() {
    track("onboarding_habit_skipped", { app_key: appKey });
    onComplete?.();
  }

  if (step === "intro") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
        <div className="rounded-xl border border-mcz-cyan/30 bg-black/80 p-6 max-w-sm w-full space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider text-mcz-cyan/70 mb-1">Next step</p>
              <h2 className="font-display text-xl font-bold text-white">Build a daily habit</h2>
            </div>
            <button onClick={skip} className="text-white/40 hover:text-white/70">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3 text-sm text-white/75">
            <p>Practice daily → earn <span className="text-emerald-300">⚡ Energy</span> + <span className="text-mcz-gold">⭐ XP</span></p>
            <p>Set your habit now, and you're ready to track progress from day one.</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-widest text-white/40 mb-2">Your first habit</p>
            <input
              type="text"
              value={habitTitle}
              onChange={(e) => setHabitTitle(e.target.value)}
              className="neon-input w-full text-sm"
              placeholder="e.g., Daily vocal warmup"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-white/40">How often?</p>
            <div className="flex gap-2">
              {["daily", "weekly"].map((freq) => (
                <button
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    frequency === freq
                      ? "border-mcz-cyan bg-mcz-cyan/20 text-mcz-cyan"
                      : "border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  {freq === "daily" ? "Daily" : "Weekly"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={skip} className="flex-1 re-btn">
              Skip for now
            </button>
            <button onClick={() => setStep("confirm")} className="flex-1 neon-btn-primary">
              <Music size={14} /> Set habit
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
        <div className="rounded-xl border border-emerald-300/30 bg-black/80 p-6 max-w-sm w-full space-y-4 text-center">
          <p className="text-xs uppercase tracking-wider text-emerald-300/70">Your habit</p>
          <h2 className="font-display text-2xl font-bold text-white">{habitTitle}</h2>
          <p className="text-sm text-white/75">
            Every time you complete it, you earn <span className="text-emerald-300">+⚡</span> and <span className="text-mcz-gold">+⭐</span>
          </p>

          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-emerald-300/60">Daily reward</p>
            <div className="flex justify-center gap-4 text-lg font-bold">
              <span className="text-emerald-300">⚡ +2</span>
              <span className="text-mcz-gold">⭐ +10</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep("intro")} className="flex-1 re-btn" disabled={creating}>
              Back
            </button>
            <button
              onClick={createHabit}
              disabled={creating}
              className="flex-1 neon-btn-primary"
            >
              {creating ? <Loader2 className="animate-spin inline mr-1" size={14} /> : null}
              {creating ? "Creating…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
        <div className="rounded-xl border border-emerald-300/40 bg-black/80 p-6 max-w-sm w-full space-y-4 text-center">
          <p className="text-sm text-emerald-300">✓ Habit created</p>
          <h2 className="font-display text-xl font-bold text-white">Ready to go</h2>
          <p className="text-sm text-white/75">
            Check in on <span className="font-semibold">{habitTitle}</span> daily to earn rewards and track your progress.
          </p>
          <button onClick={onComplete} className="w-full neon-btn-primary">
            Start practicing →
          </button>
        </div>
      </div>
    );
  }
}
