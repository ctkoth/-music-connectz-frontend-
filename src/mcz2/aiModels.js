// OCC AI voices/models + the minimum per-message cost (cents) to cover the
// model run. Corey GPT is the cheapest house model — tuned on member input and
// the built-in curricula, so it costs the least to serve. Costs mirror the
// backend AI_MODEL_COSTS; the server is the source of truth and enforces them.

export const AI_MODELS = [
  { id: "corey-gpt", label: "Corey GPT", emoji: "🎤", costCents: 1, note: "Straight-up K-Oth voice — how all MCZ talks. Learns from your input + the built-in courses. Cheapest to run." },
  { id: "standard", label: "Standard", emoji: "🤖", costCents: 4, note: "Plain, neutral assistant voice." },
  { id: "technical", label: "Technical", emoji: "📐", costCents: 4, note: "Terse, code-first, minimal chatter." },
];

export function aiModel(id) {
  return AI_MODELS.find((m) => m.id === id) || AI_MODELS[0];
}

export const centsLabel = (c) => (c <= 0 ? "free" : c < 100 ? `${c}¢` : `$${(c / 100).toFixed(2)}`);

// College-course curricula Corey GPT teaches. Each course has modules of
// lessons; OCC pulls from these when you ask, and folds in what you teach it.
export const CURRICULA = [
  {
    id: "digital-art",
    name: "Digital Art",
    emoji: "🎨",
    blurb: "From color theory to release-ready cover art — the visual side of your brand.",
    keywords: ["art", "design", "draw", "paint", "cover", "color", "illustration", "photoshop", "vector", "logo"],
    modules: [
      { title: "Foundations", lessons: ["Color theory: hue, value, saturation & harmony", "Composition: rule of thirds, focal points, balance", "Value & light: reading form before color", "Perspective & proportion basics"] },
      { title: "Digital tools", lessons: ["Raster vs vector — when to use each", "Layers, masks & non-destructive editing", "Brushes, textures & custom presets", "Resolution, DPI & export for print vs web"] },
      { title: "Character & concept", lessons: ["Silhouette-first character design", "Concept boards & mood exploration", "Typography as image (logo/wordmark)"] },
      { title: "Cover art & brand", lessons: ["Designing a release cover that reads at thumbnail size", "Consistent brand palette & template kit", "AI-assisted art: prompting, cleanup & the ethics/credit line"] },
    ],
  },
  {
    id: "music-theory",
    name: "Music Theory",
    emoji: "🎼",
    blurb: "The language of music — notes to arrangement, so you can build and communicate ideas.",
    keywords: ["theory", "chord", "scale", "key", "note", "interval", "rhythm", "melody", "harmony", "progression", "song structure"],
    modules: [
      { title: "Building blocks", lessons: ["Notes, the staff & the chromatic scale", "Intervals: seconds through octaves", "Rhythm & meter: note values, time signatures"] },
      { title: "Scales & keys", lessons: ["Major & minor scales", "The circle of fifths & key signatures", "Modes (Dorian, Mixolydian…) for flavor"] },
      { title: "Harmony", lessons: ["Triads & seventh chords", "Diatonic chord progressions (I–IV–V, ii–V–I)", "Voice leading & inversions", "Borrowed chords & tension/release"] },
      { title: "Songwriting", lessons: ["Melody writing over changes", "Song structure: verse/chorus/bridge", "Arrangement: layering, dynamics & space", "Ear training: recognizing intervals & chords"] },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    emoji: "📣",
    blurb: "Get heard — brand, audience, content and campaigns that actually move numbers.",
    keywords: ["marketing", "promo", "brand", "audience", "fans", "social", "campaign", "ads", "funnel", "release", "growth", "analytics"],
    modules: [
      { title: "Brand & positioning", lessons: ["Defining your artist brand & story", "Positioning: who you're for and why", "Visual & voice consistency across platforms"] },
      { title: "Audience", lessons: ["Building listener personas", "Where your audience actually is", "Email/SMS list = the fans you own"] },
      { title: "Content & release", lessons: ["Content pillars & a repeatable calendar", "Release/campaign planning: teaser → drop → sustain", "Short-form video hooks that convert"] },
      { title: "Growth & measurement", lessons: ["Funnels: awareness → fan → superfan", "Reading analytics without lying to yourself", "Paid ads 101: targeting, creative, budget & CPR"] },
    ],
  },
  {
    id: "music-legal",
    name: "Music Legal",
    emoji: "⚖️",
    blurb: "Protect your work and your money — rights, splits, contracts and clearances.",
    keywords: ["legal", "copyright", "royalty", "royalties", "publishing", "contract", "license", "sample", "clearance", "split", "trademark", "llc", "sync"],
    modules: [
      { title: "Rights & ownership", lessons: ["Copyright basics: the song vs the recording (composition vs master)", "Publishing & the songwriter's share", "Registering works & why metadata matters"] },
      { title: "Money", lessons: ["Royalty types: mechanical, performance, sync, streaming", "Splits: agreeing them in writing before release", "PROs, publishers & collection societies"] },
      { title: "Contracts", lessons: ["Recording, distribution & management deals — what to watch", "Sync licensing: placements in film/TV/ads", "Sampling & clearance: getting permission the right way"] },
      { title: "Business protection", lessons: ["Trademarks: protecting your artist name", "Entity/LLC basics & why it shields you", "Disputes: resolution, and when to get a lawyer"] },
    ],
  },
];

export function courseById(id) {
  return CURRICULA.find((c) => c.id === id) || null;
}

// Match a free-text question to a course by keyword. Returns the course or null.
export function courseForQuery(text) {
  const q = (text || "").toLowerCase();
  return CURRICULA.find((c) => c.keywords.some((k) => q.includes(k))) || null;
}
