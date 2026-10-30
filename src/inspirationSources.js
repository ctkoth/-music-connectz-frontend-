// What Inspiration can be pointed at. Pure, so it runs under plain node.
//
// The server decides everything that matters (view rights, ownership, size, whether the file is
// still in storage — `matchref.py` reuses the coach's own lookups). This only builds the request
// and the lists to choose from, and never works out an entitlement: a post the server refuses
// comes back with its own sentence and that is what the screen shows.

import { hostOf } from "./widgetz.js";

/** A side of the comparison. `file` | `post` | `upload` | `link` | null. */
export const asFile = (file) => (file ? { kind: "file", file, label: file.name } : null);
export const asPost = (p) => ({ kind: "post", id: p.id, label: p.title, author: p.author, mine: !!p.mine });
export const asUpload = (u) => ({ kind: "upload", id: u.id, label: u.name });
export const asLink = (url) => ({ kind: "link", url: String(url).trim(), label: String(url).trim() });

/** The multipart fields for one side, under the server's names (`take_post_id`, `reference_upload_id`…). */
export function addSide(form, name, side) {
  if (!side) return;
  if (side.kind === "file") form.append(name, side.file, side.file.name);
  else if (side.kind === "post") form.append(`${name}_post_id`, String(side.id));
  else if (side.kind === "upload") form.append(`${name}_upload_id`, String(side.id));
  else if (side.kind === "link") form.append(`${name}_url`, side.url);
}

/** True when the comparison will cost ⚡ — a post on either side, once however many. */
export const usesPost = (...sides) => sides.some((s) => s?.kind === "post");

/** Posts that carry a recording the server could read: audio or video, not known to be gone. */
export function withRecording(posts) {
  return (Array.isArray(posts) ? posts : []).filter(
    (p) => p && !p.take_missing && (p.media?.audio || p.media?.video));
}

/** Title, author or genre contains the query; blank query matches everything. */
export function matches(post, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return [post.title, post.author, post.genre].some((v) => String(v || "").toLowerCase().includes(q));
}

/** FileZ rows that are audio or video — the only ones the coach can listen to. */
export function listenable(uploads) {
  return (Array.isArray(uploads) ? uploads : []).filter(
    (u) => /^(audio|video)\//i.test(u?.content_type || ""));
}

/** The same post on both sides is refused by the server; say so before the press. */
export function samePost(a, b) {
  return a?.kind === "post" && b?.kind === "post" && a.id === b.id;
}

/** "RapZ submission by @you" / "@famous" — what a chosen side reads as on the control. */
export function sideLabel(side, me = "") {
  if (!side) return "";
  if (side.kind === "post") return `${side.label}${side.author ? ` — ${side.author === me || side.mine ? "your post" : `@${side.author}`}` : ""}`;
  if (side.kind === "upload") return `${side.label} (FileZ)`;
  if (side.kind === "link") return `${linkProvider(side.url) === "youtube" ? "YouTube link" : "Link"}: ${side.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48)}`;
  return side.label;
}

// ---- links -----------------------------------------------------------------------------------
// What a pasted link is EXPECTED to do, for labelling only — the same job widgetz.js does for a
// profile link, and the same limit: the server parses, decides and refuses (`classify_link`), and says
// why in its own words. This only lets the control say what will happen while there is still time not to
// press it. The reasons are the server's (`link_sources` on GET) and are never retyped here.
const HOSTS = [["youtube", ["youtube.com", "youtu.be"]], ["spotify", ["spotify.com"]],
               ["soundcloud", ["soundcloud.com"]]];

/** "youtube" | "spotify" | "soundcloud" | "other" (some other host) | "" (nothing usable typed). */
export function linkProvider(url) {
  const host = hostOf(String(url || "").trim());
  if (!host || !host.includes(".")) return "";
  for (const [name, list] of HOSTS) if (list.some((h) => host === h || host.endsWith(`.${h}`))) return name;
  return "other";
}

/** {state: "empty" | "ok" | "no", text} — `sources` is `link_sources` from GET /match/. */
export function linkVerdict(url, sources) {
  const p = linkProvider(url);
  if (!String(url || "").trim()) return { state: "empty", text: "" };
  const row = (Array.isArray(sources) ? sources : []).find((x) => x.provider === p);
  if (p === "youtube") return { state: "ok", text: row?.note || "" };
  if (row && !row.ok) return { state: "no", text: row.why || "" };
  return { state: "no", text: p ? "The coach can only listen to YouTube links. Upload the file instead." : "That doesn't look like a link yet." };
}
