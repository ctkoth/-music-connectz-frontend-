// Arsenal ⚔️ — DawZ's Pro Tools-style DAW. The engine, the session and every window are the shared
// ones in src/daw/; what makes it Arsenal is its workflow: an Edit window and a Mix window, the
// Slip / Grid / Shuffle edit modes (Spot is the region editor's exact start), playlists for takes on
// every track, and recording that keeps what it replaced as the previous take.
import Workspace from "../daw/Workspace.jsx";

export const ARSENAL = {
  app: "arsenal",
  name: "Arsenal",
  emoji: "⚔️",
  icon: "arsenal.png",
  tagline: "Multitrack recording, surgical editing and a mixer — the session engineers reach for when it has to hold up.",
  windows: ["edit", "mix"],
  editMode: "slip",
};

export default function Arsenal() {
  return <Workspace workflow={ARSENAL} />;
}
