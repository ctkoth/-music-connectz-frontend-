// GameZ taxonomy + seed catalog. User-made games from OCC publish here, sorted
// by genre and subgenre. Real games live in AppState (state.games); this seeds
// the browser so it's populated before anyone generates one.

export const GAME_GENRES = [
  { name: "Action", emoji: "💥", subgenres: ["Platformer", "Beat 'em up", "Hack & Slash", "Stealth"] },
  { name: "RPG", emoji: "⚔️", subgenres: ["Action RPG", "JRPG", "Roguelike", "Tactical"] },
  { name: "Strategy", emoji: "♟️", subgenres: ["RTS", "Turn-based", "Tower Defense", "4X"] },
  { name: "Shooter", emoji: "🔫", subgenres: ["FPS", "Top-down", "Bullet Hell", "Twin-stick"] },
  { name: "Puzzle", emoji: "🧩", subgenres: ["Match-3", "Logic", "Physics", "Word"] },
  { name: "Racing", emoji: "🏎️", subgenres: ["Arcade", "Sim", "Kart", "Endless"] },
  { name: "Fighting", emoji: "🥊", subgenres: ["2D Fighter", "Platform Fighter", "Arena"] },
  { name: "Simulation", emoji: "🌱", subgenres: ["Life", "Tycoon", "Sandbox", "Farming"] },
  { name: "Sports", emoji: "🏀", subgenres: ["Basketball", "Soccer", "Skating", "Golf"] },
  { name: "Horror", emoji: "👻", subgenres: ["Survival", "Psychological", "Escape"] },
  { name: "Adventure", emoji: "🗺️", subgenres: ["Point & Click", "Visual Novel", "Open World"] },
  { name: "Arcade", emoji: "🕹️", subgenres: ["Endless Runner", "Rhythm", "Retro"] },
];

export const GAME_GENRE_NAMES = GAME_GENRES.map((g) => g.name);

export function subgenresFor(genre) {
  return GAME_GENRES.find((g) => g.name === genre)?.subgenres || [];
}

export function genreEmoji(genre) {
  return GAME_GENRES.find((g) => g.name === genre)?.emoji || "🎮";
}

export const SEED_GAMES = [
  { id: "g-neon-runner", title: "Neon Runner", author: "K-Oth", genre: "Arcade", subgenre: "Endless Runner", lang: "JavaScript / HTML5", plays: 4210, rating: 4.7, desc: "Dash through a synthwave skyline, dodging traffic to your own uploaded track." },
  { id: "g-808-defense", title: "808 Defense", author: "BassGoblin", genre: "Strategy", subgenre: "Tower Defense", lang: "TypeScript", plays: 1890, rating: 4.4, desc: "Place speakers on the grid; each drops a bassline that stuns incoming waves." },
  { id: "g-cipher-lock", title: "Cipher Lock", author: "Lilith", genre: "Puzzle", subgenre: "Logic", lang: "Python", plays: 3025, rating: 4.8, desc: "Crack rotating ocular-code locks before the timer resets the board." },
  { id: "g-midnight-duel", title: "Midnight Duel", author: "Azrael", genre: "Fighting", subgenre: "2D Fighter", lang: "C#", plays: 2560, rating: 4.5, desc: "A four-button fighter where combos are built from rhythm inputs." },
  { id: "g-crate-tycoon", title: "Crate Tycoon", author: "ParcelPrimate", genre: "Simulation", subgenre: "Tycoon", lang: "GDScript (Godot)", plays: 980, rating: 4.1, desc: "Run a label warehouse — route shipments, upgrade forklifts, don't miss drops." },
  { id: "g-void-descent", title: "Void Descent", author: "Kaya", genre: "Horror", subgenre: "Survival", lang: "C++ / Unreal", plays: 1444, rating: 4.6, desc: "Descend a collapsing studio; the sound design is the monster." },
  { id: "g-pixel-pitch", title: "Pixel Pitch", author: "SingZ", genre: "Sports", subgenre: "Soccer", lang: "JavaScript / HTML5", plays: 2110, rating: 4.2, desc: "Retro 5-a-side where shot power scales with your vocal pitch accuracy." },
  { id: "g-hex-raid", title: "Hex Raid", author: "Corey", genre: "Shooter", subgenre: "Twin-stick", lang: "Lua", plays: 3380, rating: 4.5, desc: "Twin-stick arena shooter with procedurally-generated hex arenas." },
];
