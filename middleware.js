// Vercel Edge adapter. The Cloudflare one is functions/_middleware.js; both
// are thin wrappers over seo/meta.mjs, which is where the thinking lives.
import { htmlFor, routeFor } from "./seo/meta.mjs";

export const config = {
  // Only the three public routes. Everything else never enters this function.
  matcher: ["/p/:id", "/u/:username", "/pl/:id"],
};

export default async function middleware(request) {
  const url = new URL(request.url);
  if (request.method !== "GET" || !routeFor(url.pathname)) return;

  try {
    const shell = await fetch(new URL("/index.html", url.origin), {
      headers: { accept: "text/html" },
    });
    if (!shell.ok) return;
    const html = await htmlFor(url.pathname, {
      getShell: () => shell.text(),
      origin: url.origin,
    });
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60, s-maxage=600",
      },
    });
  } catch {
    // Fall through to the normal static response rather than serve an error.
    return;
  }
}
