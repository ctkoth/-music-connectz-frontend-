#!/usr/bin/env node
// Build src/iconManifest.js — Corey's icon folder as data — and ICON_AUDIT.md.
//
//     node tools/build-icon-manifest.mjs          # write both files
//     node tools/build-icon-manifest.mjs --check  # exit 1 if they are stale
//
// INPUT is `tools/supplied-icons.txt` (the folder listing exactly as it is
// named on Corey's machine) plus every dotted `parent.child.ext` file already
// committed in public/icons. Windows tolerates capitals, spaces and doubled
// dots; Vercel does not, so each name is NORMALIZED to what it must be called
// in git (`tools/normalize-icons.mjs --apply` renames the files to match).
//
// THE NAMING CONVENTION IS THE DATA. `battlez.png` is a PARENT; `battlez.cypher.png`
// is its CHILD "cypher". IconZ renders that tree, so a new child appears the
// day its file is committed and the manifest is rebuilt — nothing is typed twice.
//
// WHAT "PRESENT" MEANS. A supplied file that is not in public/icons is on
// Corey's machine only. `IconImg` falls back to the MCZ logo when a file 404s,
// silently, so the manifest never points a live icon at a file that is not
// committed: ICON_DEFAULTS holds only PRESENT art, and everything still owed
// keeps the artwork it had. Commit the file, rebuild, and it takes over.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;
const ICONS = join(ROOT, "public/icons");

// ── normalisation ────────────────────────────────────────────────────────────
// The rule set is deliberately small and every rule exists because a real file
// in the folder needed it.
const COPY_MARK = /\s*-\s*Copy\b|\s*\(\d+\)/i;
export function normalize(name) {
  const stripped = name.replace(/^ImgResizer_/i, "");
  const isCopy = COPY_MARK.test(stripped);
  const file = stripped
    .replace(COPY_MARK, "")
    .replace(/\s+icon(?=\.[a-z]+$)/i, "")   // "Crewz icon.jpg"
    .replace(/\s+/g, "")                     // "Toolz .png", "mix engineer"
    .toLowerCase()
    .replace(/\.{2,}/g, ".");                // "groupz..fanz.jpg"
  return { file, isCopy };
}

// Names that do not split on the first dot the way the rest do.
const PARENT_ALIAS = { intelligencez: "intelligence" };
const SPECIAL_SPLIT = { "bodiez-old": ["bodiez", "old"] };

export function split(file) {
  const m = file.match(/^(.+)\.([a-z0-9]+)$/);
  const stem = m[1], ext = m[2];
  const [first, ...rest] = stem.split(".");
  if (!rest.length && SPECIAL_SPLIT[first]) {
    return { parent: SPECIAL_SPLIT[first][0], child: SPECIAL_SPLIT[first][1], ext };
  }
  return { parent: PARENT_ALIAS[first] || first, child: rest.join(".") || null, ext };
}

