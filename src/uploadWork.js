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

  if (v.media_blob) {
    const r = await uploadBlob(v.media_blob, v.media_type || "audio");
    out.media_url = r.url;
    storage = r.storage;
  }
  if (v.image_blob) {
    const r = await uploadBlob(v.image_blob, "image");
    out.image_url = r.url;
    storage = r.storage;
  }

  // The blobs are the local copy. Past this point the hosted URL is the truth,
  // and keeping them would let a stale one be re-uploaded on the next submit.
  delete out.media_blob;
  delete out.image_blob;
  return { work: out, storage };
}

/** True when there is anything to upload — for a "Uploading…" label. */
export const hasBlobs = (v) => Boolean(v && (v.media_blob || v.image_blob));

/** How much room is left, phrased for a member rather than for a log. */
export function storageNote(s) {
  if (!s || s.storage_mb == null) return "";
  const left = Math.max(0, (s.storage_mb - (s.storage_used_mb || 0)));
  return `${left.toFixed(1)}MB of ${s.storage_mb}MB storage left.`;
}
