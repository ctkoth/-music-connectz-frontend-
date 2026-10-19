// Pure helpers for the four edit controls: JournalZ entries, PostZ comments,
// PlaylistZ title and description, MessageZ messages.
//
// No React, no api, no import.meta.env — so editing.test.mjs can run them under
// plain node. Nothing in here is a number a member reads: every window and
// every limit comes in as an argument from the server.

/** Seconds left in the tier's edit window for an item created at `createdAt`.
 *
 * `windowSec` is the server's `edit_unlock_sec` from /api/economy/limits/, the
 * same `edit_window_for(tier)` the message and comment writers enforce. `null`
 * when either side is unknown: a window nobody served is not a window, so
 * nothing is offered on it.
 *
 * The clock here is the device's, the timestamp is the server's. Skew moves
 * this by the skew. The server's refusal is the authority, and it is shown
 * unreworded when it wins. */
export function editWindowLeft(createdAt, windowSec, nowMs = Date.now()) {
  if (typeof windowSec !== "number" || !Number.isFinite(windowSec)) return null;
  // The server's isoformat() carries microseconds. Some browsers refuse more
  // than three fractional digits, which would read as "no window" and hide Edit.
  const made = Date.parse(String(createdAt ?? "").replace(/(\.\d{3})\d+/, "$1"));
  if (!Number.isFinite(made)) return null;
  return Math.max(0, Math.floor(windowSec - (nowMs - made) / 1000));
}

/** Whether a comment should show Edit on this screen. The comment payload has no
 * `mine` flag, so this compares the author's username with the signed-in one.
 * The server checks ownership again on write (`user=request.user`), so this only
 * decides what is offered, never what is allowed. */
export function canEditComment(comment, username) {
  return Boolean(username) && comment?.user === username;
}

/** Composer state for an existing journal entry, read off what entry_dict
 * serves. The pin is only prefilled when the server sent coordinates, which it
 * does for the author (`exact = mine or place_exact`). */
export function journalDraftFromEntry(e) {
  const place = e?.place || {};
  const hasPin = place.lat != null && place.lng != null;
  return {
    day: e.day,
    title: e.title || "",
    body: e.body || "",
    mood: e.mood || "",
    weather: e.weather || "",
    tags: [...(Array.isArray(e.tags) ? e.tags : [])],
    people: [...(Array.isArray(e.people) ? e.people : [])],
    placeName: place.name || "",
    coords: hasPin ? { lat: place.lat, lng: place.lng } : null,
    placeExact: Boolean(place.exact),
    visibility: e.visibility || "private",
  };
}

/** The `items` an entry edit sends. The server REPLACES the attachment list
 * whenever the key is present (`_edit` → `clean_items`), so sending only what
 * was just uploaded would silently delete everything already on the entry.
 * Existing first, then anything new. */
export function journalEditItems(existing, fresh) {
  return [
    ...(Array.isArray(existing) ? existing : []),
    ...(Array.isArray(fresh) ? fresh : []),
  ];
}

/** The body a playlist header edit sends: only the fields that changed.
 *
 * A blank title is refused here, not sent. The server ignores a blank title and
 * answers 200 with the old one, which the member would read as saved. */
export function playlistEditPayload(next, original) {
  const title = String(next?.title ?? "").trim();
  if (!title) return { error: "A playlist needs a title. Nothing was saved." };
  const body = {};
  if (title !== String(original?.title ?? "").trim()) body.title = title;
  const desc = String(next?.description ?? "");
  if (desc !== String(original?.description ?? "")) body.description = desc;
  return { body };
}

/** What to say when the server kept less of a title than was sent. The server
 * cuts titles to its own limit rather than refusing, so the saved value it
 * returns is the only honest report. Empty string when nothing was cut. */
export function titleKeptNote(sent, saved) {
  const s = String(sent ?? "").trim();
  const k = String(saved ?? "");
  if (!k || k === s || !s.startsWith(k)) return "";
  return `The server kept the first ${k.length} characters of that title.`;
}
