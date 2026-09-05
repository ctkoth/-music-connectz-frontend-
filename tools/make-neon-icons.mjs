// Generates the neon tab icons — one chassis, one glyph per app.
//
// Twenty-six icons drawn by hand would drift: different stroke weights,
// different glow, a wordmark two pixels off on half of them. So the frame,
// the background, the glow filters and the wordmark live here ONCE, and each
// app contributes only the shape in the middle. Adding an app to the set is
// a glyph and a colour, not a redraw.
//
//   node tools/make-neon-icons.mjs
//
// Writes public/icons/<key>-neon.svg. Re-run it after editing a glyph; the
// files are checked in so a deploy never depends on this having been run.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// The MCZ palette, and nothing else. An icon set is a set because it draws
// from one box of pens.
const C = {
  cyan: "#22e6ff",
  pink: "#ff2bd1",
  purple: "#a855f7",
  gold: "#ffcf3f",
  ember: "#ff5500",
  emerald: "#34d399",
  ink: "#f4f2ff",
};

/* ------------------------------------------------------------------ glyphs
   Each returns markup centred in roughly x 130-382, y 96-300. Strokes are
   heavy (12-16) because the dock draws these at 36px, where anything finer
   turns to mud. `a` is the app's accent, `b` a secondary from the palette. */
