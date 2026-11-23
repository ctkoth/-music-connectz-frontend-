// Studio Dragon 🐉 — DawZ's Studio One-style DAW. The engine, the session and every window are the shared ones in src/daw/;
// what makes it Studio Dragon is one window and drag and drop: the arrangement, the mixer and a browser sit together, and you
// drop a sound, an effect, a tone or a loop where it goes. The song is a row of named sections you can drag into a new order,
// with the music inside going along, and songwriting and mastering are one tab or one press away, in the same room.
import Workspace from "../daw/Workspace.jsx";

export const STUDIO_DRAGON = {
  app: "studiodragon",
  name: "Studio Dragon",
  emoji: "🐉",
  icon: "studiodragon.png",
  tagline: "One window, drag and drop everything — drop a sound on a track, an effect on a channel, a song section where it goes.",
  windows: ["edit", "song", "drummer"],
  windowNames: { edit: "Arrange", song: "Songwriter", drummer: "Drummer" },
  editMode: "grid",
  oneWindow: true,      // the mixer sits under the arrangement instead of behind a tab
  browser: true,        // effects, tones and loops, each draggable onto a track
  arranger: true,       // the song-section track
};

export default function StudioDragon() {
  return <Workspace workflow={STUDIO_DRAGON} />;
}
