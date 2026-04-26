import React from "react";

const container = {
  background: "#e0ffff",
  border: "4px dashed #00bfff",
  borderRadius: "18px",
  boxShadow: "0 4px 24px #00bfff88",
  fontFamily: 'Courier New, monospace',
  color: "#00bfff",
  padding: "2rem 1.5rem 1.5rem 1.5rem",
  width: "340px",
  margin: "2rem auto",
  textAlign: "center",
};

const notif = {
  margin: "0.7rem 0",
  fontSize: "1.1rem",
  color: "#ff69b4",
};

const reward = {
  color: "#00bfff",
  fontWeight: "bold",
  marginLeft: 8,
};

const viewAll = {
  color: "#ff69b4",
  marginTop: "1rem",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "1rem",
};

export default function NotificationsRetro({ notifications = [
  { text: "🦄 Beatmaker Pro Unlocked!", spinaz: 10, energy: 5 },
  { text: "🌈 Streak Master Unlocked!", spinaz: 5, energy: 2 },
] }) {
  return (
    <div style={container}>
      <div style={{ fontSize: "1.2rem", color: "#00bfff" }}>📺 Notifications</div>
      {notifications.map((n, i) => (
        <div key={i} style={notif}>
          <span>{n.text}</span>
          <span style={reward}>+{n.spinaz} Spinaz</span>
          <span style={{ ...reward, color: "#ff69b4" }}>+{n.energy} Energy</span>
        </div>
      ))}
      <div style={viewAll}>View All</div>
    </div>
  );
}