// ── which registry key each file is the default art for ─────────────────────
// Keyed by NORMALIZED filename. This is judgement, so it is written down: the
// registry key is what a tab or component asks for, the file is what Corey
// drew for it. Two files for one key is an error (asserted below).
const KEYS = {
  "battlez.1v1.png": "battlez.1v1.png",
  "battlez.cypher.jpg": "battlez.cypher.jpg",
  "battlez.cypher.png": "battlez.cypher.png",
  "battlez.freestyle.png": "battlez.freestyle.png",
  "battlez.png": "battlez.png",
  "boardz.jpg": "boardz.png",
  "bodiez.png": "bodiez.png",
  "bugz.png": "bugz.png",
  "builder.png": "builder.png",
  "callz.ai.png": "callz_ai.png",
  "callz.user.png": "callz_user.png",
  "chordz.jpg": "chordz.jpg",
  "coachz.jpg": "coachz.jpg",
  "collabz.coverz.png": "collabz.coverz.png",
  "collabz.originalz.png": "collabz.originalz.png",
  "collabz.png": "collabz.png",
  "collabz.remixez.png": "collabz.remixez.png",
  "crewz.jpg": "crewz.png",
  "dawz.arsenal.jpg": "arsenal.png",
  "dawz.azrael.png": "azrael.png",
  "dawz.formulawon.jpg": "dawz_formulawon.png",
  "dawz.fruity.png": "fruity_mobius.png",
  "dawz.intuitionz.jpg": "intuition.png",
  "dawz.jpg": "dawz.png",
  "dawz.trump.png": "trump_toupee.png",
  "dawz.witch.png": "witchcraft.png",
  "distributez.png": "distributez.png",
  "drumz.jpg": "drumz.png",
  "filez.jpg": "filez.png",
  "gamez.png": "gamez.png",
  "gitz.png": "gitz.png",
  "groupz.blocked.png": "groupz_blocked.png",
  "groupz.custom.png": "groupz_custom.png",
  "groupz.fanz.jpg": "groupz_fanz.png",
  "groupz.friendz.jpg": "groupz_friendz.png",
  "groupz.partnerz.jpg": "partnerz.jpg",
  "groupz.png": "groupz.png",
  "home.jpg": "homez.png",
  "intelligence.imageconz.png": "imageconnectz.png",
  "intelligence.instconz.jpg": "instrumentalconnectz.png",
  "intelligence.ocular.png": "occ.png",
  "intelligence.sentenceconz.png": "sentencez.png",
  "intelligencez.png": "intelligencez.png",
  "labelz.png": "labelz.png",
  "languagez.jpg": "languagez.png",
  "lilith.png": "lilithz.png",
  "lilith.someday.png": "lilith_someday.png",
  "lilith.taskz.jpg": "taskz.png",
  "lilith.today.png": "lilith_today.png",
  "lilith.upcoming.png": "lilith_upcoming.png",
  "logz.png": "logz.png",
  "messagez.inbox.png": "inbox.png",
  "messagez.outbox.jpg": "messagez_outbox.png",
  "messagez.parcel.png": "parcel.png",
  "messagez.png": "messagez.png",
  "nationalitiez.png": "nationalitiez.png",
  "opportunitiez.png": "opportunitiez.png",
  "personaz.coach.jpg": "personaz_coach.jpg",
  "personaz.developer.png": "personaz_developer.png",
  "personaz.jpg": "personaz.png",
  "personaz.manager.png": "personaz_manager.png",
  "personaz.mixengineer.png": "personaz_mixengineer.png",
  "personaz.videographer.png": "personaz_videographer.png",
  "pivkconnectz.png": "pickconz.png",
  "profilez.png": "profilez.png",
  "profilez.preferencez.png": "preferencez.png",
  "rapz.png": "rapz.png",
  "singz.png": "singz.png",
  "socializez.jpg": "social_connectz.png",
  "socializez.vybez.jpg": "vybez.png",
  "statsz.png": "statsz.png",
  "substancez.png": "substancez.png",
  "tellz.png": "tellz.png",
  "toolz.cleanconz.png": "cleanconnectz.png",
  "toolz.journalz.jpg": "journalz.jpg",
  "toolz.metz.jpg": "metz.jpg",
  "toolz.png": "toolz.png",
  "toolz.tunerz.jpg": "tunerz.jpg",
  "analyticsz.png": "analytics.png",
  "skillz.png": "skillz.png",
  "directz.png": "directz.png",
};

// Files with no key of their own that ARE used: BodieZ's muscle picker reads
// `bodiez.<muscle>` art directly (see BodieZ.jsx), so these have a place.
const MUSCLE_PLACE = {
  "bodiez.abz.jpg": "abs", "bodiez.backz.jpg": "back", "bodiez.bicepz.jpg": "biceps",
  "bodiez.chestz.jpg": "chest", "bodiez.forearmz.jpg": "forearms",
  "bodiez.glutez.jpg": "glutes", "bodiez.lowerlegz.jpg": "lower_legs",
  "bodiez.shoulderz.jpg": "shoulders", "bodiez.totalbody.jpg": "full_body",
  "bodiez.tricepz.jpg": "triceps", "bodiez.upperlegz.jpg": "upper_legs",
};

