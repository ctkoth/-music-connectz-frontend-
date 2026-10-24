import { useState } from "react";
import { NEEDS } from "../needs.js";

// "By what you need": pick what you want, see the apps that do it and what each
// does for you. Opening one goes to that app's own main control (the caller's
// `onOpen`), so this is a way in, never a dead end.
export default function NeedsView({ onOpen }) {
  const [open, setOpen] = useState(null);
  const need = NEEDS.find((n) => n.key === open);

  if (need) {
    return (
      <div className="needs-panel" style={{ textAlign: "left", maxWidth: 640, margin: "0 auto" }}>
        <button className="toolz-more-button" onClick={() => setOpen(null)}>← What do you need?</button>
        <h2 style={{ margin: "12px 0 4px" }}>{need.emoji} {need.title}</h2>
        <p className="toolz-subtitle" style={{ marginBottom: 12 }}>{need.blurb}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {need.apps.map((a) => (
            <li key={a.key}>
              <button type="button" className="category-card cyan" onClick={() => onOpen(a.key)}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px" }}>
                <div className="category-label" style={{ textAlign: "left" }}>{a.label}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{a.why}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <>
      <p className="toolz-subtitle" style={{ marginBottom: 8 }}>What do you want to do?</p>
      <div className="category-grid">
        {NEEDS.map((n) => (
          <button key={n.key} className="category-card magenta" onClick={() => setOpen(n.key)}>
            <div style={{ fontSize: 28 }} aria-hidden="true">{n.emoji}</div>
            <div className="category-label">{n.title}</div>
          </button>
        ))}
      </div>
    </>
  );
}
