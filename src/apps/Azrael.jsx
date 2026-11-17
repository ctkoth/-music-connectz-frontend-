// Azrael ☠️ — DawZ's Reaper-style DAW. Same engine, session and windows as every DAW in src/daw/;
// what makes it Azrael is that it bends to the member: every shortcut is theirs to set, and the
// whole DAW wears the skin they pick. Lean by default — edit, mix, MIDI, nothing in the way.
import Workspace from "../daw/Workspace.jsx";

export const AZRAEL = {
  app: "azrael",
  name: "Azrael",
  emoji: "☠️",
  icon: "azrael.png",
  tagline: "Lightweight and yours — set every shortcut, skin it, record, edit, mix, bounce.",
  windows: ["edit", "mix", "actions"],
  editMode: "slip",
};

export default function Azrael() {
  return <Workspace workflow={AZRAEL} />;
}
