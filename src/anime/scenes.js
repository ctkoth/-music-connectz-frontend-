// AnimeZ's model: an episode is a list of scenes, each a picture or a video, in order.
//
// A MangaZ panel becomes one scene per line of dialogue, on the same picture: VideoZ draws one
// caption per clip (up to its TEXT_MAX, 80), so a panel with two lines is two beats with one
// subtitle each — the way a subtitle track reads anyway. A picture slowly zooms (in, then out on
// the next panel) so a still reads as a shot. Timing comes from the line: long enough to read it.
// Pure, so it is tested under node; the screen and the VideoZ hand-off only call these.

export const CAPTION_MAX = 80;           // VideoZ's caption limit (videoedit/look.js TEXT_MAX)
export const MAX_SCENES = 80;            // VideoZ's clip limit (videoedit/project.js MAX_CLIPS)
export const SECONDS = { min: 1, max: 20, still: 3 };
const uid = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** A caption that fits: whole words up to the limit, with an ellipsis when it was cut. */
export function fitCaption(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= CAPTION_MAX) return t;
  const cut = t.slice(0, CAPTION_MAX - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > 40 ? cut.slice(0, at) : cut).trim()}…`;
}

/** Long enough to read: about 0.4 s a word, from 2 to 8 seconds. */
export const readSeconds = (text) => {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return words ? clamp(Math.round((1.5 + words * 0.4) * 10) / 10, 2, 8) : SECONDS.still;
};

/** A MangaZ page as scenes: every drawn panel, one per line, captions "Who: line", alternating zoom. */
export function scenesFromPage(page) {
  const out = [];
  const panels = (page?.panels || []).filter((p) => p?.image);
  const lines = (p) => (p.dialogue || []).filter((d) => d?.line);
  panels.forEach((p, i) => {
    const motion = i % 2 === 0 ? "in" : "out";
    const ls = lines(p);
    if (!ls.length) out.push({ id: uid(), kind: "image", url: p.image, name: `${page.title} · panel ${p.n}`, seconds: SECONDS.still, motion, caption: "" });
    for (const d of ls) {
      const caption = fitCaption(`${d.who}: ${d.line}`);
      out.push({ id: uid(), kind: "image", url: p.image, name: `${page.title} · panel ${p.n}`, seconds: readSeconds(d.line), motion, caption });
    }
  });
  // A page drawn as one image (and no panels drawn): the page itself, one beat per line.
  if (!out.length && page?.page_image) {
    const all = (page.panels || []).flatMap(lines);
    if (!all.length) out.push({ id: uid(), kind: "image", url: page.page_image, name: page.title, seconds: SECONDS.still, motion: "in", caption: "" });
    all.forEach((d, i) => out.push({ id: uid(), kind: "image", url: page.page_image, name: page.title,
      seconds: readSeconds(d.line), motion: i % 2 === 0 ? "in" : "out", caption: fitCaption(`${d.who}: ${d.line}`) }));
  }
  return out;
}

/** A finished video (an Anime ConnectZ piece, a clip) as one scene; its own length. */
export const sceneFromVideo = ({ url, name, seconds }) =>
  ({ id: uid(), kind: "video", url, name: name || "Video", seconds: Number(seconds) || 0, motion: "none", caption: "" });

/** Repair what came out of storage: known kinds, an address, seconds in range, a caption that fits. */
export function cleanScenes(list) {
  return (Array.isArray(list) ? list : []).filter((s) => s && typeof s.url === "string" && s.url && ["image", "video"].includes(s.kind))
    .map((s) => ({ id: String(s.id || uid()), kind: s.kind, url: s.url, name: String(s.name || "").slice(0, 120),
      seconds: s.kind === "video" ? Math.max(0, Number(s.seconds) || 0) : clamp(Number(s.seconds) || SECONDS.still, SECONDS.min, SECONDS.max),
      motion: s.kind === "image" && ["in", "out", "none"].includes(s.motion) ? s.motion : "none",
      caption: fitCaption(s.caption) }))
    .slice(0, 500);
}

export const totalSeconds = (scenes) => scenes.reduce((n, s) => n + (Number(s.seconds) || 0), 0);

export function moveScene(scenes, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= scenes.length) return scenes;
  const out = scenes.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** What VideoZ is handed: the first MAX_SCENES, in order, with timing, move and subtitle. */
export function toVideoItems(scenes) {
  return scenes.slice(0, MAX_SCENES).map((s) => ({ url: s.url, name: s.name, kind: s.kind,
    ...(s.kind === "image" ? { seconds: s.seconds, motion: s.motion === "none" ? undefined : s.motion } : {}),
    ...(s.caption ? { text: s.caption } : {}) }));
}
