// Clean ConnectZ's arithmetic, pure and tested. A "file" is {path, size, used}: size in bytes and `used` the
// last-used time in ms. A browser can only read a file's LAST-MODIFIED date, so that is what "used" is when a
// folder is picked in a page; the Windows app can read the real last-accessed time. The screen says which.
//
// Nothing here deletes anything. It chooses WHICH files would go, in the order the member's mode names, until
// the target is reached — the member then reviews the list and unticks what they want to keep.

export const MODES = {
  priority: { label: "Priority", emoji: "‼️", what: "Biggest first and least recently used first, together — a file that is both large and untouched goes before one that is only one of those." },
  size: { label: "Size", emoji: "📐", what: "Biggest files first." },
  frequency: { label: "Frequency", emoji: "☢️", what: "Least recently used files first." },
};

export const sumBytes = (files) => files.reduce((n, f) => n + (Number(f.size) || 0), 0);

/** Bytes to free for a target percent (of everything scanned) or a target size in bytes. */
export function targetBytes(files, { percent, bytes }) {
  const total = sumBytes(files);
  if (bytes != null && bytes !== "") return Math.max(0, Math.min(total, Math.round(Number(bytes) || 0)));
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return Math.round((total * p) / 100);
}

/** The scan in the order a mode deletes it. Ties break on the path so the order never shuffles between renders. */
export function order(files, mode) {
  const bySize = [...files].sort((a, b) => b.size - a.size || a.path.localeCompare(b.path));
  const byUse = [...files].sort((a, b) => a.used - b.used || a.path.localeCompare(b.path));
  if (mode === "size") return bySize;
  if (mode === "frequency") return byUse;
  // Priority: the sum of each file's rank by size (biggest = 0) and by use (oldest = 0); lowest sum first.
  const rs = new Map(bySize.map((f, i) => [f, i]));
  const ru = new Map(byUse.map((f, i) => [f, i]));
  return [...files].sort((a, b) =>
    (rs.get(a) + ru.get(a)) - (rs.get(b) + ru.get(b)) || b.size - a.size || a.path.localeCompare(b.path));
}

/** Take files in `mode` order until `target` bytes are freed. `reached` is false when the whole scan is not enough. */
export function plan(files, mode, target) {
  const selected = [];
  let freed = 0;
  if (target > 0) {
    for (const f of order(files, mode)) {
      if (freed >= target) break;
      selected.push(f);
      freed += f.size;
    }
  }
  return { selected, freed, target, reached: freed >= target };
}

export function human(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let v = b / 1024, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`;
}
