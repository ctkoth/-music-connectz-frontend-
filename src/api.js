// Central API helper. JWT access token is stored as `mcz_access` (platform convention).
// Default: call the backend DIRECTLY at its absolute URL. This avoids the Vercel
// SPA fallback returning 405 for /api/* when the proxy rewrite isn't active.
// Override by setting VITE_API_BASE (e.g. "" to use a same-origin proxy instead).
const RAW_BASE = import.meta.env.VITE_API_BASE;
const API_BASE = (
  RAW_BASE === undefined || RAW_BASE === null || RAW_BASE === ""
    ? "https://admin.musicconnectz.net"
    : RAW_BASE
).replace(/\/$/, "");

export const tokenStore = {
  get: () => localStorage.getItem("mcz_access") || "",
  getRefresh: () => localStorage.getItem("mcz_refresh") || "",
  set: (access, refresh) => {
    if (access) localStorage.setItem("mcz_access", access);
    if (refresh) localStorage.setItem("mcz_refresh", refresh);
  },
  clear: () => {
    localStorage.removeItem("mcz_access");
    localStorage.removeItem("mcz_refresh");
  },
};

// Readable stand-ins for when the server sends no usable JSON detail — the
// common case being an HTML error page, whose markup must never reach the UI.
const STATUS_MESSAGE = {
  400: "That request wasn't accepted. Check the details and try again.",
  401: "Please sign in again.",
  403: "You don't have access to that.",
  404: "That isn't available yet.",
  429: "Too many requests — give it a moment.",
  500: "Something went wrong on our side. Try again shortly.",
  502: "The server is unreachable right now. Try again shortly.",
  503: "That service is temporarily unavailable.",
  504: "The server took too long to respond.",
};

function buildUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  // If API_BASE already ends with /api, don't double it.
  if (clean.startsWith("/api") && API_BASE.endsWith("/api")) {
    return API_BASE + clean.slice(4);
  }
  return API_BASE + clean;
}

// Exchange the stored refresh token for a fresh access token. Returns the new
// access token, or "" if refresh isn't possible (forces a re-login). A single
// in-flight refresh is shared so a burst of 401s doesn't stampede the endpoint.
let refreshInFlight = null;
/**
 * Exchanges the stored refresh token for a new access token.
 * Reuses one in-flight refresh promise so concurrent 401 retries
 * share a single refresh request instead of stampeding the endpoint.
 * Returns an empty string when refresh fails so callers can force re-login.
 */
