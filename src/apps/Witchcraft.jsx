// Witchcraft 🔮 — DawZ's Mixcraft-style DAW. Same engine, session and windows as every DAW in src/daw/
// (MIDI, piano roll, effects, takes, mixer, bounce); what makes it Witchcraft is that it starts from
// the LOOP LIBRARY: drums, chords, keys, bass and arps in your key and tempo, one tap to a track.
import Workspace from "../daw/Workspace.jsx";

export const WITCHCRAFT = {
  app: "witchcraft",
  name: "Witchcraft",
  emoji: "🔮",
  icon: "witchcraft.png",
  tagline: "Approachable magic — pick loops in your key, stack them on tracks, record over them, bounce.",
  windows: ["loops", "edit", "mix"],
  windowNames: { edit: "Tracks", mix: "Mixer" },
  editMode: "grid",
};

export default function Witchcraft() {
  return <Workspace workflow={WITCHCRAFT} />;
}
