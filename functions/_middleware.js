// Cloudflare Pages adapter. Twelve lines of plumbing over seo/meta.mjs, which
// is where the thinking lives — see that file for why this exists at all.
//
// Pages reads `functions/`; Vercel does not. Vercel reads `middleware.js` at
// the root; Pages does not. The repo deploys to both, so both adapters sit
// here and neither host sees the other's.
import { htmlFor, routeFor } from "../seo/meta.mjs";

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Everything that isn't one of the three public routes goes straight
  // through: static files, the API proxy, and every other SPA address.
  if (request.method !== "GET" || !routeFor(url.pathname)) return next();

  const shellRes = await next();
  const ct = shellRes.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return shellRes;

  try {
    const html = await htmlFor(url.pathname, {
      getShell: () => shellRes.clone().text(),
      api: env?.VITE_API_BASE || undefined,
      origin: url.origin,
    });
    const headers = new Headers(shellRes.headers);
    // Cache the rendered shell at the edge. A member's title changes rarely,
    // a crawler asks once, and without this every unfurl is an API call.
    headers.set("cache-control", "public, max-age=60, s-maxage=600");
    return new Response(html, { status: shellRes.status, headers });
  } catch {
    // Whatever went wrong, the page still has to load.
    return shellRes;
  }
}
