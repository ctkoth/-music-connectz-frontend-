// Turn what MediaFields is holding into something the server can serve.
//
// MediaFields records to a Blob and shows it back through `URL.createObjectURL`,
// which is a `blob:` URL — alive only inside the tab that made it. Posting one
// stored a link that was already dead by the time anyone else opened the post,
// so PostZ and CollabZ both dropped the blob on the floor rather than ship a
// broken URL. That left a Record button that recorded nothing anybody else
// could hear.
//
// This is the missing half: upload the blobs to /api/economy/uploads/ — which
// already enforces the tier's per-file and total storage caps — and hand back
// the same shape with real, hosted URLs.
//
// It is deliberately shared. A post, a collab deal, a battle entry and an OCC
// output all carry the same media shape, and four callers each writing their
// own upload is how they drift.
import { api } from "./api.js";

// MediaRecorder blobs have no filename, and the server stores what it's given.
// "blob" in a member's FileZ list tells them nothing a week later.
function nameFor(blob, kind) {
  const ext = (blob.type || "").includes("mp4") ? "mp4"
    : (blob.type || "").includes("webm") ? "webm"
    : (blob.type || "").includes("png") ? "png"
    : (blob.type || "").includes("jpeg") ? "jpg"
    : kind === "image" ? "png" : "webm";
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return blob.name || `${kind}-${stamp}.${ext}`;
}

async function uploadBlob(blob, kind) {
  const form = new FormData();
  form.append("file", blob, nameFor(blob, kind));
  const res = await api("/api/economy/uploads/", { method: "POST", body: form });
  const url = res?.upload?.url;
  if (!url) {
    // Better to refuse than to return a blob: URL that dies with the tab.
    throw new Error("The upload didn't come back with a URL — nothing was posted.");
  }
  return { url, storage: res };
}

/**
 * Upload any blobs held in a MediaFields value.
 *
 * Returns `{ work, storage }` where `work` carries hosted URLs and no blobs.
 * A value with nothing to upload comes back untouched — callers can always
 * call this, which is what keeps the rule in one place.
 *
 * Throws with the server's own message on a refusal (over the tier's per-file
 * size, or over the storage quota). The caller shows it; nothing is silently
 * dropped, because a post that quietly loses its audio is the bug this fixes.
 */
export async function uploadWork(value) {
  const v = value || {};
  const out = { ...v };
  let storage = null;

  // One of each: audio, video and image are separate slots and upload
  // independently. They used to share one, so attaching a video threw away the
  // audio the member had just recorded.
  for (const slot of ["audio", "video", "image"]) {
    if (!v[`${slot}_blob`]) continue;
    const r = await uploadBlob(v[`${slot}_blob`], slot);
    out[`${slot}_url`] = r.url;
    storage = r.storage;
    // The blob is the local copy. Past this point the hosted URL is the truth,
    // and keeping it would let a stale one be re-uploaded on the next submit.
    delete out[`${slot}_blob`];
  }
  return { work: out, storage };
}

/** The one attachment an app with a single media slot should carry.
 *
 * CollabZ, BattleZ and OCC store one media_type/media_url pair, so they take
 * the video if there is one and the audio otherwise — stated here rather than
 * guessed three times.
 */
export function primaryMedia(v = {}) {
  if (v.video_url) return { media_type: "video", media_url: v.video_url };
  if (v.audio_url) return { media_type: "audio", media_url: v.audio_url };
  return { media_type: "", media_url: "" };
}

/** The attachments as PostZ album entries — one per kind, empties dropped. */
export function mediaItems(v = {}, title = "") {
  const rows = [];
  if (v.audio_url) rows.push({ url: v.audio_url, type: "audio", title: `${title} (audio)`, lyrics: "" });
  if (v.video_url) rows.push({ url: v.video_url, type: "video", title: `${title} (video)`, lyrics: "" });
  if (v.image_url) rows.push({ url: v.image_url, type: "image", title: `${title} (image)`, lyrics: "" });
  if (v.lyrics) rows.push({ url: "", type: "text", title: `${title} (script)`, lyrics: v.lyrics });
  return rows;
}

/** True when there is anything to upload — for a "Uploading…" label. */
export const hasBlobs = (v) =>
  Boolean(v && (v.audio_blob || v.video_blob || v.image_blob));

/** How much room is left, phrased for a member rather than for a log. */
export function storageNote(s) {
  if (!s || s.storage_mb == null) return "";
  const left = Math.max(0, (s.storage_mb - (s.storage_used_mb || 0)));
  return `${left.toFixed(1)}MB of ${s.storage_mb}MB storage left.`;
}