async function refreshAccess() {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return "";
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(buildUrl("/api/auth/refresh/"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (!res.ok) throw new Error("refresh failed");
        const data = await res.json();
        if (data?.access) {
          tokenStore.set(data.access, data.refresh);
          return data.access;
        }
        throw new Error("no access in refresh response");
      } catch {
        tokenStore.clear(); // refresh dead → require a fresh login
        return "";
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

// How long a request may hang before it becomes an ERROR rather than a wait.
//
// There was no timeout here at all — no AbortController, no signal — and
// `fetch` with no signal waits as long as the other end is willing to. A
// member sent a 3:05 take and watched "Scoring your take… 853s" on a spinner
// that could not end, because nothing on either side was answering the
// question "how long may this person be kept waiting".
//
// The server has its own budget now (COACH_BUDGET_SECONDS). This is the
// backstop for everything that budget cannot reach: a dropped connection that
// never resets, a proxy holding the socket open, a worker killed mid-reply.
// Longer than the server's budget on purpose, so a server that answers in time
// is always the one that decides — this only fires when nothing answered at
// all.
const DEFAULT_TIMEOUT_MS = 30_000;

// A TOTAL timeout is the wrong shape for an upload, and getting this wrong
// would have replaced one bug with another: the free tier allows a 100MB
// take, and 100MB over a 2 Mbps mobile link is SIX AND A HALF MINUTES of
// entirely healthy transfer. Any fixed total generous enough for that is too
// generous to catch a dead connection, and any total tight enough to catch a
// dead connection kills real uploads from exactly the members most likely to
// be on a phone.
//
// So the upload phase is bounded by STALL, not by total: as long as bytes are
// moving, it has all the time it needs, and it gives up when nothing has
// moved for a while — which is also the only thing the member can tell apart
// from the outside.
const UPLOAD_STALL_MS = 45_000;
// Once the bytes are up, the server is working and there is nothing left to
// measure. This is the backstop behind the server's own COACH_BUDGET_SECONDS:
// longer, so a server that answers in time is always the one that decides,
// and this only fires when nothing answered at all.
const SERVER_PHASE_MS = 150_000;

function timeoutError(ms, what = "took longer than") {
  const e = new Error(
    what === "stalled"
      ? `The upload stopped moving for ${Math.round(ms / 1000)} seconds and was ` +
        "cancelled. Check your connection and send it again — nothing was charged."
      : `That took longer than ${Math.round(ms / 1000)} seconds and was stopped. ` +
        "Nothing was charged — try that take again.");
  e.status = 0;
  e.timedOut = true;
  return e;
}

async function doFetch(path, { method, body, isForm, extraHeaders, token, timeoutMs }) {
  const headers = { ...(isForm ? {} : { "Content-Type": "application/json" }), ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  const ms = timeoutMs || (isForm ? SERVER_PHASE_MS : DEFAULT_TIMEOUT_MS);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(buildUrl(path), {
      method,
      headers,
      signal: ctrl.signal,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    if (e?.name === "AbortError") throw timeoutError(ms);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Upload with real progress — bytes sent, percent, and an ETA.
 *
 * `fetch` cannot report upload progress. It has no equivalent of
 * `xhr.upload.onprogress`, and a `ReadableStream` request body needs HTTP/2
 * and duplex support that is not dependable — so a screen built on `fetch`
 * can show a spinner and literally nothing else while a 40MB take goes up.
 * That is most of what "853 seconds" felt like from the member's side: the
 * bar they were watching had no idea whether anything was moving.
 *
 * So the multipart path is XHR. It is the older API and it is the one that
 * can answer "how far, how fast, how much longer".
 *
 * `onProgress({ loaded, total, pct, bytesPerSecond, etaSeconds, done })` is
 * called as it goes. `etaSeconds` is null until there is enough of a sample to
 * mean anything — an ETA computed from the first 200ms is a number that will
 * be wrong by an order of magnitude, and a wrong ETA is worse than none
 * because people plan around it.
 */
function xhrUpload(path, { method, body, extraHeaders, token, timeoutMs, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method || "POST", buildUrl(path));
    // No xhr.timeout: that is a TOTAL, and a 100MB take on a phone is six
    // minutes of perfectly healthy upload. Bounded by stall while bytes move,
    // then by a total once they have stopped and only the server is working.
    let watchdog = null;
    let stalled = false;
    let stalledMs = UPLOAD_STALL_MS;
    const arm = (ms, kind) => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        stalled = kind === "stalled";
        stalledMs = ms;
        xhr.abort();
      }, ms);
    };
    arm(UPLOAD_STALL_MS, "stalled");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    for (const [k, v] of Object.entries(extraHeaders || {})) xhr.setRequestHeader(k, v);

    const started = Date.now();
    // Measured over a trailing window, not since the beginning: a connection
    // that starts fast and stalls would otherwise keep reporting the average
    // it managed in its first second, and count down to a finish that is not
    // coming.
    let mark = { t: started, loaded: 0 };
    let rate = 0;

    xhr.upload.onprogress = (e) => {
      // Bytes moved, so the connection is alive. Anything that is making
      // progress gets as long as it needs.
      arm(UPLOAD_STALL_MS, "stalled");
      if (!onProgress || !e.lengthComputable) return;
      const now = Date.now();
      const dt = (now - mark.t) / 1000;
      if (dt >= 0.4) {
        const sample = (e.loaded - mark.loaded) / dt;
        // Smoothed, because a raw per-tick rate makes the ETA jump around so
        // much it reads as broken even when it is right.
        rate = rate ? rate * 0.7 + sample * 0.3 : sample;
        mark = { t: now, loaded: e.loaded };
      }
      const elapsed = (now - started) / 1000;
      const left = e.total - e.loaded;
      onProgress({
        loaded: e.loaded,
        total: e.total,
        pct: e.total ? Math.min(100, Math.round((e.loaded / e.total) * 100)) : 0,
        bytesPerSecond: rate || null,
        // Null until a second of real transfer has happened. A number that is
        // going to be wrong by 10x is worse than no number, because people
        // plan around it.
        etaSeconds: rate > 0 && elapsed > 1 ? Math.round(left / rate) : null,
        done: e.loaded >= e.total,
      });
    };

    // The bytes are up; now the server is working. A percent bar that sits at
    // 100% while nothing happens is the spinner problem again, so the caller
    // is told explicitly that the phase changed.
    xhr.upload.onload = () => {
      // The bytes are up; from here only the server can be slow, and there is
      // nothing left to measure — so the bound changes shape with the phase.
      arm(timeoutMs || SERVER_PHASE_MS, "total");
      onProgress?.({
        loaded: 1, total: 1, pct: 100, bytesPerSecond: null, etaSeconds: null, done: true,
      });
    };

    xhr.onload = () => {
      clearTimeout(watchdog);
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: async () => xhr.responseText,
      });
    };
    xhr.onerror = () => {
      clearTimeout(watchdog);
      const e = new Error("The connection dropped before that finished. Nothing was charged.");
      e.status = 0;
      reject(e);
    };
    xhr.onabort = () => {
      clearTimeout(watchdog);
      reject(timeoutError(stalledMs, stalled ? "stalled" : "total"));
    };
    xhr.send(body);
  });
}

