import React from "react";

const container = {
  background: "#e0ffff",
  border: "4px dashed #00bfff",
  borderRadius: "18px",
  boxShadow: "0 4px 24px #00bfff88",
  fontFamily: 'Courier New, monospace',
  color: "#ff69b4",
  padding: "2rem 1.5rem 1.5rem 1.5rem",
  width: "340px",
  margin: "2rem auto",
  textAlign: "center",
};

const badge = {
  background: "#ff69b4",
  color: "#fff",
  borderRadius: "8px",
  padding: "6px 14px",
  fontSize: "1.1rem",
  margin: "0.5rem 0.3rem",
  display: "inline-block",
};

const flair = {
  fontSize: "1.3rem",
  margin: "0.5rem 0.3rem",
};

export default function ProfileRetro({ username = "@corey", badges = ["🦄 Beatmaker Pro", "🌈 Streak Master"], flairIcons = ["🌈", "🎧"], spinaz = 120, energy = 80 }) {
  return (
    <div style={container}>
      <div style={{ fontSize: "1.5rem", color: "#ff69b4" }}>🕹️ <b>{username}</b></div>
      <div style={{ margin: "1rem 0" }}>
        {badges.map((b, i) => (
          <span key={i} style={badge}>{b}</span>
        ))}
      </div>
      <div style={{ margin: "0.5rem 0" }}>
        {flairIcons.map((icon, i) => (
          <span key={i} style={flair}>{icon}</span>
        ))}
      </div>
      <div style={{ marginTop: "1rem", fontWeight: "bold" }}>
        <span style={{ color: "#00bfff", marginRight: 8 }}>Spinaz: <b>{spinaz}</b></span>
        <span style={{ color: "#ff69b4" }}>Energy: <b>{energy}</b></span>
      </div>
    </div>
  );
}
