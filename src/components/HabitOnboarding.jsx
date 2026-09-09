import { useState } from "react";
import { Zap, Music, X, Loader2, Bell, Globe, Volume2 } from "lucide-react";
import { api } from "../api.js";
import { track } from "../track.js";

/**
 * Quick onboarding modal to get new users to set a daily habit.
 * Shows after registration, lets them create their first vocal/rap practice habit.
 * Emphasizes the ⚡ and XP they earn daily by returning.
 */
export default function HabitOnboarding({ appKey = "singz", onComplete }) {
  const [step, setStep] = useState("intro"); // intro → confirm → done → preferences
  const [habitTitle, setHabitTitle] = useState("Daily vocal practice");
  const [frequency, setFrequency] = useState("daily");
  const [creating, setCreating] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState("en");
  const [soundEnabled, setSoundEnabled] = useState(true);

  async function createHabit() {
    setCreating(true);
    try {
      const body = {
        title: habitTitle.trim() || "Daily vocal practice",
        app_key: appKey,
        frequency,
        repeat: frequency,
        notifications_enabled: notificationsEnabled,
        language,
        sound_enabled: soundEnabled,
      };
      await api("/api/economy/habits/", { method: "POST", body });
      track("onboarding_habit_created", { app_key: appKey, frequency });
      setStep("preferences");
    } catch (err) {
      console.error("Failed to create habit:", err);
      // Fail gracefully — close modal if creation fails
      onComplete?.();
    } finally {
      setCreating(false);
    }
  }

  function completeOnboarding() {
    track("onboarding_preferences_confirmed", {
      notifications_enabled: notificationsEnabled,
      language,
      sound_enabled: soundEnabled,
    });
    onComplete?.();
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
        <div className="rounded-xl border border-emerald-300/30 bg-black/80 p-6 max-w-sm w-full space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-300/70 mb-1">Your habit</p>
            <h2 className="font-display text-2xl font-bold text-white text-center">{habitTitle}</h2>
          </div>
          <p className="text-sm text-white/75 text-center">
            Every time you complete it, you earn <span className="text-emerald-300">+⚡</span> and <span className="text-mcz-gold">+⭐</span>
          </p>

          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-emerald-300/60">Daily reward</p>
            <div className="flex justify-center gap-4 text-lg font-bold">
              <span className="text-emerald-300">⚡ +2</span>
              <span className="text-mcz-gold">⭐ +10</span>
            </div>
          </div>

          <div className="rounded-lg border border-mcz-cyan/30 bg-mcz-cyan/5 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-mcz-cyan/60">Keep the streak going</p>
            <div className="text-xs text-white/75 space-y-1">
              <p><span className="text-emerald-300">Free:</span> Daily reminders + 1 habit tracked</p>
              <p><span className="text-mcz-cyan">Premium:</span> 2x faster Energy gain + unlimited habits + priority support</p>
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

  if (step === "preferences") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
        <div className="rounded-xl border border-mcz-cyan/30 bg-black/80 p-6 max-w-sm w-full space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider text-mcz-cyan/70 mb-1">Preferences</p>
              <h2 className="font-display text-xl font-bold text-white">Personalize your experience</h2>
            </div>
            <button onClick={completeOnboarding} className="text-white/40 hover:text-white/70">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-mcz-cyan" />
                  <span className="text-sm font-medium text-white">Notifications</span>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    notificationsEnabled
                      ? "bg-emerald-300/20 text-emerald-300 border border-emerald-300/50"
                      : "bg-white/10 text-white/60 border border-white/20"
                  }`}
                >
                  {notificationsEnabled ? "On" : "Off"}
                </button>
              </div>
              <p className="text-[11px] text-white/50">Get reminders to check in daily</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-mcz-cyan" />
                  <span className="text-sm font-medium text-white">Language</span>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
              <p className="text-[11px] text-white/50">Choose your preferred language</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 size={16} className="text-mcz-cyan" />
                  <span className="text-sm font-medium text-white">Sound effects</span>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    soundEnabled
                      ? "bg-emerald-300/20 text-emerald-300 border border-emerald-300/50"
                      : "bg-white/10 text-white/60 border border-white/20"
                  }`}
                >
                  {soundEnabled ? "On" : "Off"}
                </button>
              </div>
              <p className="text-[11px] text-white/50">Play sounds for interactions</p>
            </div>
          </div>

          <div className="rounded-lg border border-mcz-ember/20 bg-mcz-ember/5 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-mcz-ember/60">What you unlock later</p>
            <ul className="text-xs text-white/75 space-y-1">
              <li>• <span className="text-mcz-cyan">Premium</span>: Custom sound packs + 2x faster Energy</li>
              <li>• <span className="text-mcz-cyan">StatZ</span>: Unlimited characters + AI vocal coach feedback</li>
            </ul>
            <a href="/settings/membership" className="block mt-2 text-xs text-mcz-cyan hover:underline">
              View all tier benefits →
            </a>
          </div>

          <div className="flex gap-2">
            <button onClick={completeOnboarding} className="flex-1 neon-btn-primary">
              Get started →
            </button>
          </div>
        </div>
      </div>
    );
  }
}