// Name collisions that are not a Windows "- Copy" marker.
const DUPLICATE_OF = {
  "bodiez.uppper-legz.jpg": "bodiez.upperlegz.jpg",   // three p's
  "builder.jpg": "builder.png",                        // same icon, other format
  "toolz.jpg": "toolz.png",
};

// Why a file has no place, where the filename alone says something useful.
const NOTE = {
  "tunerz.jpg": "the older root art; the tunerz.jpg registry key now belongs to the ToolZ child toolz.tunerz.jpg",
  "battlez.cypher.png": "the registry keys both battlez.cypher.png and .jpg; only the .jpg is committed",
  "bodiez.old.jpg": "an older BodieZ mark (\"bodiez-old\") — the current parent art is bodiez.png",
  "fanz.jpg": "no key or tab; the GroupZ Fanz child is groupz.fanz.jpg — likely the same art",
  "friendz.jpg": "no key or tab; the GroupZ Friendz child is groupz.friendz.jpg — likely the same art",
  "friends.png": "no key or tab; sits beside friendz.jpg — two friend icons and one place for them",
  "partners.png": "no key or tab; the GroupZ Partners child is groupz.partnerz.jpg — likely the same art",
  "karmaz.jpg": "no KarmaZ tab, app or registry key exists yet",
  "recordingz.jpg": "no RecordingZ tab, app or registry key exists yet",
  "xp.jpg": "XP is an emoji resource (⭐ in src/resources.js); no screen draws an icon for it",
  "whatineedz.png": "no tab or key — closest is PickConnectZ (pickconz.png), which already has art",
  "stepz-good-bodiez.png": "StepZ is a BodieZ sub-tab that draws no icon; no key exists",
  "personaz.actor.jpg": "Actor is not one of the 11 PersonaZ in personas.py or the registry",
  "personaz.actress.jpg": "Actress is not one of the 11 PersonaZ in personas.py or the registry",
  "profilez.religionz.jpg": "ProfileZ has a religion field but no icon slot for it",
  "socializez.infernoz.jpg": "InfernoZ is drawn from ToolZMenu.jsx's own map (offerz-neon.svg), not the registry",
  "lilith.routinez.jpg": "no Lilith Routines tab or key; HabitZ (habitz.png) is the nearest surface",
  "logo.jpg": "the logo is registered as logo.png -> /mcz-logo-v5.jpg at the site root",
  "mcz-logo-v5.jpg": "the same logo is already served from the site root (/mcz-logo-v5.jpg)",
};

const LABEL = {
  socializez: "SocialiZeZ", intelligence: "Intelligence", occ: "OCC",
  imageconz: "Image ConnectZ", instconz: "Instrumental ConnectZ",
  ocular: "Ocular Code ConnectZ", sentenceconz: "Sentence ConnectZ",
  cleanconz: "Clean ConnectZ", fruity: "Fruity Möbius", trump: "Trump Toupee",
  witch: "Witchcraft", formulawon: "FormulaWon", mixengineer: "Mix Engineer",
  totalbody: "Total Body", fullbodyz: "Full BodyZ", "stepz-good-bodiez": "StepZ Good BodieZ",
  "1v1": "1v1", ai: "AI", skillz: "SkillZ", directz: "DirectZ",
};
export function label(part) {
  if (!part) return null;
  if (LABEL[part]) return LABEL[part];
  const cap = part[0].toUpperCase() + part.slice(1);
  return part.length > 2 && part.endsWith("z") ? cap.slice(0, -1) + "Z" : cap;
}

// Preference when one child has art in more than one format: real artwork
// beats a generated glyph, and among artwork the raster the registry names.
const EXT_RANK = ["png", "jpg", "jpeg", "webp", "svg"];

const readRegistry = () => {
  const app = readFileSync(join(ROOT, "src/App.jsx"), "utf8");
  const block = app.match(/export const CUSTOM_ICONS = \{([\s\S]*?)\n\};/)[1];
  return {
    app,
    reg: Object.fromEntries([...block.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]])),
  };
};

