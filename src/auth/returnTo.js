// The one account a member left signed in on this device so they can come back
// to it — "switch back to my main account".
//
// Why it exists: DupeZ closes a duplicate WITHOUT signing in to it only when the
// evidence is proof (the server's `has_proof`). Anything less, the member signs
// in to the other account and confirms there, which proves they know its
// password. That used to mean signing out of the main account and signing back
// in afterwards; this keeps the main account's session here so the way back is
// one tap.
//
// Deliberate limits, each of which is a thing a shared computer would punish:
//   * ONE slot. A second stash would be a second account left signed in on a
//     machine that may not be theirs; "switch back" only ever needs the one they
//     started from, so a stash that already exists is never overwritten.
//   * It expires. A stash nobody comes back for is a refresh token sitting in
//     storage, so it stops being offered after `TTL_MS` and is removed when seen.
//   * A full sign-out clears it (see AuthContext.logout) — "log out" means out.
//   * Unreadable or full storage means NO stash and an honest "you'll sign in
//     again", never a pretend one.
//
// It holds the same two tokens `tokenStore` holds, in the same storage, so it
// adds no new place for them to be read from. Pure functions over an injectable
// storage so the rules above are testable without a browser.
export const KEY = "mcz_return_to";
export const TTL_MS = 12 * 60 * 60 * 1000;

function defaultStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function readReturn(storage = defaultStorage(), now = Date.now()) {
  if (!storage) return null;
  let raw;
  try { raw = storage.getItem(KEY); } catch { return null; }
  if (!raw) return null;
  let v;
  try { v = JSON.parse(raw); } catch { v = null; }
  const ok = v && typeof v.username === "string" && v.username
    && typeof v.access === "string" && typeof v.refresh === "string"
    && typeof v.at === "number" && now - v.at < TTL_MS;
  if (!ok) {
    try { storage.removeItem(KEY); } catch { /* nothing more to do */ }
    return null;
  }
  return v;
}

/** Keep `username`'s session for later. False if one is already kept or storage refuses. */
export function stashReturn(username, { access, refresh }, storage = defaultStorage(), now = Date.now()) {
  if (!storage || !username || !access || !refresh) return false;
  if (readReturn(storage, now)) return false;
  try {
    storage.setItem(KEY, JSON.stringify({ username, access, refresh, at: now }));
  } catch { return false; }
  return !!readReturn(storage, now);
}

/** Read it AND remove it: coming back uses it up. */
export function takeReturn(storage = defaultStorage(), now = Date.now()) {
  const v = readReturn(storage, now);
  if (storage) { try { storage.removeItem(KEY); } catch { /* nothing more to do */ } }
  return v;
}

export function clearReturn(storage = defaultStorage()) {
  if (!storage) return;
  try { storage.removeItem(KEY); } catch { /* nothing more to do */ }
}
