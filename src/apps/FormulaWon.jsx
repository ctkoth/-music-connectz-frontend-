// FormulaWon 🚦 — DawZ's GarageBand-style DAW. Same engine, session and windows as every DAW in
// src/daw/; what makes it FormulaWon is that it starts with a DRUMMER instead of a blank timeline:
// pick a style, set how busy and how hard, send it to a track, then record over it. The on-ramp.
import Workspace from "../daw/Workspace.jsx";

export const FORMULAWON = {
  app: "formulawon",
  name: "FormulaWon",
  emoji: "🚦",
  icon: "dawz_formulawon.png",
  tagline: "Zero to a track in minutes — a drummer that plays for you, then press Record.",
  windows: ["drummer", "edit", "mix"],
  windowNames: { edit: "Tracks", mix: "Mixer" },
  editMode: "grid",
};

export default function FormulaWon() {
  return <Workspace workflow={FORMULAWON} />;
}
