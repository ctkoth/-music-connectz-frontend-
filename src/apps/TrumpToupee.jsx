// Trump Toupee 🤵🏼‍♂️ — DawZ's Bitwig-style DAW. Same engine, session and windows as every DAW in src/daw/;
// what it adds is only what the engine really has: edit, mix and bounce, MIDI, and automation lanes you draw
// on any track (StatZ's). A clip launcher and a modulation matrix are NOT built, so the tagline does not
// promise them — a DAW's description is a claim about the code.
import Workspace from "../daw/Workspace.jsx";

export const TRUMP_TOUPEE = {
  app: "trumptoupee",
  name: "Trump Toupee",
  emoji: "🤵🏼‍♂️",
  icon: "trump_toupee.png",
  tagline: "Modern and flashy — record, edit, MIDI, mix and bounce, with automation drawn on any track.",
  windows: ["edit", "mix"],
  editMode: "grid",
};

export default function TrumpToupee() {
  return <Workspace workflow={TRUMP_TOUPEE} />;
}
