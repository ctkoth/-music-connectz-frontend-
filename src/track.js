// The join funnel, measured. Before this nothing on the logged-out path was
// tracked at all — "why isn't anybody joining" had no data behind it. This
// is deliberately NOT a third-party analytics SDK: no account to configure,
// no script from a CDN, no cookie that follows anyone off this site. It logs
// one thing — which step of landing → try → register a browser reached —
// against a UUID that identifies the BROWSER for this funnel, never a
// person. The owner reads the counts back at GET /api/auth/funnel/summary/.
import { api } from "./api.js";

const ANON_ID_KEY = "mcz_anon_id";

function anonId() {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    // Private-mode browsers throw on storage. A step going unmeasured is
    // fine; throwing from a tracking call and breaking the page is not.
    return "";
  }
}

/** Log one funnel step. Fire-and-forget — never blocks, never surfaces an
 * error to the member; a dropped analytics beacon must never look like a
 * broken signup to the person signing up. */

/* ------------------------------------------------------- channel, once */

// Where this browser came from, remembered for the session.
//
// The funnel counted arrivals and could not say which post, flyer or ad
// produced them, so every channel looked identical at zero — and the first
// thing marketing money buys is otherwise an unanswerable question.
//
// Read ONCE, on the first page of a visit, and kept: the `?src=` is on the
// entry URL and is gone by the time somebody reaches /try or /register, so
// reading it per-event would attribute the arrival and lose the conversion.
// That is the half that matters — a channel with arrivals and no scores is
// sending the wrong people; one with scores and no registers is a door
// problem, and those need opposite responses.
const SRC_KEY = "mcz_src";

function readSrc() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("src");
    if (fromUrl) {
      // The server takes a short slug and drops anything else; matching that
      // here keeps a junk value out of sessionStorage too.
      const clean = fromUrl.trim().toLowerCase().slice(0, 24);
      if (/^[a-z0-9][a-z0-9_-]*$/.test(clean)) {
        sessionStorage.setItem(SRC_KEY, clean);
        return clean;
      }
    }
    return sessionStorage.getItem(SRC_KEY) || "";
  } catch {
    // Private mode. The event still fires, just unattributed — which is what
    // an untagged arrival is anyway.
    return "";
  }
}

/** The channel this visit came from, or "" when nothing tagged it. */
export function channel() {
  return readSrc();
}

export function track(kind, meta = {}) {
  const anon_id = anonId();
  if (!anon_id) return;
  // Attached here rather than at each call site, so a step added later is
  // attributed without anybody remembering to pass it.
  const src = readSrc();
  const withSrc = src ? { ...meta, src } : meta;
  try {
    api("/api/auth/funnel/", { method: "POST", auth: false, body: { kind, anon_id, meta: withSrc } }).catch(() => {});
  } catch {
    /* never let tracking take the page down with it */
  }
}
