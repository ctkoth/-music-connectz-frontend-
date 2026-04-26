import React from "react";

const modalStyle = {
  background: "#ffe4e1",
  border: "4px dashed #ff69b4",
  borderRadius: "18px",
  boxShadow: "0 4px 24px #ff69b488",
  fontFamily: 'Courier New, monospace',
  color: "#ff69b4",
  padding: "2.5rem 2rem 2rem 2rem",
  width: "340px",
  margin: "2rem auto",
  textAlign: "center",
  position: "relative",
};

const badgeStyle = {
  background: "#00bfff",
  color: "#fff",
  borderRadius: "8px",
  padding: "6px 18px",
  fontSize: "1.2rem",
  margin: "1rem 0",
  boxShadow: "0 2px 8px #ff69b455",
  display: "inline-block",
};

const buttonRow = {
  marginTop: "1.5rem",
  display: "flex",
  justifyContent: "space-around",
};

const buttonStyle = {
  background: "#ff69b4",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontFamily: 'Courier New, monospace',
  fontSize: "1rem",
  padding: "0.5rem 1.2rem",
  margin: "0 0.3rem",
  cursor: "pointer",
  boxShadow: "0 2px 8px #ff69b488",
  transition: "background 0.2s",
};

export default function AchievementModal({ badge = "Beatmaker Pro", spinaz = 10, energy = 5, onClose, onShare, onProfile }) {
  return (
    <div style={modalStyle}>
      <div style={{ fontSize: "2rem", textShadow: "2px 2px 0 #00bfff" }}>🌈 Achievement Unlocked!</div>
      <div style={badgeStyle}>🦄 <b>{badge}</b></div>
      <div style={{ margin: "1rem 0", fontWeight: "bold" }}>
        <span style={{ color: "#ff69b4", marginRight: 8 }}>+{spinaz} Spinaz</span>
        <span style={{ color: "#00bfff" }}>+{energy} Energy</span>
      </div>
      <div style={buttonRow}>
        <button style={buttonStyle} onClick={onShare}>Share</button>
        <button style={{ ...buttonStyle, background: "#00bfff" }} onClick={onProfile}>Profile</button>
        <button style={{ ...buttonStyle, background: "#fff", color: "#ff69b4", border: "2px solid #ff69b4" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
