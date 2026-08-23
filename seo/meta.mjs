// Per-URL link previews for the three public routes.
//
// THE PROBLEM
// -----------
// This is a single-page app. Every address returns the same `index.html`, so
// `/p/412` — a member's track — unfurls with the site's own title, the site's
// own description and the site's own card. Every share of every member's work
// is anonymous to a crawler and identical to every other share.
//
// Those are the pages most worth indexing and the natural way this site earns
// links. They cannot be prerendered at build time (a post made this morning
// has no build) and they cannot be filled in by the app (a crawler that runs
// no JavaScript never sees the app run).
//
// So they are filled in at the edge, per request, from the same public API a
// logged-out visitor reads.
//
// THE RULES THIS FILE KEEPS
// -------------------------
// 1. **Never break the page.** Every failure — a slow API, a 404, a shell
//    without markers — returns the untouched shell. A missing preview is a
//    disappointment; a blank page is an outage.
// 2. **Never render member text unescaped.** Titles and bios are written by
//    members and land inside HTML attributes. `escapeHtml` is not decoration,
//    it is the whole security boundary of this file, and `meta.test.mjs`
//    holds it to that.
// 3. **Only what a stranger may see.** The edge fetch carries no credentials,
//    so the API answers exactly what it answers an anonymous visitor: public
//    posts, and 404 for restricted or private ones. Nothing here decides
//    visibility — the server already did, and one copy of that rule is the
//    only safe number of copies.

export const DEFAULT_ORIGIN = "https://musicconnectz.net";
export const DEFAULT_API = "https://admin.musicconnectz.net";
export const FALLBACK_IMAGE = "/og-card.png";

// The managed block in index.html. Replacing a marked region beats rewriting
// tags one regex at a time: a tag that changes shape silently stops matching,
// and the failure looks like "previews stopped working" months later.
export const MARK_START = "<!-- seo:start -->";
export const MARK_END = "<!-- seo:end -->";

export const ROUTES = [
  {
    kind: "post",
    test: /^\/p\/(\d+)\/?$/,
    api: (k) => `/api/postz/${encodeURIComponent(k)}/`,
  },
  {
    kind: "profile",
    // Django usernames: letters, digits and @/./+/-/_ , up to 150.
    test: /^\/u\/([A-Za-z0-9@.+_-]{1,150})\/?$/,
    api: (k) => `/api/economy/public/members/${encodeURIComponent(k)}/`,
  },
  {
    kind: "playlist",
    test: /^\/pl\/(\d+)\/?$/,
    api: (k) => `/api/playlistz/${encodeURIComponent(k)}/`,
  },
];

export function routeFor(pathname) {
  for (const r of ROUTES) {
    const m = r.test.exec(pathname || "");
    if (m) return { kind: r.kind, key: m[1], path: r.api(m[1]) };
  }
  return null;
}

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Collapse whitespace and cut to `n` on a word boundary. */
export function clamp(s, n = 200) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

/** An absolute http(s) URL, or "" — never a relative path in an og:image. */
export function absolute(url, origin) {
  const u = String(url ?? "").trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return origin.replace(/\/$/, "") + u;
  return "";
}

function skillNames(personas) {
  const out = [];
  for (const p of personas || []) {
    for (const s of p?.skills || []) if (s?.name) out.push(s.name);
  }
  return [...new Set(out)];
}

