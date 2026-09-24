import { useState, useEffect } from "react";
import { Accessibility, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../api.js";

/**
 * DisabilitieZ — Accessibility through disability declarations.
 *
 * Members declare disabilities from medical sources so the platform can:
 * 1. Auto-suggest accessibility features (seated-only mode, contrast, etc.)
 * 2. Filter for community (disability-aware collaborators, coaches, etc.)
 * 3. Explain why features are suggested based on their declarations
 *
 * This is a DECLARATION, not a diagnosis or measurement. The user controls
 * what they share and which features they enable.
 */
export default function DisabilitieZ() {
  const [disabilities, setDisabilities] = useState([]);
  const [accessibilityPrefs, setAccessibilityPrefs] = useState({});
  const [availableDisabilities, setAvailableDisabilities] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchDisabilities();
  }, []);

  async function fetchDisabilities() {
    try {
      const data = await api("/api/economy/disabilitiez/");
      setDisabilities(data.disabilities || []);
      setAccessibilityPrefs(data.accessibility_preferences || {});
      setAvailableDisabilities(data.available_disabilities || {});
      setError("");
    } catch (err) {
      setError("Failed to load disability settings: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisabilityToggle(key) {
    const updated = disabilities.includes(key)
      ? disabilities.filter(d => d !== key)
      : [...disabilities, key];

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const result = await api("/api/economy/disabilitiez/", {
        method: "PATCH",
        body: JSON.stringify({ disabilities: updated }),
      });
      setDisabilities(result.disabilities || []);
      setAccessibilityPrefs(result.accessibility_preferences || {});
      setSuccess("Disability settings updated. Features auto-adjusted based on your declarations.");
    } catch (err) {
      setError("Failed to update: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePreferenceChange(featureKey, enabled) {
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const newPrefs = { ...accessibilityPrefs };
      if (newPrefs[featureKey]) {
        newPrefs[featureKey].enabled = enabled;
      }

      const result = await api("/api/economy/disabilitiez/", {
        method: "PATCH",
        body: JSON.stringify({ accessibility_preferences: newPrefs }),
      });
      setAccessibilityPrefs(result.accessibility_preferences || {});
      setSuccess("Accessibility preference updated.");
    } catch (err) {
      setError("Failed to update preference: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-center text-white/60">Loading accessibility settings...</div>;
  }

  // Group disabilities by category
  const categorized = {};
  Object.entries(availableDisabilities).forEach(([key, info]) => {
    const cat = info.category || "Other";
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push({ key, ...info });
  });

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Accessibility size={24} className="text-mcz-cyan" /> DisabilitieZ
        </h1>
        <p className="text-sm text-white/60 mt-2">
          Declare disabilities so we can auto-suggest accessibility features and connect you with the right community.
          This is a declaration, not a diagnosis. You control what you share.
        </p>
      </div>

      {error && (
        <div className="bg-mcz-ember/20 border border-mcz-ember rounded-lg p-3 text-sm text-mcz-ember flex gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/20 border border-emerald-500 rounded-lg p-3 text-sm text-emerald-300 flex gap-2">
          <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {/* Disability Selection */}
      <div className="space-y-4">
        <h2 className="font-semibold text-white">Your Disabilities</h2>
        {Object.entries(categorized).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">{category}</p>
            <div className="space-y-2 pl-2">
              {items.map(item => (
                <label key={item.key} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={disabilities.includes(item.key)}
                    onChange={() => handleDisabilityToggle(item.key)}
                    disabled={saving}
                    className="w-5 h-5 accent-mcz-cyan"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{item.label}</div>
                    {item.suggests_features && item.suggests_features.length > 0 && (
                      <div className="text-xs text-white/40 mt-1">
                        Suggests: {item.suggests_features.join(", ")}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Accessibility Features */}
      {Object.keys(accessibilityPrefs).length > 0 && (
        <div className="space-y-4 border-t border-white/10 pt-4">
          <h2 className="font-semibold text-white">Accessibility Features</h2>
          <p className="text-sm text-white/60">
            These features were auto-suggested based on your disability declarations.
            Customize any of them below.
          </p>
          <div className="space-y-3">
            {Object.entries(accessibilityPrefs).map(([featureKey, config]) => (
              <div key={featureKey} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled || false}
                      onChange={(e) => handlePreferenceChange(featureKey, e.target.checked)}
                      disabled={saving}
                      className="w-4 h-4 accent-mcz-cyan"
                    />
                    <span className="text-sm font-medium text-white">{config.label}</span>
                  </label>
                  {config.enabled && (
                    <span className="text-xs text-emerald-300 font-semibold">✓ Active</span>
                  )}
                </div>
                <p className="text-xs text-white/60 pl-6">{config.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      {disabilities.length === 0 && (
        <div className="bg-mcz-cyan/5 border border-mcz-cyan/20 rounded-lg p-4">
          <p className="text-sm text-white/70">
            Select disabilities that describe your needs. The app will auto-suggest features like
            seated-only exercise mode, high contrast display, and community filters. You can always
            customize or disable these features.
          </p>
        </div>
      )}
    </div>
  );
}
