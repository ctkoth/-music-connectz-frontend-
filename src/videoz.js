// Video ConnectZ's small pure decisions, kept out of the component so they run
// under plain node.

/**
 * The render to pick back up when the screen opens: the newest one still
 * pending. A render is finished by being POLLED (the server downloads, stores and
 * bills it on the first poll after the provider is done), so a tab closed during
 * the wait left it unfinished until the member happened to click it in the list —
 * and a render nobody polls for long enough is given up on and refunded.
 */
export function newestPending(works) {
  const pending = (Array.isArray(works) ? works : []).filter((w) => w && w.status === "pending");
  if (!pending.length) return null;
  return pending.reduce((a, b) => (Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a));
}

/** How long to wait before the first poll of a render that has already been going a while. */
export function firstPollDelay(createdAt, now, pollMs, soonMs = 1500) {
  const age = now - Date.parse(createdAt);
  return Number.isFinite(age) && age > 2 * pollMs ? soonMs : pollMs;
}

/** A poll that can never succeed (the render is gone, or is not this member's) must stop the chain. */
export function pollIsHopeless(e) {
  return e?.status === 404 || e?.status === 403 || e?.status === 401;
}
