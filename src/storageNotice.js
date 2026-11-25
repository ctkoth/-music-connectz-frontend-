// Whether the server keeps uploads, in words. Pure, so it is tested under plain node.
//
// The API's root page (`GET /`) reports `uploads.ephemeral`: true when files are on the container's own disk, which is erased every time the
// backend redeploys. While that is true every member's uploads — takes, masters, posts' audio — can vanish at the next update, and a screen
// that says "saved" without saying so is promising something it cannot keep. So the app says it, in the plainest sentence it can, until the
// server reports otherwise. Nothing is guessed: no answer, a failed fetch or a durable server shows nothing at all.
export function storageNotice(health) {
  const u = health && typeof health === "object" ? health.uploads : null;
  if (!u || u.ephemeral !== true) return null;
  return {
    title: "Your uploads are on temporary storage right now",
    body: "Files you upload here (takes, masters, tracks) can be erased the next time Music ConnectZ updates. Until permanent storage is switched on, keep your own copy: download anything you can't lose.",
    cta: "Open my files",
  };
}

/** Said once a day at most, so it is seen but does not become wallpaper that gets closed on sight. */
export const NOTICE_HOURS = 20;
export function noticeDue(lastClosedMs, nowMs = Date.now()) {
  if (!Number.isFinite(lastClosedMs) || lastClosedMs <= 0) return true;
  return nowMs - lastClosedMs > NOTICE_HOURS * 3600 * 1000;
}
