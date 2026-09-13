import { useState, useEffect } from 'react';
import { api } from '../api';

export default function PreferencesZ() {
  const [tab, setTab] = useState("set");
  const [options, setOptions] = useState(null);
  const [current, setCurrent] = useState({
    gender_interested: "everyone",
    relationship_type: "both",
    long_term: "either",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await api("economy/preferencesz/", "GET");
      setOptions(data.options);
      if (data.current) {
        setCurrent(data.current);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (field, value) => {
    setCurrent(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      await api("economy/preferencesz/", "POST", current);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!options) {
    return <div className="scroll-panel" style={{ padding: "12px 16px" }}>Loading...</div>;
  }

  return (
    <div className="preferencesz tab-app">
      <div className="chip-wrap">
        <div
          className={`chip ${tab === "set" ? "active" : ""}`}
          onClick={() => setTab("set")}
        >
          💫 Your Preferences
        </div>
      </div>

      {error && (
        <div className="alert-error" style={{ margin: "12px" }}>
          {error}
          <button onClick={() => setError("")} style={{ marginLeft: "8px" }}>
            ✕
          </button>
        </div>
      )}

      {saved && (
        <div className="alert-success" style={{ margin: "12px" }}>
          ✓ Preferences saved
        </div>
      )}

      <div className="scroll-panel">
        <div style={{ padding: "12px 16px" }}>
          <h2 style={{ marginTop: 0 }}>Your Vibe 💫</h2>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Help us find your perfect match on VybeZ ConnectZ
          </p>

          <div style={{ marginTop: "20px" }}>
            <h4>Interested in:</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {options.gender_interested?.map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="radio"
                    name="gender"
                    checked={current.gender_interested === opt.value}
                    onChange={() => handleChange("gender_interested", opt.value)}
                  />
                  <span>{opt.emoji} {opt.text}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <h4>Seeking:</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {options.relationship_type?.map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="radio"
                    name="relationship"
                    checked={current.relationship_type === opt.value}
                    onChange={() => handleChange("relationship_type", opt.value)}
                  />
                  <span>{opt.emoji} {opt.text}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <h4>Timeline:</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {options.long_term?.map((opt) => (
                <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="radio"
                    name="timeline"
                    checked={current.long_term === opt.value}
                    onChange={() => handleChange("long_term", opt.value)}
                  />
                  <span>{opt.emoji} {opt.text}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={savePreferences}
            disabled={loading}
            style={{
              padding: "10px 16px",
              backgroundColor: loading ? "#ccc" : "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              width: "100%",
              marginTop: "20px",
            }}
          >
            {loading ? "Saving..." : "Save My Vibe"}
          </button>
        </div>
      </div>
    </div>
  );
}
