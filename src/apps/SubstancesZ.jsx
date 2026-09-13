import { useState, useEffect } from 'react';
import { api } from '../api';

export default function SubstancesZ() {
  const [tab, setTab] = useState("set");
  const [options, setOptions] = useState(null);
  const [current, setCurrent] = useState({
    alcohol: "prefer_not",
    cannabis: "prefer_not",
    tobacco: "prefer_not",
    psychedelics: "prefer_not",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSubstances();
  }, []);

  const loadSubstances = async () => {
    try {
      const data = await api("economy/substancesz/", "GET");
      setOptions(data.options);
      if (data.current && Object.keys(data.current).length > 0) {
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

  const saveSubstances = async () => {
    setLoading(true);
    try {
      await api("economy/substancesz/", "POST", current);
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

  const substances = ["alcohol", "cannabis", "tobacco", "psychedelics"];

  return (
    <div className="substancesz tab-app">
      <div className="chip-wrap">
        <div
          className={`chip ${tab === "set" ? "active" : ""}`}
          onClick={() => setTab("set")}
        >
          🌿 Your Substances
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
          <h2 style={{ marginTop: 0 }}>Your Use 🌿</h2>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Private preferences for compatible matching (never shared publicly)
          </p>

          {substances.map((substance) => (
            <div key={substance} style={{ marginTop: "20px" }}>
              <h4 style={{ textTransform: "capitalize" }}>
                {substance === "psychedelics" ? "Psychedelics & Hallucinogens" : substance.charAt(0).toUpperCase() + substance.slice(1)}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {options[substance]?.map((opt) => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="radio"
                      name={substance}
                      checked={current[substance] === opt.value}
                      onChange={() => handleChange(substance, opt.value)}
                    />
                    <span>{opt.emoji} {opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={saveSubstances}
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
            {loading ? "Saving..." : "Save My Preferences"}
          </button>

          <p style={{ fontSize: "11px", color: "#999", marginTop: "16px" }}>
            Your substance preferences are private and only used for matching compatibility on VybeZ ConnectZ.
          </p>
        </div>
      </div>
    </div>
  );
}