const G = {
  onboardz: (a, b) => `
    <rect x="150" y="104" width="212" height="196" rx="26" fill="none" stroke="${a}" stroke-width="14"/>
    <path d="M186 162l26 26 52-56" fill="none" stroke="${b}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M186 236h140" stroke="${a}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.75"/>
    <path d="M186 272h92" stroke="${a}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.45"/>`,

  playlistz: (a, b) => `
    <path d="M146 130h150M146 186h150M146 242h96" stroke="${a}" stroke-width="16" stroke-linecap="round"/>
    <path d="M296 226l72 42-72 42z" fill="none" stroke="${b}" stroke-width="15" stroke-linejoin="round"/>`,

  social: (a, b) => `
    <path d="M256 296c-58-40-92-70-92-108a52 52 0 0 1 92-32 52 52 0 0 1 92 32c0 38-34 68-92 108z"
          fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <circle cx="212" cy="180" r="15" fill="${b}"/>
    <circle cx="300" cy="180" r="15" fill="${b}"/>`,

  profilez: (a, b) => `
    <path d="M300 118h84v70a42 42 0 0 1-84 0z" fill="none" stroke="${b}" stroke-width="14" stroke-linejoin="round" stroke-opacity="0.85"/>
    <path d="M148 112h150v86a75 75 0 0 1-150 0z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <circle cx="192" cy="170" r="13" fill="${a}"/>
    <circle cx="254" cy="170" r="13" fill="${a}"/>
    <path d="M196 224a40 40 0 0 0 54 0" fill="none" stroke="${a}" stroke-width="13" stroke-linecap="round"/>
    <path d="M223 274v34M300 230v40" stroke="${a}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.7"/>`,

  specz: (a, b) => `
    <path d="M256 106l38 78 86 12-62 60 15 85-77-40-77 40 15-85-62-60 86-12z"
          fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <circle cx="256" cy="204" r="20" fill="${b}"/>`,

  membershipz: (a, b) => `
    <path d="M146 190l34 88h152l34-88-58 34-52-70-52 70z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <circle cx="256" cy="132" r="16" fill="${b}"/>
    <path d="M180 300h152" stroke="${b}" stroke-width="15" stroke-linecap="round"/>`,

  adz: (a, b) => `
    <rect x="142" y="116" width="228" height="152" rx="22" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M232 164l52 28-52 28z" fill="none" stroke="${b}" stroke-width="14" stroke-linejoin="round"/>
    <path d="M212 302h88" stroke="${a}" stroke-width="15" stroke-linecap="round"/>
    <path d="M256 268v34" stroke="${a}" stroke-width="15"/>`,

  offerz: (a, b) => `
    <rect x="150" y="176" width="212" height="124" rx="16" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M138 152h236v40H138z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M256 152v148" stroke="${b}" stroke-width="15"/>
    <path d="M256 152c-30-46-76-30-58 0M256 152c30-46 76-30 58 0" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="round"/>`,

  mimez: (a, b) => `
    <circle cx="256" cy="188" r="86" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M222 160l24 24M246 160l-24 24" stroke="${b}" stroke-width="13" stroke-linecap="round"/>
    <path d="M290 154l22 22M312 154l-22 22" stroke="${b}" stroke-width="13" stroke-linecap="round"/>
    <path d="M212 232h88" stroke="${b}" stroke-width="14" stroke-linecap="round"/>
    <path d="M256 274v34" stroke="${a}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.6"/>`,

  directz: (a, b) => `
    <rect x="142" y="176" width="228" height="124" rx="16" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M146 152l224-34 8 44-224 34z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M206 128l22 40M266 118l22 40M326 108l22 40" stroke="${b}" stroke-width="13"/>`,

  lessonz: (a, b) => `
    <path d="M256 116l122 56-122 56-122-56z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M180 202v62c0 22 34 40 76 40s76-18 76-40v-62" fill="none" stroke="${b}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M378 172v70" stroke="${a}" stroke-width="13" stroke-linecap="round"/>`,

  singz: (a, b) => `
    <rect x="216" y="98" width="80" height="126" rx="40" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M170 202a86 86 0 0 0 172 0" fill="none" stroke="${b}" stroke-width="15" stroke-linecap="round"/>
    <path d="M256 288v34" stroke="${b}" stroke-width="15" stroke-linecap="round"/>
    <path d="M132 168v34M148 152v66M364 168v34M380 152v66" stroke="${a}" stroke-width="12" stroke-linecap="round" stroke-opacity="0.8"/>`,

  rapz: (a, b) => `
    <g stroke="${b}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.9">
      <path d="M124 268v-52M160 288v-96M352 288v-96M388 268v-52"/>
    </g>
    <rect x="216" y="96" width="80" height="120" rx="40" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M186 196a70 70 0 0 0 140 0" fill="none" stroke="${a}" stroke-width="15" stroke-linecap="round"/>
    <path d="M256 266v46M214 312h84" stroke="${a}" stroke-width="15" stroke-linecap="round"/>`,

  messagez: (a, b) => `
    <rect x="140" y="140" width="232" height="164" rx="22" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M152 158l104 74 104-74" fill="none" stroke="${b}" stroke-width="15" stroke-linejoin="round" stroke-linecap="round"/>`,

  keyconnectz: (a, b) => `
    <circle cx="238" cy="192" r="94" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M144 192h188M238 98c34 40 34 148 0 188M238 98c-34 40-34 148 0 188" fill="none" stroke="${a}" stroke-width="12" stroke-opacity="0.8"/>
    <circle cx="330" cy="268" r="34" fill="none" stroke="${b}" stroke-width="15"/>
    <path d="M352 292l38 38M366 306l-14 14" stroke="${b}" stroke-width="15" stroke-linecap="round"/>`,

  occ: (a, b) => `
    <path d="M126 196c46-62 214-62 260 0-46 62-214 62-260 0z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <circle cx="256" cy="196" r="44" fill="none" stroke="${b}" stroke-width="15"/>
    <circle cx="256" cy="196" r="16" fill="${b}"/>
    <path d="M186 288l-32 30 32 30M326 288l32 30-32 30" fill="none" stroke="${a}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`,

  royaltiez: (a, b) => `
    <ellipse cx="220" cy="164" rx="86" ry="34" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M134 164v56c0 19 39 34 86 34s86-15 86-34v-56" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M134 220v56c0 19 39 34 86 34s86-15 86-34v-56" fill="none" stroke="${a}" stroke-width="15" stroke-opacity="0.75" stroke-linejoin="round"/>
    <path d="M356 308V196" stroke="${b}" stroke-width="16" stroke-linecap="round"/>
    <path d="M320 232l36-36 36 36" fill="none" stroke="${b}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`,

  callz: (a, b) => `
    <path d="M158 122c14-14 38-12 50 4l26 36c9 12 7 29-4 39l-20 18c14 30 38 54 68 68l18-20c10-11 27-13 39-4l36 26c16 12 18 36 4 50l-20 20c-14 14-35 18-53 10-52-23-104-60-142-98s-75-90-98-142c-8-18-4-39 10-53z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M300 150a76 76 0 0 1 62 62M300 106a120 120 0 0 1 106 106" fill="none" stroke="${b}" stroke-width="13" stroke-linecap="round" stroke-opacity="0.9"/>`,

  soundz: (a, b) => `
    <path d="M150 212h56l74-62v212l-74-62h-56z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M326 186a76 76 0 0 1 0 140M362 152a130 130 0 0 1 0 208" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="round"/>`,

  logz: (a, b) => `
    <rect x="150" y="106" width="212" height="196" rx="22" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M186 156h140M186 204h140M186 252h84" stroke="${a}" stroke-width="13" stroke-linecap="round" stroke-opacity="0.65"/>
    <path d="M300 236l30 30-30 30" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`,

  journalz: (a, b) => `
    <path d="M158 116h140a34 34 0 0 1 34 34v152H192a34 34 0 0 1-34-34z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M192 302a34 34 0 0 1 0-68h140" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M356 128l30 30-84 84-38 8 8-38z" fill="none" stroke="${b}" stroke-width="14" stroke-linejoin="round"/>`,

  habitz: (a, b) => `
    <path d="M256 96c46 54 76 88 76 130a76 76 0 0 1-152 0c0-42 30-76 76-130z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M256 186c22 28 34 44 34 62a34 34 0 0 1-68 0c0-18 12-34 34-62z" fill="none" stroke="${b}" stroke-width="14" stroke-linejoin="round"/>`,

  collabz: (a, b) => `
    <rect x="118" y="150" width="180" height="116" rx="58" fill="none" stroke="${a}" stroke-width="16"/>
    <rect x="214" y="150" width="180" height="116" rx="58" fill="none" stroke="${b}" stroke-width="16"/>
    <path d="M256 300v34" stroke="${a}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.6"/>`,

  battlez: (a, b) => `
    <path d="M146 108l152 152M366 108L214 260" fill="none" stroke="${a}" stroke-width="16" stroke-linecap="round"/>
    <path d="M290 268l52 52M170 268l-52 52" fill="none" stroke="${b}" stroke-width="16" stroke-linecap="round"/>
    <circle cx="256" cy="286" r="20" fill="none" stroke="${b}" stroke-width="14"/>`,

  labelz: (a, b) => `
    <path d="M262 108l122 122-132 132-122-122V108z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <circle cx="204" cy="166" r="22" fill="${b}"/>
    <path d="M262 236l14 30 32 4-24 22 6 32-28-16-28 16 6-32-24-22 32-4z" fill="none" stroke="${b}" stroke-width="11" stroke-linejoin="round"/>`,

  groupz: (a, b) => `
    <circle cx="256" cy="146" r="42" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M180 288a76 76 0 0 1 152 0" fill="none" stroke="${a}" stroke-width="15" stroke-linecap="round"/>
    <circle cx="148" cy="182" r="30" fill="none" stroke="${b}" stroke-width="13"/>
    <circle cx="364" cy="182" r="30" fill="none" stroke="${b}" stroke-width="13"/>
    <path d="M108 296a54 54 0 0 1 56-50M404 296a54 54 0 0 0-56-50" fill="none" stroke="${b}" stroke-width="13" stroke-linecap="round"/>`,

  bugz: (a, b) => `
    <rect x="186" y="150" width="140" height="152" rx="70" fill="none" stroke="${a}" stroke-width="15"/>
    <path d="M186 226h140" stroke="${a}" stroke-width="13" stroke-opacity="0.6"/>
    <path d="M214 138a42 42 0 0 1 84 0" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="round"/>
    <path d="M222 112l-22-24M290 112l22-24" stroke="${b}" stroke-width="13" stroke-linecap="round"/>
    <path d="M186 186h-52M186 246h-56M186 296h-46M326 186h52M326 246h56M326 296h46"
          stroke="${a}" stroke-width="13" stroke-linecap="round"/>`,

  funnelz: (a, b) => `
    <path d="M132 116h248l-92 108v86l-64 30v-116z" fill="none" stroke="${a}" stroke-width="15" stroke-linejoin="round"/>
    <path d="M170 156h172" stroke="${b}" stroke-width="13" stroke-linecap="round" stroke-opacity="0.8"/>
    <circle cx="256" cy="330" r="14" fill="${b}"/>`,
};

