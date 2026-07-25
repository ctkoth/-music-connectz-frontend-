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
      data = { detail: text };
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
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
