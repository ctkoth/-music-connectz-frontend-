// Send anything to any app: the list, its order, and what each app receives.
//
// Pure, so it runs under plain node. The component is components/SendTo.jsx.
//
// Every app is listed — "nothing is a dead end" means the member decides where a
// thing goes, not us. What this file is honest about is the difference between an
// app that OPENS WITH the thing (it reads the hand-off) and one that only opens:
// `carries` says which, and the screen labels it, so nobody presses "send" and
// lands on an empty screen believing their work went with them.
//
// The order is the member's choice: best fit for this kind of thing, A–Z, last
// used, or most used. Last/most used are counted on THIS device from sends made
// here (localStorage), and the screen says so — it is a convenience, not a record.

// What each app reads from the shared envelope. Only apps listed here open WITH
// the item; any app may still be opened. One list, so a new receiver is one line.
export const RECEIVES = {
  postz: ["title", "text"],
  journalz: ["title", "text", "description"],
  messagez: ["title", "description"],
  sentenceconnectz: ["text"],
  mixconnectz: ["url", "title"],
  playlistz: ["post_id"],
  battlez: ["post_id"],
  collabz: ["title"],
  occ: ["post_id", "journal_id", "title", "audio_url", "video_url", "image_url"],
};
// Every coach takes a stored take by id (post, upload or journal entry).
export const COACHES = ["singz", "rapz", "guitarz", "bassz", "keyz", "drumz", "violinz",
  "flutez", "saxz", "clarinetz", "trumpetz"];
for (const c of COACHES) RECEIVES[c] = ["post_id", "upload_id", "journal_id"];

// Best fit per kind of thing, most relevant first. Anything not named follows A–Z.
export const FIT = {
  audio: [...COACHES, "postz", "mixconnectz", "videoconnectz", "battlez", "playlistz", "distributez",
    "journalz", "messagez", "collabz", "occ"],
  video: ["videoconnectz", "postz", "directz", ...COACHES, "battlez", "journalz", "messagez", "occ"],
  image: ["postz", "mangaz", "facez", "videoconnectz", "journalz", "messagez", "occ"],
  text: ["sentenceconnectz", "postz", "journalz", "messagez", "occ", "collabz"],
  take: [...COACHES, "postz", "videoconnectz", "battlez", "journalz", "messagez", "sentenceconnectz"],
  post: ["postz", ...COACHES, "battlez", "playlistz", "videoconnectz", "journalz", "messagez", "occ"],
};

export const SORTS = [
  { key: "fit", label: "Best fit" },
  { key: "az", label: "A–Z" },
  { key: "last", label: "Last used" },
  { key: "most", label: "Most used" },
];

/** Does `app` read at least one field this envelope actually has? */
export function carries(app, item) {
  const fields = RECEIVES[app];
  if (!fields || !item) return false;
  return fields.some((f) => item[f] != null && item[f] !== "");
}

/** Every tab except `from`, ordered by `sort`. Ties always fall back to A–Z. */
export function rankApps(tabs, { sort = "fit", kind = "", item = null, usage = {}, from = "" } = {}) {
  const fit = FIT[kind] || [];
  const az = (a, b) => a.label.localeCompare(b.label);
  const rows = tabs.filter((t) => t.key !== from && t.key !== "toolz")
    .map((t) => ({ ...t, carries: carries(t.key, item), uses: usage[t.key]?.n || 0, last: usage[t.key]?.last || 0 }));
  const by = {
    az,
    last: (a, b) => b.last - a.last || az(a, b),
    most: (a, b) => b.uses - a.uses || b.last - a.last || az(a, b),
    fit: (a, b) => {
      const ra = fit.indexOf(a.key), rb = fit.indexOf(b.key);
      const fa = ra === -1 ? Infinity : ra, fb = rb === -1 ? Infinity : rb;
      return (fa - fb) || (Number(b.carries) - Number(a.carries)) || az(a, b);
    },
  };
  return rows.sort(by[sort] || by.fit);
}

/** Narrow by a typed search over the label and key. */
export const searchApps = (rows, q) => {
  const n = String(q || "").trim().toLowerCase();
  return n ? rows.filter((r) => r.label.toLowerCase().includes(n) || r.key.includes(n)) : rows;
};

/** Count a send in a usage map (pure; the caller stores it). */
export function bump(usage, app, now = Date.now()) {
  const cur = usage[app] || { n: 0, last: 0 };
  return { ...usage, [app]: { n: cur.n + 1, last: now } };
}
