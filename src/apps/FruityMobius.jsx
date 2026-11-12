// Fruity Möbius 🍑 — DawZ's FL Studio-style DAW. Same engine, session and windows as every DAW in
// src/daw/; what makes it Fruity Möbius is that it starts from the PATTERN: a Channel Rack step
// sequencer with built-in drum, 808 and pluck sounds, patterns you clone and vary, and Send to
// Playlist to arrange them as audio — then the same Mixer and bounce as the rest.
import Workspace from "../daw/Workspace.jsx";

export const FRUITY_MOBIUS = {
  app: "fruitymobius",
  name: "Fruity Möbius",
  emoji: "🍑",
  icon: "fruity_mobius.png",
  tagline: "Pattern-first beat machine — tap the steps, loop it, clone it, send it to the Playlist.",
  windows: ["rack", "edit", "mix"],
  windowNames: { edit: "Playlist", mix: "Mixer" },
  editMode: "grid",
};

export default function FruityMobius() {
  return <Workspace workflow={FRUITY_MOBIUS} />;
}