export async function api(path, {
  method = "GET", body, auth = true, headers = {},
  // Called with { loaded, total, pct, bytesPerSecond, etaSeconds, done } while
  // a multipart body uploads. Passing it switches this request to XHR, which
  // is the only transport that can report upload progress at all.
  onProgress,
  // Per-call override. Defaults are 30s, or 3 minutes for a multipart body.
  timeoutMs,
} = {}) {
  // FormData bodies (file uploads) go as multipart — let the browser set the
  // Content-Type + boundary; don't JSON-encode.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const opts = { method, body, isForm, extraHeaders: headers, timeoutMs };
  // A progress callback is only meaningful for a body with bytes in it.
  const send = onProgress && isForm
    ? (o) => xhrUpload(path, { ...o, onProgress })
    : (o) => doFetch(path, o);

  let token = auth ? tokenStore.get() : "";
  let res = await send({ ...opts, token });

  // Access token expired? Transparently refresh once and retry.
  if (res.status === 401 && auth && tokenStore.getRefresh()) {
    const fresh = await refreshAccess();
    if (fresh) res = await send({ ...opts, token: fresh });
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Not JSON. A server error page is HTML, and putting its markup in
      // `detail` meant components rendered a whole "<!doctype html>… Not
      // Found …" document as their error message. Keep non-JSON text only
      // when it is short and plainly not markup.
      const looksLikeMarkup = /^\s*</.test(text);
      data = looksLikeMarkup || text.length > 200 ? null : { detail: text.trim() };
    }
  }

  if (!res.ok) {
    const msg =
      (data &&
        (data.detail ||
          Object.values(data)
            .flat()
            .filter((v) => typeof v === "string")
            .join(" "))) ||
      STATUS_MESSAGE[res.status] ||
      `Request failed (${res.status})`;
    // The body travels with the error, not just the sentence.
    //
    // A refusal in this app is rarely only "no": a tier gate names what is
    // behind it and how many entries are waiting there, a cap says which cap
    // and what the next tier lifts it to. Throwing the message alone threw all
    // of that away, so every screen that wanted to turn a 403 into an offer had
    // to re-request something to find out what it had just been refused.
    //
    // Additive on purpose — `e.message` is unchanged, so nothing that already
    // reads it has to care.
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
