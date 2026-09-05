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
export function track(kind, meta = {}) {
  const anon_id = anonId();
  if (!anon_id) return;
  try {
    api("/api/auth/funnel/", { method: "POST", auth: false, body: { kind, anon_id, meta } }).catch(() => {});
  } catch {
    /* never let tracking take the page down with it */
  }
}
