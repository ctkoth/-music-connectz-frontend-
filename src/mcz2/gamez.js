// GameZ taxonomy + seed catalog. User-made games from OCC publish here, sorted
// by genre and subgenre. Real games live in AppState (state.games); this seeds
// the browser so it's populated before anyone generates one.
//
// Full °genre / `subgenre taxonomy per the Music ConnectZ blueprint.

export const GAME_GENRES = [
  { name: "Action", emoji: "💥", subgenres: ["Platformer", "Hack and Slash", "Beat 'Em Up", "Roguelike / Roguelite", "Survival", "Flight Combat", "Vehicular Combat", "Run and Gun"] },
  { name: "Action-Adventure", emoji: "🗡️", subgenres: ["Open World / Sandbox", "Metroidvania", "Stealth", "Linear Action-Adventure"] },
  { name: "Adventure", emoji: "🗺️", subgenres: ["Point-and-Click / Graphic Adventure", "Visual Novel", "Walking Simulator", "Narrative / Interactive Movie", "Text-Based / Interactive Fiction", "Escape Room"] },
  { name: "Shooter", emoji: "🔫", subgenres: ["First-Person Shooter (FPS)", "Third-Person Shooter (TPS)", "Tactical Shooter", "Arena Shooter", "Hero Shooter", "Light Gun"] },
  { name: "Shoot 'Em Up", emoji: "🚀", subgenres: ["Top-Down Shooter", "Bullet Hell", "Battle Royale"] },
  { name: "Role-Playing (RPG)", emoji: "⚔️", subgenres: ["Action RPG", "Turn-Based RPG", "JRPG", "MMORPG", "Tactical RPG", "Dungeon Crawler", "Soulslike", "Sandbox / Open World RPG"] },
  { name: "Strategy", emoji: "♟️", subgenres: ["Real-Time Strategy (RTS)", "Real-Time Tactics (RTT)", "Turn-Based Strategy (TBS)", "Turn-Based Tactics (TBT)", "Tower Defense", "4X", "Grand Strategy / Wargame", "MOBA", "Auto-Battler / Auto Chess", "Artillery"] },
  { name: "Simulation", emoji: "🌱", subgenres: ["Life / Social Simulation", "City Builder / Construction", "Vehicle Simulation", "Flight Simulation", "Management / Business", "Farming Simulation", "Pet Raising"] },
  { name: "Sports", emoji: "🏀", subgenres: ["Football / Soccer", "American Football", "Basketball", "Baseball", "Golf", "Tennis", "Hockey", "Boxing / Combat Sports", "MMA / Wrestling", "Extreme Sports", "Olympic / Mixed Sports"] },
  { name: "Racing", emoji: "🏎️", subgenres: ["Arcade Racing", "Simulation Racing", "Kart Racing", "Futuristic Racing", "Combat Racing"] },
  { name: "Fighting", emoji: "🥊", subgenres: ["Traditional 2D Fighter", "3D Fighter", "Arena Brawler / Party Fighter", "Hack and Slash Fighter"] },
  { name: "Puzzle", emoji: "🧩", subgenres: ["Logic Puzzle", "Physics-Based Puzzle", "Match-Three / Tile Matching", "Exploration Puzzle", "Word Construction", "Trivia / Quiz", "Falling Block (Tetris-style)"] },
  { name: "Horror / Survival Horror", emoji: "👻", subgenres: ["Psychological Horror", "Survival Horror", "Stealth Horror"] },
  { name: "Rhythm / Music", emoji: "🎵", subgenres: ["Peripheral-Based", "Rhythm Action", "Music Sandbox"] },
  { name: "Sandbox / Open World", emoji: "🧱", subgenres: ["Creative Sandbox", "Survival Sandbox", "Open World Survival Craft"] },
  { name: "Casual / Idle", emoji: "🍬", subgenres: ["Idle / Incremental", "Clicker", "Hyper-Casual", "Party Games", "Mini-Games", "Exergames"] },
  { name: "Other", emoji: "🎲", subgenres: ["Pinball", "Board Game / Card Game", "Dating Simulation", "Educational / Edutainment", "Programming Games", "Hidden Object"] },
];

