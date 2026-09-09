import { useState, useEffect } from "react";
import { Volume2, X, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { track } from "../track.js";

/**
 * Displays user's sound effect preferences and settings.
 * Allows toggling sound_enabled and previewing sound packs.
 * Fetches/updates user preferences via /api/economy/profile/
 */
export default function SoundzPanel({ isOpen, onClose }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume, setVolume] = useState(100);
  const [selectedPack, setSelectedPack] = useState("default");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [packs] = useState([
    { id: "default", name: "Crisp Chimes", desc: "Clean, modern notification sounds" },
    { id: "subtle", name: "Subtle Tones", desc: "Soft background tones" },
    { id: "retro", name: "Retro Bells", desc: "Classic electronic tones" },
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  async function fetchPreferences() {
    setLoading(true);
    try {
      const response = await api("/api/economy/profile/", { method: "GET" });
      setSoundEnabled(response.sound_enabled ?? true);
      setVolume(response.sound_volume ?? 100);
      setSelectedPack(response.sound_pack ?? "default");
      track("soundz_panel_opened");
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference(field, value) {
    setSaving(true);
    try {
      const data = { [field]: value };
      await api("/api/economy/profile/", {
        method: "POST",
        body: data,
      });
      track("soundz_preference_updated", { field, value });
    } catch (err) {
      console.error("Failed to update preference:", err);
    } finally {
      setSaving(false);
    }
  }

  async function playPreview() {
    // Play a preview sound (would use actual audio file in production)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 800;
      gain.gain.setValueAtTime((volume / 100) * 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);

      track("soundz_preview_played", { pack: selectedPack });
    } catch (err) {
      console.error("Could not play preview:", err);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
      <div className="rounded-xl border border-mcz-cyan/30 bg-black/80 p-6 max-w-md w-full max-h-[80vh] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs uppercase tracking-wider text-mcz-cyan/70 mb-1">
              Preferences
            </p>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-white">
                Sound Effects
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-mcz-cyan" size={20} />
            </div>
          ) : (
            <>
              {/* Sound Toggle */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 size={18} className="text-mcz-cyan" />
                    <div>
                      <p className="text-sm font-medium text-white">Enable Sounds</p>
                      <p className="text-xs text-white/50">Play sound effects when habits complete</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !soundEnabled;
                      setSoundEnabled(newValue);
                      updatePreference("sound_enabled", newValue);
                    }}
                    disabled={saving}
                    className={`relative w-12 h-6 rounded-full transition ${
                      soundEnabled ? "bg-emerald-500/40" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${
                        soundEnabled ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Volume Control */}
              {soundEnabled && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-white mb-2">Volume</p>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value);
                        setVolume(newValue);
                        updatePreference("sound_volume", newValue);
                      }}
                      disabled={saving}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-mcz-cyan"
                    />
                    <p className="text-xs text-white/40 mt-2">{volume}%</p>
                  </div>
                </div>
              )}

              {/* Sound Pack Selection */}
              {soundEnabled && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-white">Sound Pack</p>
                  <div className="space-y-2">
                    {packs.map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => {
                          setSelectedPack(pack.id);
                          updatePreference("sound_pack", pack.id);
                        }}
                        disabled={saving}
                        className={`w-full text-left rounded-lg border p-3 transition ${
                          selectedPack === pack.id
                            ? "border-emerald-300/50 bg-emerald-300/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <p className="text-sm font-medium text-white">{pack.name}</p>
                        <p className="text-xs text-white/50">{pack.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Button */}
              {soundEnabled && (
                <button
                  onClick={playPreview}
                  disabled={saving}
                  className="w-full py-2 px-3 rounded border border-mcz-cyan/30 text-mcz-cyan hover:bg-mcz-cyan/10 transition text-sm font-medium"
                >
                  Preview Sound
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded neon-btn-primary text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
