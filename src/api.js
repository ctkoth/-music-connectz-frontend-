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

export async function api(path, { method = "GET", body, auth = true, headers = {} } = {}) {
  const finalHeaders = { "Content-Type": "application/json", ...headers };
  if (auth && tokenStore.get()) {
    finalHeaders.Authorization = `Bearer ${tokenStore.get()}`;
  }
  const res = await fetch(buildUrl(path), {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

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
