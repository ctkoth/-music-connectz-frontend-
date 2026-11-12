// Intuition 💭 — DawZ's Logic-style DAW. Same engine, session and windows as every DAW in src/daw/;
// what makes it Intuition is the SONGWRITER: a key, a progression from the library and a stack of
// instruments become a chord bed, Smart Tempo sets the BPM from your taps, and the Smart Drummer
// (shared with FormulaWon) plays under it. Then Tracks, Mixer and bounce.
import Workspace from "../daw/Workspace.jsx";

export const INTUITION = {
  app: "intuition",
  name: "Intuition",
  emoji: "💭",
  icon: "intuition.png",
  tagline: "A songwriter's DAW — chords in any key, stacked instruments, a drummer, then record over it.",
  windows: ["song", "drummer", "edit", "mix"],
  windowNames: { edit: "Tracks", mix: "Mixer" },
  editMode: "grid",
};

export default function Intuition() {
  return <Workspace workflow={INTUITION} />;
}
