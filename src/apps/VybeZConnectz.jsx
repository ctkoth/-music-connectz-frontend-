import { useState, useEffect } from 'react';
import { api } from '../api';

const MBTI_COLORS = {
  "ISTJ": "#4A5568", "ISFJ": "#5A6C7D", "INFJ": "#667B8F", "INTJ": "#718AA1",
  "ISTP": "#6B7D91", "ISFP": "#7D8FA3", "INFP": "#8FA1B5", "INTP": "#A1B3C7",
  "ESTP": "#FF9500", "ESFP": "#FFB000", "ENFP": "#FFC700", "ENTP": "#FFD700",
  "ESTJ": "#DC2626", "ESFJ": "#EF4444", "ENFJ": "#F87171", "ENTJ": "#FCA5A5",
};

export default function VybeZConnectz() {
  const [tab, setTab] = useState("matches");
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
    loadMatches();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api("economy/vybeez_connectz/stats/", "GET");
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await api("economy/vybeez_connectz/funnel/", "GET");
      setMatches(data);
    } catch (err) {
      if (err.message?.includes("preferences_not_set")) {
        setError("Please set your preferences first to see matches");
      } else {
        setError(err.message || "Failed to load matches");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vybeez-connectz tab-app">
      <div className="chip-wrap">
        <div
          className={`chip ${tab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
        >
          💫 Profile
        </div>
        <div
          className={`chip ${tab === "matches" ? "active" : ""}`}
          onClick={() => setTab("matches")}
        >
          💕 Matches
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

      {tab === "profile" && stats && <ProfileTab stats={stats} />}
      {tab === "matches" && matches && <MatchesTab matches={matches} loading={loading} />}
    </div>
  );
}

function ProfileTab({ stats }) {
  const sections = [
    { key: "personality", label: "PersonalitieZ", emoji: "📊", hint: "Take your MBTI test" },
    { key: "preferences", label: "PreferencesZ", emoji: "💫", hint: "Set your relationship goals" },
    { key: "substances", label: "SubstancesZ", emoji: "🌿", hint: "Share substance use (optional)" },
  ];

  return (
    <div className="scroll-panel">
      <div style={{ padding: "12px 16px" }}>
        <h2 style={{ marginTop: 0 }}>Your VybeZ Profile 💫</h2>
        <p style={{ fontSize: "12px", color: "#666", marginBottom: "20px" }}>
          Complete your profile to unlock the matching funnel
        </p>

        <div style={{ marginBottom: "16px" }}>
          <div style={{
            width: "100%",
            height: "8px",
            backgroundColor: "#eee",
            borderRadius: "4px",
            overflow: "hidden",
          }}>
            <div
              style={{
                width: `${stats.completion_percentage}%`,
                height: "100%",
                backgroundColor: "#0066cc",
                transition: "width 0.3s",
              }}
            />
          </div>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
            {stats.completion_percentage}% complete
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sections.map((section) => {
            const done = stats.profile_complete[section.key];
            return (
              <div
                key={section.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  backgroundColor: done ? "#f0f8ff" : "#f9f9f9",
                  borderRadius: "8px",
                  border: `1px solid ${done ? "#0066cc" : "#ddd"}`,
                }}
              >
                <span style={{ fontSize: "20px" }}>{section.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{section.label}</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {done ? "✓ Complete" : section.hint}
                  </div>
                </div>
                {done && <span style={{ fontSize: "18px" }}>✓</span>}
              </div>
            );
          })}
        </div>

        {stats.ready_for_matching && (
          <div style={{
            marginTop: "20px",
            padding: "12px",
            backgroundColor: "#f0fff4",
            borderRadius: "8px",
            border: "1px solid #9ae6b4",
            textAlign: "center",
          }}>
            <p style={{ margin: 0, fontWeight: 500, color: "#22543d" }}>
              🎉 Ready to find your match!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchesTab({ matches, loading }) {
  if (!matches || !matches.matches || matches.matches.length === 0) {
    return (
      <div className="scroll-panel">
        <div style={{ padding: "12px 16px", textAlign: "center", color: "#666" }}>
          {loading ? (
            <p>Finding your vibe matches...</p>
          ) : (
            <>
              <p style={{ fontSize: "24px", marginBottom: "8px" }}>💫</p>
              <p>No matches yet</p>
              <p style={{ fontSize: "12px" }}>Complete your profile to unlock matches</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-panel">
      <div style={{ padding: "12px 16px" }}>
        <h3>Your VybeZ Matches 💕</h3>
        <p style={{ fontSize: "12px", color: "#666" }}>
          Based on PersonalitieZ, PreferencesZ & SubstancesZ compatibility
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
          {matches.matches.map((match) => {
            const bgColor = match.personality ? MBTI_COLORS[match.personality] || "#666" : "#999";
            const scoreColor = match.compatibility_score >= 80 ? "#22c55e" :
                              match.compatibility_score >= 60 ? "#f59e0b" :
                              "#ef4444";

            return (
              <div
                key={match.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  overflow: "hidden",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  style={{
                    backgroundColor: bgColor,
                    color: "white",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "16px" }}>
                      {match.username}
                    </div>
                    <div style={{ fontSize: "12px", opacity: 0.9 }}>
                      {match.personality}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: scoreColor,
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {match.compatibility_score}%
                  </div>
                </div>

                <div style={{ padding: "12px 16px", fontSize: "12px" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <span style={{ color: "#666" }}>Seeking: </span>
                    <span style={{ fontWeight: 500 }}>
                      {match.relationship_seeking === "collabs" ? "Collaborations 🎵" :
                       match.relationship_seeking === "dating" ? "Dating 💕" :
                       "Both 🎭"}
                    </span>
                  </div>
                  <div style={{ color: "#666" }}>
                    <span>Timeline: </span>
                    <span style={{ fontWeight: 500 }}>
                      {match.commitment === "short" ? "Short-term 🌪️" :
                       match.commitment === "long" ? "Long-term 🏠" :
                       "Either 🔄"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
