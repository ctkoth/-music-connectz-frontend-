// Where large static media lives, so it doesn't live in this repo.
//
// The BodieZ exercise demos (30 self-recorded clips, ~97MB) sat in
// public/exercise-demos/ and made the frontend a 130MB download — enough
// that a fresh clone on a slow connection died partway, every time. They are
// served from the `ctkoth/mcz-media` repo's GitHub Pages site now.
//
// The backend still stores `demo_url` as the root-relative
// `/exercise-demos/<file>.mp4` it always has (migration 0138 explains why a
// full URL is never frozen into a row), so this is the ONE place that knows
// where those files actually are. Move them again and only MEDIA_BASE changes.
// The host redirects in vercel.json and public/_redirects catch any tab still
// running a bundle from before this file existed.
export const MEDIA_BASE = (import.meta.env?.VITE_MEDIA_BASE || "https://ctkoth.github.io/mcz-media").replace(/\/$/, "");

const MOVED = "/exercise-demos/";

/** The playable address for a demo_url from the API. Anything not under the
 * moved folder (a full URL, a blank) passes through untouched. */
export function demoSrc(url) {
  if (!url) return url;
  return url.startsWith(MOVED) ? `${MEDIA_BASE}${url}` : url;
}
