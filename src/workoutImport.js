// Importing routines and logged workouts from a CSV / TSV / pasted text.
//
// Pure, so it runs under plain node. It reads what a file SAYS and decides
// nothing about it: an exercise that is not in the library is reported by name
// and left out, never guessed at (the same rule the Coach pairing follows).
// Every format is auto-detected for everybody; StatZ members additionally choose
// the source and map columns by hand (`mapping`) — a tier says how much control,
// never whether somebody can bring their history with them.

const ALIASES = {
  exercise: ["exercise", "exercise name", "name", "lift", "movement"],
  sets: ["sets", "set count", "num sets"],
  reps: ["reps", "rep", "repetitions"],
  weight: ["weight", "weight (kg)", "weight (lb)", "weight (lbs)", "weight_kg", "kg", "lb", "lbs", "load"],
  date: ["date", "workout date", "start time", "started", "day"],
  title: ["workout", "workout name", "routine", "title", "session"],
};
export const FIELDS = Object.keys(ALIASES);

export const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Split text into cells; handles quotes, and comma / tab / semicolon. */
export function parseTable(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const first = lines[0];
  const d = first.includes("\t") ? "\t" : (first.split(";").length > first.split(",").length ? ";" : ",");
  return lines.map((line) => {
    const cells = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i += 1; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === d) { cells.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  });
}

/** Header names → column index per field; null when row 0 is not a header. */
export function detectColumns(row) {
  const map = {};
  row.forEach((h, i) => {
    const n = norm(h);
    for (const f of FIELDS) if (!(f in map) && ALIASES[f].some((a) => norm(a) === n)) map[f] = i;
  });
  return "exercise" in map ? map : null;
}

/** Unit a weight header names, or "" when it does not say. */
export const headerUnit = (h) => (/\b(kg|kgs|kilo)/i.test(h || "") ? "kg" : /\b(lb|lbs|pound)/i.test(h || "") ? "lb" : "");

const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };

function dateOf(v) {
  if (!v) return "";
  const t = new Date(v);
  if (Number.isNaN(t.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

/** "Bench Press 3x10 60" / "Bench Press, 3, 10, 60" with no header at all. */
function looseRow(cells) {
  if (cells.length === 1) {
    const m = cells[0].match(/^(.*?)\s+(\d+)\s*[x×]\s*(\d+)(?:\s*[@x ]\s*(\d+(?:[.,]\d+)?))?\s*(?:kg|lbs?)?$/i);
    return m ? { name: m[1].trim(), sets: +m[2], reps: +m[3], weight: m[4] ? num(m[4]) : null } : null;
  }
  const [name, sets, reps, weight] = cells;
  return name && num(sets) ? { name, sets: num(sets), reps: num(reps), weight: num(weight) } : null;
}

/**
 * Rows from text. `mapping` ({field: columnIndex}) overrides detection — the
 * StatZ column picker. Returns { rows, columns, unit, header }.
 * Each row: { name, sets, reps, weight, date, title } with `sets` = how many
 * sets that line stands for (1 for a per-set export, n for a per-lift one).
 */
export function parseWorkouts(text, { mapping = null } = {}) {
  const table = parseTable(text);
  if (!table.length) return { rows: [], columns: null, unit: "", header: [] };
  const found = mapping && "exercise" in mapping ? mapping : detectColumns(table[0]);
  if (!found) {
    const rows = table.map(looseRow).filter(Boolean).map((r) => ({ ...r, date: "", title: "" }));
    return { rows, columns: null, unit: "", header: [] };
  }
  const body = table.slice(1); // row 0 is the header either way: the picker maps ITS columns
  const header = table[0];
  const g = (c, f) => (f in found ? c[found[f]] : "");
  const rows = body.map((c) => ({
    name: String(g(c, "exercise") || "").trim(),
    sets: "sets" in found ? Math.max(1, Math.round(num(g(c, "sets")) || 1)) : 1,
    reps: num(g(c, "reps")), weight: num(g(c, "weight")),
    date: dateOf(g(c, "date")), title: String(g(c, "title") || "").trim(),
  })).filter((r) => r.name && !/^(warm.?up|rest)$/i.test(r.name));
  return { rows, columns: found, unit: "weight" in found ? headerUnit(header[found.weight]) : "", header };
}

/** Match a name to a library exercise: exact, then a plural/spacing-insensitive match. */
export function matchExercise(name, exercises) {
  const n = norm(name); if (!n) return null;
  const key = (s) => norm(s).replace(/\b(\w+?)s\b/g, "$1");
  const k = key(name);
  return exercises.find((e) => norm(e.name) === n) || exercises.find((e) => key(e.name) === k) || null;
}

/** Resolve every row; returns { matched: [{...row, exercise_id}], missing: [names] }. */
export function resolveRows(rows, exercises) {
  const matched = []; const missing = new Set();
  for (const r of rows) {
    const ex = matchExercise(r.name, exercises);
    if (ex) matched.push({ ...r, exercise_id: ex.id }); else missing.add(r.name);
  }
  return { matched, missing: [...missing] };
}

const toKg = (w, unit) => (w == null ? null : Math.round((unit === "lb" ? w * 0.45359237 : w) * 100) / 100);

/**
 * Routines from resolved rows: one per `title` (or one overall). A lift's target
 * is its TOP set and its set count, like a routine made from a logged session.
 * `unit` is the unit the weights are in ("kg" | "lb").
 */
export function toRoutines(matched, unit, fallbackTitle = "Imported routine") {
  const byTitle = new Map();
  for (const r of matched) {
    const t = r.title || fallbackTitle;
    if (!byTitle.has(t)) byTitle.set(t, new Map());
    const lifts = byTitle.get(t);
    const l = lifts.get(r.exercise_id) || { exercise_id: r.exercise_id, sets: 0, reps: null, weight_kg: null };
    l.sets += r.sets;
    if (r.reps != null && (l.reps == null || r.reps > l.reps)) l.reps = r.reps;
    const kg = toKg(r.weight, unit);
    if (kg != null && (l.weight_kg == null || kg > l.weight_kg)) l.weight_kg = kg;
    lifts.set(r.exercise_id, l);
  }
  return [...byTitle].map(([title, lifts]) => ({
    title: title.slice(0, 80),
    exercises: [...lifts.values()].map((l, order) => ({ ...l, order })),
  }));
}

/** Logged workouts from resolved rows: one per date; a row of n sets becomes n sets. */
export function toWorkouts(matched, unit, today) {
  const byDate = new Map();
  for (const r of matched) {
    const d = r.date || today;
    if (!byDate.has(d)) byDate.set(d, []);
    for (let i = 0; i < r.sets; i += 1) {
      byDate.get(d).push({ exercise_id: r.exercise_id, reps: r.reps || 1, weight_kg: toKg(r.weight, unit), one_sided: "" });
    }
  }
  return [...byDate].map(([date, sets]) => ({ date, sets, notes: "Imported" }));
}
