// A chunk that no longer exists is not a crash — it is an old tab.
//
// Every route in this app is `lazy(() => import(...))`, and Vite names each
// chunk with a hash of its contents: `InstrumentZ-B8NXpgMc.js`. A deploy
// rewrites every one of those hashes. So a tab that was open BEFORE the deploy
// is holding an `index.js` that names chunks which are no longer on the server
// — and the moment the member opens a tab whose chunk has not been fetched
// yet, the request 404s.
//
// It does not fail as a 404. This is a single-page app, so the host answers an
// unknown path with `index.html`, and the browser refuses it:
//
//     Failed to load module script: Expected a JavaScript-or-Wasm module
//     script but the server responded with a MIME type of "text/html"
//
// which surfaces as `TypeError: Failed to fetch dynamically imported module`.
//
// Code-splitting is what made this reachable. One bundle could be stale but it
// was never PARTIALLY stale: everything the session would ever need was
// already in memory. Now every tab switch is a fresh request against a server
// that may have moved on, and the failure lands on whichever app the member
// happened to open next — SingZ, in the report that prompted this — which
// reads as "SingZ is broken" when nothing is wrong with SingZ.
//
// The fix is the honest one: the page is out of date, so fetch the page again.

const RELOADED_AT = "mcz_chunk_reload_at";

// Long enough that a genuine, permanent failure cannot spin (reload, fail,
// reload), short enough that a member who is still here for the NEXT deploy
// gets recovered from that one too.
const COOLDOWN_MS = 30_000;

/** Is this the "the chunk I was told to fetch is not there" failure? */
export function isChunkError(error) {
  const text = String(error?.message || error || "");
  return (
    // Chrome / Safari, and the MIME refusal above arrives as this too.
    text.includes("Failed to fetch dynamically imported module") ||
    text.includes("error loading dynamically imported module") ||
    // Firefox.
    text.includes("Importing a module script failed") ||
    // The MIME message itself, when it reaches us directly.
    text.includes("Expected a JavaScript-or-Wasm module script")
  );
}

function reloadedRecently() {
  try {
    const at = Number(sessionStorage.getItem(RELOADED_AT) || 0);
    return at > 0 && Date.now() - at < COOLDOWN_MS;
  } catch {
    // A browser with storage blocked must not get an infinite reload, so an
    // unreadable flag is read as "we already tried".
    return true;
  }
}

/**
 * Reload once to pick up the current index and its chunk names.
 * Returns false when reloading would be the wrong answer, so the caller can
 * show something instead.
 */
export function reloadForNewVersion() {
  // Offline is the other way to get this exact error, and a reload there lands
  // the member on the browser's own error page — strictly worse than the app
  // telling them their connection dropped. (The report that prompted this had
  // ERR_INTERNET_DISCONNECTED in the same console as the stale chunks.)
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  if (reloadedRecently()) return false;
  try {
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  } catch {
    // Can't record the attempt, so can't guarantee we won't loop. Don't start.
    return false;
  }
  window.location.reload();
  return true;
}

/** True when we are offline, which changes what there is to say about it. */
export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * `lazy()` for a route, with the stale-chunk case handled at the import.
 *
 * One retry first: the same error is what a dropped connection produces, and a
 * blip deserves a second attempt before the page is thrown away underneath
 * somebody. If the second attempt fails too, the chunk is genuinely not there
 * and only a reload can fix it — so this never resolves, and the reload lands
 * before React renders anything.
 */
export function lazyRoute(loader) {
  return () =>
    loader().catch(async (error) => {
      if (!isChunkError(error)) throw error;
      try {
        return await loader();
      } catch (again) {
        if (reloadForNewVersion()) {
          // Deliberately never settles. Resolving would flash a broken route
          // and rejecting would show the boundary, both for the half-second
          // before the reload takes the page anyway.
          return new Promise(() => {});
        }
        throw again;
      }
    });
}