export const GAME_GENRE_NAMES = GAME_GENRES.map((g) => g.name);

export function subgenresFor(genre) {
  return GAME_GENRES.find((g) => g.name === genre)?.subgenres || [];
}

export function genreEmoji(genre) {
  return GAME_GENRES.find((g) => g.name === genre)?.emoji || "🎮";
}

// Coding-language options OCC can build in, with the tier each requires.
// Premium unlocks any language *except* C++ (Unreal is reserved for StatZ);
// StatZ unlocks everything including C++ / Unreal. Free is limited to the
// lightweight browser stack.
export const GAME_LANGS = [
  { name: "JavaScript / HTML5", tier: "free" },
  { name: "Python", tier: "free" },
  { name: "TypeScript", tier: "premium" },
  { name: "Lua", tier: "premium" },
  { name: "C#", tier: "premium" },
  { name: "GDScript (Godot)", tier: "premium" },
  { name: "Java", tier: "premium" },
  { name: "Rust", tier: "premium" },
  { name: "Go", tier: "premium" },
  { name: "C++ / Unreal", tier: "statz" },
];

// Rank tiers so we can gate: a member on `tier` can use any language whose
// required tier is at or below theirs. debug (owner) clears everything.
const TIER_RANK = { free: 0, premium: 1, statz: 2, debug: 3 };

export function tierRank(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("debug")) return TIER_RANK.debug;
  if (t.includes("statz") || t.includes("stats")) return TIER_RANK.statz;
  if (t.includes("premium") || t.includes("pro")) return TIER_RANK.premium;
  return TIER_RANK.free;
}

export function langsForTier(tier) {
  const rank = tierRank(tier);
  return GAME_LANGS.map((l) => ({ ...l, locked: TIER_RANK[l.tier] > rank }));
}

export const SEED_GAMES = [
  { id: "g-neon-runner", title: "Neon Runner", author: "K-Oth", genre: "Casual / Idle", subgenre: "Hyper-Casual", lang: "JavaScript / HTML5", plays: 4210, rating: 4.7, desc: "Dash through a synthwave skyline, dodging traffic to your own uploaded track." },
  { id: "g-808-defense", title: "808 Defense", author: "BassGoblin", genre: "Strategy", subgenre: "Tower Defense", lang: "TypeScript", plays: 1890, rating: 4.4, desc: "Place speakers on the grid; each drops a bassline that stuns incoming waves." },
  { id: "g-cipher-lock", title: "Cipher Lock", author: "Lilith", genre: "Puzzle", subgenre: "Logic Puzzle", lang: "Python", plays: 3025, rating: 4.8, desc: "Crack rotating ocular-code locks before the timer resets the board." },
  { id: "g-midnight-duel", title: "Midnight Duel", author: "Azrael", genre: "Fighting", subgenre: "Traditional 2D Fighter", lang: "C#", plays: 2560, rating: 4.5, desc: "A four-button fighter where combos are built from rhythm inputs." },
  { id: "g-crate-tycoon", title: "Crate Tycoon", author: "ParcelPrimate", genre: "Simulation", subgenre: "Management / Business", lang: "GDScript (Godot)", plays: 980, rating: 4.1, desc: "Run a label warehouse — route shipments, upgrade forklifts, don't miss drops." },
  { id: "g-void-descent", title: "Void Descent", author: "Kaya", genre: "Horror / Survival Horror", subgenre: "Survival Horror", lang: "C++ / Unreal", plays: 1444, rating: 4.6, desc: "Descend a collapsing studio; the sound design is the monster." },
  { id: "g-pixel-pitch", title: "Pixel Pitch", author: "SingZ", genre: "Sports", subgenre: "Football / Soccer", lang: "JavaScript / HTML5", plays: 2110, rating: 4.2, desc: "Retro 5-a-side where shot power scales with your vocal pitch accuracy." },
  { id: "g-hex-raid", title: "Hex Raid", author: "Corey", genre: "Shoot 'Em Up", subgenre: "Top-Down Shooter", lang: "Lua", plays: 3380, rating: 4.5, desc: "Twin-stick arena shooter with procedurally-generated hex arenas." },
];
