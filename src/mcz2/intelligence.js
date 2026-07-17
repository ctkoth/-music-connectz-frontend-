// Intelligence ConnectZ — AI creation suite data. Categories filled in with
// sensible, real-world options. Everything created here attributes Corey Knap
// to the applicable role, watermarks output, and (for reusable media) charges
// a 10% K-Oth royalty when used on DistributeZ / CollabZ / BattleZ.

// Image ConnectZ — user's types plus the ones creators actually use.
export const IMAGE_TYPES = [
  { name: "Song Cover", ratio: "1:1" },
  { name: "Album Cover", ratio: "1:1" },
  { name: "Playlist Cover", ratio: "1:1" },
  { name: "Profile Picture", ratio: "1:1" },
  { name: "Promotional Picture", ratio: "4:5" },
  { name: "Banner", ratio: "3:1" },
  { name: "Phone Background", ratio: "9:19.5" },
  { name: "Video Thumbnail", ratio: "16:9" },
  { name: "Story / Reel", ratio: "9:16" },
  { name: "Lyric Card", ratio: "1:1" },
  { name: "Logo", ratio: "1:1" },
  { name: "Merch Print", ratio: "4:5" },
];

// Video ConnectZ — user's three plus common creator formats.
export const VIDEO_TYPES = [
  { name: "Music Video", ratio: "16:9" },
  { name: "Bio Video", ratio: "16:9" },
  { name: "Promotional Video", ratio: "1:1" },
  { name: "Lyric Video", ratio: "16:9" },
  { name: "Visualizer", ratio: "1:1" },
  { name: "Teaser / Trailer", ratio: "9:16" },
  { name: "Shorts / Reel", ratio: "9:16" },
  { name: "Behind-the-Scenes", ratio: "16:9" },
];

// Mix ConnectZ — AI mix/master.
export const MIX_MODES = ["Mix", "Master", "Mix + Master"];
export const MIX_TARGETS = [
  { name: "Streaming", lufs: "-14 LUFS" },
  { name: "Club / DJ", lufs: "-8 LUFS" },
  { name: "Broadcast", lufs: "-16 LUFS" },
  { name: "CD / Loud", lufs: "-9 LUFS" },
];
export const MIX_EXTRAS = ["Vocal tuning", "De-ess", "Stereo widen", "Stem separation", "Noise reduction", "Analog warmth"];

// Instrumental ConnectZ — MIDI generation.
export const INSTR_GENRES = ["Trap", "Boom Bap", "Drill", "R&B", "Pop", "House", "Afrobeats", "Lo-Fi", "Rock", "Jazz", "Cinematic", "Reggaeton"];
export const INSTR_INSTRUMENTS = ["808 / Bass", "Drums", "Piano / Keys", "Guitar", "Synth Lead", "Strings", "Brass", "Pads", "Bells", "Flute", "Choir", "Pluck"];
// Keys with a Corey-voice read on their mood. StatZ can search key by mood.
export const KEYS = [
  { key: "C major", mood: "Bright and open — nothing to hide." },
  { key: "A minor", mood: "The natural ache — melancholy that feels like home." },
  { key: "G major", mood: "Friendly, campfire-honest, easy to love." },
  { key: "E minor", mood: "Restless longing — the guitar's favorite heartbreak." },
  { key: "D major", mood: "Triumphant, top-down energy, chest out." },
  { key: "D minor", mood: "The saddest key — pure, dignified tears." },
  { key: "F major", mood: "Warm and pastoral — a soft place to land." },
  { key: "F minor", mood: "Obsessive and aching — can't let it go." },
  { key: "Bb minor", mood: "Midnight trap — cold, luxurious, dangerous." },
  { key: "A major", mood: "Confident and sunlit — the anthem key." },
  { key: "B minor", mood: "Solitary, introspective, staring out the window." },
  { key: "Eb major", mood: "Bold and heroic — brass-band proud." },
];

// Ocular Code ConnectZ — AI game generation, tier-gated languages + complexity.
export const OCC_TIERS = {
  free: { label: "Free", complexity: "Basic", desc: "Simple browser games — one mechanic, no build pipeline.", languages: ["JavaScript / HTML5", "Python"] },
  premium: { label: "Premium", complexity: "Medium", desc: "Full 2D/3D games in any engine except Unreal.", languages: ["JavaScript / HTML5", "Python", "C#", "GDScript (Godot)", "Lua", "TypeScript", "Java"] },
  statz: { label: "StatZ", complexity: "Advanced", desc: "Any language including C++/Unreal, plus systems languages.", languages: ["C++ (Unreal)", "Rust", "C#", "GDScript (Godot)", "Lua", "TypeScript", "Java", "Python", "JavaScript / HTML5"] },
};
export function occTierFor(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return OCC_TIERS.statz;
  if (t.includes("premium") || t.includes("pro")) return OCC_TIERS.premium;
  return OCC_TIERS.free;
}

// Sentence ConnectZ — document types.
export const DOC_TYPES = ["LyricZ", "EssayZ", "ContractZ", "Bio", "Press Release", "Guitar Tabs", "Sheet Music"];

// Intelligence sub-apps for the hub tabs.
export const INTEL_APPS = [
  { id: "image", name: "Image ConnectZ", emoji: "🖼️", icon: "imageconnectz.png", role: "Designer" },
  { id: "instrumental", name: "Instrumental ConnectZ", emoji: "🎹", icon: "instrumentalconnectz.png", role: "Beat Producer" },
  { id: "mix", name: "Mix ConnectZ", emoji: "🎚️", icon: "mixez.png", role: "Mix Engineer" },
  { id: "video", name: "Video ConnectZ", emoji: "📺", icon: "videoz.png", role: "Videographer" },
  { id: "sentence", name: "Sentence ConnectZ", emoji: "📃", icon: "sentencez.png", role: "Ghostwriter" },
  { id: "occ", name: "Ocular Code ConnectZ", emoji: "👁️‍🗨️", icon: "occ.png", role: "Developer" },
];