// key → [label, accent, secondary]. Colours are assigned so the dock reads as
// a set rather than a rainbow accident, and so apps that already have a
// colour in code keep it (SingZ pink, RapZ amber, CollabZ yellow, BugZ cyan).
const APPS = [
  ["onboardz", "OnboardZ", C.emerald, C.gold],
  ["playlistz", "PlaylistZ", C.cyan, C.pink],
  ["social_connectz", "Social ConnectZ", C.pink, C.cyan],
  ["personaz", "ProfileZ", C.purple, C.cyan],
  ["specz", "SpecZ", C.gold, C.pink],
  ["money", "MembershipZ", C.gold, C.emerald],
  ["adz", "AdZ", C.cyan, C.gold],
  ["offerz", "OfferZ", C.emerald, C.gold],
  ["mimez", "MimeZ", C.purple, C.pink],
  ["directz", "DirectZ", C.ember, C.cyan],
  ["lessonz", "LessonZ", C.gold, C.cyan],
  ["singz", "SingZ", C.pink, C.cyan],
  ["rapz", "RapZ", C.gold, C.ember],
  ["messagez", "MessageZ", C.cyan, C.pink],
  ["keyconnectz", "KeyConnectZ", C.emerald, C.gold],
  ["occ", "OCC", C.cyan, C.purple],
  ["logz", "LogZ", C.purple, C.gold],
  ["royaltiez", "RoyaltieZ", C.gold, C.emerald],
  ["callz", "CallZ", C.emerald, C.cyan],
  ["soundz", "SoundZ", C.cyan, C.pink],
  ["journalz", "JournalZ", C.pink, C.gold],
  ["habitz", "HabitZ", C.ember, C.gold],
  ["collabz", "CollabZ", C.gold, C.cyan],
  ["battlez", "BattleZ", C.ember, C.cyan],
  ["labelz", "LabelZ", C.purple, C.gold],
  ["groupz", "GroupZ", C.cyan, C.purple],
  ["bugz", "BugZ", C.cyan, C.emerald],
  ["funnelz", "FunnelZ", C.emerald, C.cyan],
];