/** Turn one API payload into the tags this page should carry. */
export function metaFor(kind, data, { origin = DEFAULT_ORIGIN, path = "/" } = {}) {
  if (!data || typeof data !== "object") return null;
  const url = origin.replace(/\/$/, "") + path;
  const card = origin.replace(/\/$/, "") + FALLBACK_IMAGE;

  if (kind === "post") {
    if (!data.title && !data.author) return null;
    const who = data.author ? ` by ${data.author}` : "";
    const kindWord = { audio: "Track", video: "Video", image: "Artwork" }[data.media_type] || "Post";
    // The member's own words first. Only when there are none does this
    // describe the post instead of quoting it — a generated sentence should
    // never displace one somebody wrote.
    const said = clamp(data.description, 200);
    const rating = typeof data.rating === "number" ? ` Rated ${data.rating}/10 by members.` : "";
    return {
      title: clamp(`${data.title || "Untitled"}${who} — Music ConnectZ`, 70),
      description: said || clamp(
        `${kindWord}${who} on Music ConnectZ.${rating} Listen, rate it, or start a collab.`, 200),
      image: absolute(data.media_type === "image" ? data.media_url : "", origin) || card,
      type: data.media_type === "audio" ? "music.song"
        : data.media_type === "video" ? "video.other" : "article",
      url,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": data.media_type === "audio" ? "MusicRecording"
          : data.media_type === "video" ? "VideoObject" : "CreativeWork",
        name: String(data.title || "Untitled"),
        url,
        ...(data.author ? { creator: { "@type": "Person", name: String(data.author) } } : {}),
        ...(data.description ? { description: clamp(data.description, 300) } : {}),
        ...(data.created_at ? { datePublished: String(data.created_at) } : {}),
      },
    };
  }

  if (kind === "profile") {
    if (!data.username) return null;
    const name = data.display_name || data.username;
    const skills = skillNames(data.personas);
    const badge = data.badge_title ? `${data.badge_title}. ` : "";
    return {
      title: clamp(`${name} (@${data.username}) — Music ConnectZ`, 70),
      description: clamp(data.bio, 200) || clamp(
        `${badge}${skills.length ? skills.join(", ") + ". " : ""}` +
        `${name} on Music ConnectZ — see their work, skills and rates.`, 200),
      image: card,
      type: "profile",
      url,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: {
          "@type": "Person",
          name: String(name),
          alternateName: String(data.username),
          url,
          ...(data.bio ? { description: clamp(data.bio, 300) } : {}),
          ...(skills.length ? { knowsAbout: skills.slice(0, 12).map(String) } : {}),
        },
      },
    };
  }

  if (kind === "playlist") {
    if (!data.title) return null;
    const who = data.owner ? ` by ${data.owner}` : "";
    const n = Number(data.count) || 0;
    return {
      title: clamp(`${data.title}${who} — a playlist on Music ConnectZ`, 70),
      description: clamp(data.description, 200) || clamp(
        `${n} track${n === 1 ? "" : "s"}${who} on Music ConnectZ.`, 200),
      image: absolute(data.cover_url, origin) || card,
      type: "music.playlist",
      url,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "MusicPlaylist",
        name: String(data.title),
        url,
        ...(n ? { numTracks: n } : {}),
        ...(data.owner ? { creator: { "@type": "Person", name: String(data.owner) } } : {}),
      },
    };
  }
  return null;
}

/** JSON safe to sit inside a <script> element. */
function jsonForScript(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export function renderTags(m) {
  const e = escapeHtml;
  return `
    <title>${e(m.title)}</title>
    <meta name="description" content="${e(m.description)}" />
    <link rel="canonical" href="${e(m.url)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta property="og:type" content="${e(m.type)}" />
    <meta property="og:site_name" content="Music ConnectZ" />
    <meta property="og:url" content="${e(m.url)}" />
    <meta property="og:title" content="${e(m.title)}" />
    <meta property="og:description" content="${e(m.description)}" />
    <meta property="og:image" content="${e(m.image)}" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${e(m.title)}" />
    <meta name="twitter:description" content="${e(m.description)}" />
    <meta name="twitter:image" content="${e(m.image)}" />
    <script type="application/ld+json">${jsonForScript(m.jsonLd)}</script>
  `;
}

/** Swap the managed block. Returns the input untouched if anything is off. */
export function injectMeta(html, m) {
  if (!html || !m) return html;
  const i = html.indexOf(MARK_START);
  const j = html.indexOf(MARK_END);
  if (i < 0 || j < 0 || j < i) return html;
  return html.slice(0, i + MARK_START.length) + renderTags(m) + html.slice(j);
}

/**
 * The whole job: given a request path and a way to fetch, return the HTML to
 * serve. `getShell()` returns the built index.html.
 *
 * Every branch that isn't a clean success returns the shell unchanged.
 */
export async function htmlFor(pathname, { getShell, fetchImpl = fetch,
                                          api = DEFAULT_API, origin = DEFAULT_ORIGIN,
                                          timeoutMs = 2500 } = {}) {
  const route = routeFor(pathname);
  const shell = await getShell();
  if (!route) return shell;
  let data;
  try {
    const res = await fetchImpl(api.replace(/\/$/, "") + route.path, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    // 404 is the API telling us this is private, restricted or gone. That is
    // an answer, not a failure, and the answer is "give them nothing extra".
    if (!res.ok) return shell;
    data = await res.json();
  } catch {
    return shell;
  }
  const m = metaFor(route.kind, data, { origin, path: pathname });
  return m ? injectMeta(shell, m) : shell;
}
