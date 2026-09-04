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

async function doFetch(path, { method, body, isForm, extraHeaders, token }) {
  const headers = { ...(isForm ? {} : { "Content-Type": "application/json" }), ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(buildUrl(path), {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
}

export async function api(path, { method = "GET", body, auth = true, headers = {} } = {}) {
  // FormData bodies (file uploads) go as multipart — let the browser set the
  // Content-Type + boundary; don't JSON-encode.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const opts = { method, body, isForm, extraHeaders: headers };

  let token = auth ? tokenStore.get() : "";
  let res = await doFetch(path, { ...opts, token });

  // Access token expired? Transparently refresh once and retry.
  if (res.status === 401 && auth && tokenStore.getRefresh()) {
    const fresh = await refreshAccess();
    if (fresh) res = await doFetch(path, { ...opts, token: fresh });
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
