import React from "react";

const container = {
  background: "#fffacd",
  border: "4px dashed #ff69b4",
  borderRadius: "18px",
  boxShadow: "0 4px 24px #ff69b488",
  fontFamily: 'Courier New, monospace',
  color: "#ff69b4",
  padding: "2rem 1.5rem 1.5rem 1.5rem",
  width: "340px",
  margin: "2rem auto",
  textAlign: "center",
};

const row = {
  margin: "0.5rem 0",
  fontSize: "1.1rem",
};

const badge = {
  background: "#ff69b4",
  color: "#fff",
  borderRadius: "8px",
  padding: "4px 10px",
  margin: "0 0.2rem",
  fontSize: "1rem",
};

export default function LeaderboardRetro({ entries = [
  { username: "@corey", badges: ["🌈", "🦄 Beatmaker Pro"] },
  { username: "@musicfan", badges: ["🌈 Streak Master"] },
  { username: "@djz", badges: ["Newcomer"] },
] }) {
  return (
    <div style={container}>
      <div style={{ fontSize: "1.5rem", color: "#ff69b4" }}>🕹️ Hall of Fame</div>
      {entries.map((entry, i) => (
        <div key={i} style={row}>
          <b>{i + 1}.</b> <span style={{ color: "#222" }}>{entry.username}</span>
          {entry.badges.map((b, j) => (
            <span key={j} style={badge}>{b}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
