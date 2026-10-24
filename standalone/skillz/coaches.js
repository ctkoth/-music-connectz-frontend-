// The SkillZ shell's table of contents: which coaches it holds, in the order the hub
// and the tab bar show them, and what each one is called.
//
// Pure data, no JSX and nothing that reads import.meta.env, so it runs under plain
// node (`src/skillz.test.mjs` holds it against App.jsx and src/standalone.js).
//
// What is NOT here, on purpose:
//  * No dimension names, no counts, no prices. What a coach scores a take on and what
//    a take costs are served (`/api/<key>/coach/`, `/api/economy/skillz/`) and a copy
//    here would be a second place they live.
//  * No claim beyond what every coach does: record or upload a take, get it scored,
//    get a drill. The main site's taglines say more ("16 style tracks", "combo meter")
//    and are not repeated here, because this is the screen a store reviewer reads.
//
// `key`, `icon`, `label` and `accent` mirror the `<InstrumentZ …>` element each coach
// has in App.jsx, and the test fails if they drift. `noun` is the server's own word
// for the coach (`instruments.INSTRUMENTS[key]["coach"]`).
export const COACHES = [
  { key: "singz", label: "SingZ", icon: "singz.png", accent: "#f472b6", noun: "Vocal coach" },
  { key: "rapz", label: "RapZ", icon: "rapz.png", accent: "#f59e0b", noun: "Rap coach" },
  { key: "guitarz", label: "GuitarZ", icon: "guitarz.png", accent: "#eab308", noun: "Guitar coach" },
  { key: "bassz", label: "BassZ", icon: "bassz.png", accent: "#7c3aed", noun: "Bass coach" },
  { key: "keyz", label: "KeyZ", icon: "keyz.png", accent: "#38bdf8", noun: "Keys coach" },
  { key: "violinz", label: "ViolinZ", icon: "violinz.png", accent: "#b45309", noun: "Strings coach" },
  { key: "drumz", label: "DrumZ", icon: "drumz.png", accent: "#ef4444", noun: "Drum coach" },
].map((c) => ({
  ...c,
  tagline: `${c.noun} — record or upload a take, get it scored, and a drill for what to fix.`,
}));

// Every tab: the hub is Home, each coach is a tab of its own. `key` is the Music
// ConnectZ tab name (what goToSpot / goToTab name), `path` is the hash route.
export const TABS = [
  { key: "skillz", path: "", label: "Home" },
  ...COACHES.map((c) => ({ key: c.key, path: c.key, label: c.label })),
];

// Said on every screen, in what is TRUE of that screen. Every coach screen is AI
// output: Gemini listens to the take and scores it, and Claude checks the advice
// against what Gemini reported. "Stop if it hurts" is not a claim about the code, it
// is the one sentence a coach that may be asked to push a voice or a hand owes.
export const AI_NOTE =
  "Scored by AI, and it can be wrong. It hears one take, not your history or your teacher. " +
  "Stop if anything hurts.";
export const DISCLOSURE = {
  skillz: "One account, shared with Music ConnectZ. Every score here is written by AI.",
  ...Object.fromEntries(COACHES.map((c) => [c.key, AI_NOTE])),
};