// Which glyph a file uses — most are named for the app, a couple aren't
// (the ProfileZ tile is personaz.png, MembershipZ is money.png).
const GLYPH_FOR = { social_connectz: "social", personaz: "profilez", money: "membershipz" };

/** The wordmark. The name plain, a trailing Z lit in the accent — the split
 *  the set already used. Long names get a smaller size rather than being
 *  squeezed, and "Social ConnectZ" wraps to two lines because at one line it
 *  would be too small to read at any size this is actually drawn. */
function wordmark(label, accent) {
  const [head, tail] = label.endsWith("Z")
    ? [label.slice(0, -1), "Z"]
    : [label, ""];
  const lit = tail ? `<tspan fill="${accent}">${tail}</tspan>` : "";
  const words = label.split(" ");
  if (words.length > 1) {
    // Two lines: everything but the last word, then the last word with its Z.
    const first = words.slice(0, -1).join(" ");
    const last = words[words.length - 1];
    const lastHead = last.endsWith("Z") ? last.slice(0, -1) : last;
    const lastLit = last.endsWith("Z") ? `<tspan fill="${accent}">Z</tspan>` : "";
    return `
    <text x="256" y="418" text-anchor="middle" font-size="58" fill="${C.ink}" filter="url(#glowSoft)">${first}</text>
    <text x="256" y="474" text-anchor="middle" font-size="58" fill="${C.ink}" filter="url(#glowSoft)">${lastHead}${lastLit}</text>`;
  }
  const size = label.length >= 11 ? 62 : label.length >= 9 ? 72 : 86;
  return `
    <text x="256" y="452" text-anchor="middle" font-size="${size}" fill="${C.ink}" filter="url(#glowSoft)">${head}${lit}</text>`;
}

function icon(key, label, accent, secondary) {
  const glyph = G[GLYPH_FOR[key] || key];
  if (!glyph) throw new Error(`no glyph for ${key}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="${label}">
  <title>${label}</title>
  <!-- Generated by tools/make-neon-icons.mjs — edit the glyph there, not here. -->
  <defs>
    <radialGradient id="bg" cx="50%" cy="0%" r="120%">
      <stop offset="0%" stop-color="#1b1136"/>
      <stop offset="55%" stop-color="#0e0b1a"/>
      <stop offset="100%" stop-color="#07060d"/>
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4" result="core"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="bloom"/>
      <feMerge><feMergeNode in="bloom"/><feMergeNode in="core"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glowSoft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <rect x="6" y="6" width="500" height="500" rx="92" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="4"/>

  <g filter="url(#glow)" stroke-linecap="round">${glyph(accent, secondary)}
  </g>

  <g font-family="Poppins, system-ui, sans-serif" font-weight="800" letter-spacing="-2">${wordmark(label, accent)}
  </g>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const [key, label, a, b] of APPS) {
  writeFileSync(join(OUT, `${key}-neon.svg`), icon(key, label, a, b));
}
console.log(`wrote ${APPS.length} icons to public/icons/`);
