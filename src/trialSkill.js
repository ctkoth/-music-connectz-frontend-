// Which coach a public page's "get a take scored" link should open.
//
// A lesson page is about guitar, a profile lists a rapper's skills, a post carries the coach that
// read it: each already says WHICH instrument, and a link that opened the generic /try (or worse,
// SingZ) threw that away for a visitor who came for the instrument. The list of coaches is the
// server's (`/api/economy/trialdoorz/`) and is never typed here; this only matches a name to it.
//
// Matching is by key and nothing cleverer: "Guitar", "guitar", "GuitarZ" and "guitarz" all land on
// the `guitarz` door, because the doors are named for the instrument plus a Z. No match returns "",
// which the link reads as "let the visitor pick" — a wrong coach is worse than a choice.

const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z]/g, "").replace(/z$/, "");

/** `names` is a string or array of strings; `doors` is [{app_key}] (null/empty → ""). First name that matches wins. */
export function doorForSkill(names, doors) {
  const list = (Array.isArray(names) ? names : [names]).map(norm).filter(Boolean);
  const keys = (Array.isArray(doors) ? doors : []).map((d) => [norm(d?.app_key), d?.app_key]);
  for (const n of list) {
    const hit = keys.find(([k]) => k && k === n);
    if (hit) return hit[1];
  }
  return "";
}

/** The coach a post's read came from, if the read says so (`coach.app_key`, or inside `coach.read`). */
export function postCoachApp(post) {
  const c = post?.coach;
  return String(c?.app_key || c?.read?.app_key || "").toLowerCase();
}