export function buildManifest() {
  const listed = readFileSync(join(ROOT, "tools/supplied-icons.txt"), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const committed = readdirSync(ICONS);
  const committedSet = new Set(committed);
  const { app, reg } = readRegistry();

  // ── collect every file the tree knows about ────────────────────────────────
  const byFile = new Map();   // normalized file -> record
  const add = (raw, origin) => {
    const { file, isCopy } = normalize(raw);
    const seen = byFile.get(file);
    if (seen) {
      // A second spelling of a file already seen — in this folder that is only
      // ever a Windows "- Copy" or "(2)", a duplicate by construction. The
      // original is the record; the copy is noted on it, whichever came first.
      if (seen.isCopy && !isCopy) { seen.copies.push(seen.raw); seen.raw = raw; seen.isCopy = false; }
      else seen.copies.push(raw);
      return;
    }
    byFile.set(file, { raw, file, origin, copies: [], isCopy });
  };
  for (const raw of listed) add(raw, "supplied");
  // Committed dotted files are children too ("filenames in the folder"), minus
  // generated glyphs and the underscore legacy names the registry already maps.
  for (const f of committed) {
    if (/-neon\.svg$/.test(f)) continue;
    if (!/^[a-z0-9]+\.[a-z0-9.]+\.(png|jpe?g|webp|svg)$/.test(f)) continue;
    if (!byFile.has(f)) add(f, "committed");
  }
  // SkillZ and DirectZ are parents by decision; their root art is committed.
  for (const f of ["skillz.png", "directz.png"]) if (!byFile.has(f) && committedSet.has(f)) add(f, "committed");

  // Committed files something already draws — backup art, not dead weight.
  const inUse = new Map();
  for (const [k, u] of Object.entries(reg)) inUse.set(u.split("/").pop(), `current art for registry key ${k}, kept as the fallback`);
  const bodiez = readFileSync(join(ROOT, "src/apps/BodieZ.jsx"), "utf8");
  for (const m of bodiez.matchAll(/\/icons\/([a-z.]+\.svg)/g)) inUse.set(m[1], "the BodieZ muscle picker's current art, kept as the fallback");

  // ── one record per file ─────────────────────────────────────────────────────
  const files = [];
  const usedKeys = new Map();
  for (const rec of byFile.values()) {
    const { parent, child, ext } = split(rec.file);
    const present = committedSet.has(rec.file);
    const key = KEYS[rec.file] ?? null;
    const dupOf = DUPLICATE_OF[rec.file];
    if (key) {
      if (usedKeys.has(key)) throw new Error(`two files for registry key ${key}: ${usedKeys.get(key)} and ${rec.file}`);
      usedKeys.set(key, rec.file);
    }
    let status;
    if (dupOf) status = "duplicate";
    else if (key && present) status = "live";
    else if (key) status = "owed";
    else if (MUSCLE_PLACE[rec.file]) status = present ? "live" : "owed";
    else if (present && inUse.has(rec.file)) status = "fallback";
    else status = "unplaced";
    const notes = [];
    if (status === "fallback") notes.push(inUse.get(rec.file));
    if (MUSCLE_PLACE[rec.file]) notes.push("BodieZ muscle picker");
    if (NOTE[rec.file]) notes.push(NOTE[rec.file]);
    if (dupOf) notes.push(`same icon as ${dupOf}${rec.file === "bodiez.uppper-legz.jpg" ? " (typo: three p's)" : ""}`);
    if (rec.copies.length) notes.push(`also on disk as ${rec.copies.map((c) => `"${c}"`).join(", ")} — a copy`);
    if (rec.raw !== rec.file && rec.origin === "supplied") notes.push(`on disk as "${rec.raw}"; commit it as ${rec.file}`);
    if (key && reg[key] && reg[key].endsWith("-neon.svg") && present) notes.push(`replaces the generated glyph ${reg[key]}`);
    if (key && !reg[key]) notes.push("new registry key");
    files.push({
      file: rec.file, parent, child, ext, present, key,
      muscle: MUSCLE_PLACE[rec.file] || null,
      status, origin: rec.origin,
      raw: rec.raw !== rec.file ? rec.raw : null,
      note: notes.join("; "),
    });
  }

  // ── group into parents and children ────────────────────────────────────────
  const parents = new Map();
  const parentOf = (p) => {
    if (!parents.has(p)) parents.set(p, { parent: p, label: label(p), root: null, children: new Map() });
    return parents.get(p);
  };
  for (const f of files) {
    const P = parentOf(f.parent);
    if (!f.child) { (P.rootFiles ||= []).push(f); continue; }
    const C = P.children.get(f.child) || { child: f.child, label: label(f.child), files: [] };
    C.files.push(f);
    P.children.set(f.child, C);
  }
  // SkillZ and DirectZ exist as parents even when the folder has no child for them.
  parentOf("skillz"); parentOf("directz");

  const rank = (f) => [f.status === "duplicate" ? 1 : 0, f.origin === "supplied" ? 0 : 1, EXT_RANK.indexOf(f.ext)];
  const cmp = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
  // Present art wins over an owed twin of the same child.
  const pick = (fs) => [...fs].sort((a, b) => (b.present - a.present) || cmp(a, b))[0];

  const tree = [];
  for (const P of parents.values()) {
    const roots = (P.rootFiles || []).sort(cmp);
    const rootArt = roots.length ? pick(roots) : null;
    tree.push({
      parent: P.parent, label: P.label,
      root: rootArt && { file: rootArt.file, art: rootArt.present ? `/icons/${rootArt.file}` : null,
        key: rootArt.key, status: rootArt.status, note: rootArt.note },
      extra: roots.filter((r) => r !== rootArt).map((r) => ({ file: r.file, status: r.status, note: r.note })),
      children: [...P.children.values()].sort((a, b) => a.child.localeCompare(b.child)).map((C) => {
        const best = pick(C.files);
        return {
          child: C.child, label: C.label, file: best.file,
          art: best.present ? `/icons/${best.file}` : null,
          key: best.key, status: best.status, note: best.note,
          also: C.files.filter((x) => x !== best).map((x) => ({ file: x.file, status: x.status, note: x.note })),
        };
      }),
    });
  }
  // Order: parents A–Z, then the two that follow them by request.
  const tail = ["skillz", "directz"];
  tree.sort((a, b) => {
    const ta = tail.indexOf(a.parent), tb = tail.indexOf(b.parent);
    if (ta >= 0 || tb >= 0) return (ta < 0 ? -1 : ta) - (tb < 0 ? -1 : tb);
    return a.parent.localeCompare(b.parent);
  });

  // ── defaults: only what is actually committed ──────────────────────────────
  const defaults = {};
  for (const f of files) {
    if (f.key && f.present && f.status === "live") defaults[f.key] = `/icons/${f.file}`;
  }
  const muscleArt = {};
  for (const f of files) if (f.muscle && f.present) muscleArt[f.muscle] = `/icons/${f.file}`;

  // ── tab-level gaps: icons a tab or app asks for that no supplied file covers ─
  const asked = [...new Set([...app.matchAll(/icon:\s*"([^"]+)"/g)].map((m) => m[1]))];
  const covered = new Set(usedKeys.keys());
  const uncovered = asked.filter((k) => !covered.has(k)).sort();
  const registryUncovered = Object.keys(reg).filter((k) => !covered.has(k)).sort();

  return { files, tree, defaults, muscleArt, uncovered, registryUncovered, registrySize: Object.keys(reg).length, reg };
}

// ── output ───────────────────────────────────────────────────────────────────
function renderJs(m) {
  const j = (v) => JSON.stringify(v, null, 2);
  return `// GENERATED by tools/build-icon-manifest.mjs — do not edit. Change
// tools/supplied-icons.txt or the maps in that script, then rebuild:
//
//     node tools/build-icon-manifest.mjs
//
// src/iconManifest.test.mjs fails when this file is stale, so a new file in
// public/icons cannot sit unnoticed.

// Registry key -> the custom artwork Corey supplied for it. ONLY files that are
// committed appear here, so nothing points at a 404. \`IconImg\` tries this
// first and falls back to CUSTOM_ICONS, so custom art always wins and the
// generated glyphs are the backup, never the reverse.
export const ICON_DEFAULTS = ${j(m.defaults)};

// BodieZ muscle group -> supplied art, for the picker that reads it directly.
export const MUSCLE_ART = ${j(m.muscleArt)};

// Parents and their children, by filename: \`battlez.png\` is a parent and
// \`battlez.cypher.png\` its child. \`art\` is null while the file is not committed.
export const ICON_TREE = ${j(m.tree)};

// Icons a tab or app asks for that no supplied file covers.
export const TAB_ICONS_WITHOUT_ART = ${j(m.uncovered)};
`;
}

function renderAudit(m) {
  const by = (s) => m.files.filter((f) => f.status === s);
  const rows = (fs) => fs.map((f) => `| \`${f.raw || f.file}\` | ${f.key ? `\`${f.key}\`` : "—"} | ${f.note || ""} |`).join("\n");
  const th = "| File | Registry key | Note |\n|---|---|---|";
  const supplied = m.files.filter((f) => f.origin === "supplied");
  const c = (s) => supplied.filter((f) => f.status === s).length;
  return `# Icon audit — generated by \`node tools/build-icon-manifest.mjs\`

Filename and registry audit only — nothing here was judged by looking at the
art. ${supplied.length} distinct supplied files: **${c("live")} live** (committed, now the default),
**${c("owed")} owed** (has a place, file not in git), **${c("unplaced")} with no place**,
**${c("duplicate")} duplicates**, ${c("fallback")} already used as backup art. The lists below also
show committed dotted files the tree picked up from public/icons.

## Live — custom art is the default now (${by("live").length})
${th}
${rows(by("live"))}

## Owed — has a place, file not committed (${by("owed").length})
The tab keeps the artwork it had until the file is pushed. Rename with
\`node tools/normalize-icons.mjs --apply\`, commit, then rebuild the manifest.

${th}
${rows(by("owed"))}

## Committed backup art (${by("fallback").length})
Still what something draws today; custom art takes over where a default exists.

${th}
${rows(by("fallback"))}

## No place — no tab, app or registry key uses these (${by("unplaced").length})
${th}
${rows(by("unplaced"))}

## Duplicates (${by("duplicate").length})
${th}
${rows(by("duplicate"))}

## Tabs and apps that ask for an icon no supplied file covers (${m.uncovered.length})
${m.uncovered.map((k) => `- \`${k}\` → ${m.reg[k]}`).join("\n")}

Registry keys with no supplied file: ${m.registryUncovered.length} of ${m.registrySize} (most are the
\`personaz_*\`, \`lilith_*\`, \`vis_*\`, \`badge_*\` and \`tier_*\` sets, which were not in this folder).
`;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const m = buildManifest();
  const js = renderJs(m), md = renderAudit(m);
  const outJs = join(ROOT, "src/iconManifest.js"), outMd = join(ROOT, "ICON_AUDIT.md");
  if (process.argv.includes("--check")) {
    const stale = [[outJs, js], [outMd, md]].filter(([p, s]) => !existsSync(p) || readFileSync(p, "utf8") !== s);
    if (stale.length) { console.error("stale:", stale.map(([p]) => p).join(", ")); process.exit(1); }
    console.log("icon manifest is current");
  } else {
    writeFileSync(outJs, js); writeFileSync(outMd, md);
    const c = (s) => m.files.filter((f) => f.status === s).length;
    console.log(`wrote src/iconManifest.js and ICON_AUDIT.md — live ${c("live")}, owed ${c("owed")}, unplaced ${c("unplaced")}, duplicate ${c("duplicate")}`);
  }
}
export { renderJs, renderAudit };
