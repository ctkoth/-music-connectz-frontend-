// Shared getUserMedia/MediaRecorder helpers — the pieces genuinely common to
// every recorder in this app, so a fix made once can't miss the others.
//
// `BossTake.jsx`'s own recorder audit found and fixed five defects here
// (naming a getUserMedia failure instead of reporting every one as "access
// refused", the mime-type order that let Chromium hand back
// `audio/mp4;codecs=opus`), and none of it reached `MediaFields.jsx` — a
// second, independent getUserMedia/MediaRecorder implementation shared by
// PostZ, JournalZ, CollabZ, DirectZ, OCC and BattleZ — because the fix lived
// only in BossTake.jsx. A recording made through MediaFields can be handed
// straight to the Boss Take coach via a post or journal entry, so a defect
// here reaches the coach through that door even when BossTake's own recorder
// is solid. Two composers accepting the same input differently is exactly
// the drift MediaFields.jsx's own opening comment already warns about, for
// the shape of what gets posted — this is the same rule for how it's made.

/** What actually went wrong when getUserMedia said no.
 *
 * Every failure used to be reported as "access was refused", because the
 * catch discarded the error. That is wrong for most of them and actively
 * misleading for two: a camera held by Zoom, OBS or another tab throws
 * NotReadableError, and a machine with no camera at all throws NotFoundError
 * — both of which send somebody off to re-grant a permission they already
 * granted, forever, while the real cause sits unmentioned.
 *
 * `retry` marks the one case worth trying again automatically: our own
 * constraints were impossible on this device, which is our problem to solve,
 * not something to tell a member about. */
export function mediaError(err, video) {
  const thing = video ? "camera" : "microphone";
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return { why: "denied", msg: `The ${thing} was blocked. Allow it in the address-bar icon, `
        + `then press record again${video ? " — or record audio only" : ""}. You can also upload a clip instead.` };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return { why: "notfound", msg: `No ${thing} on this device — nothing to allow. `
        + "Upload a clip instead and it works the same." };
    case "NotReadableError":
    case "TrackStartError":
      return { why: "inuse", msg: `Something else is using the ${thing} — another tab, or an app `
        + "like Zoom, Teams or OBS. Close it and press record again, or upload a clip." };
    case "OverconstrainedError":
      return { why: "constrained", retry: true,
               msg: `This ${thing} couldn't do what we asked for. Trying again with plain settings…` };
    default:
      return { why: "other", msg: `The ${thing} didn't start (${err?.name || "unknown error"}). `
        + "Upload a clip instead — it works the same." };
  }
}

/** Record into a container the coach's model can actually read. Chrome's
 * default is audio/webm, which Gemini does not accept as audio — the server
 * relabels it to video/webm (see `_RELABEL` in vocalcoach.py), so the choice
 * here is purely about staying inside the size the encoder actually produces.
 *
 * VP8 first for video, not MP4. Android records MP4 through a hardware
 * encoder that commonly ignores videoBitsPerSecond — a 900kbps request
 * produced a 20Mbps file. MP4 stays last for Safari, which cannot record
 * WebM at all.
 *
 * AUDIO ORDER: `audio/mp4` used to sit second, from a time when no Chromium
 * build could record it and the entry existed for Safari. Chromium can now —
 * so it would win the list, and asking for bare "audio/mp4" lets the browser
 * pick the codec, which it does: `audio/mp4;codecs=opus`. Opus inside MP4 is
 * a legal but unusual pairing this pipeline had never actually been fed.
 * Verified in headless Chromium, not reasoned about — the committed takes in
 * the backend's `testdata_takes/` are that recorder's real output. So the
 * widely-exercised container goes first and Safari's stays last with its
 * codec named rather than left to the browser to choose. */
export function bestMime(video) {
  const wanted = video
    ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    : ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm",
       "audio/mp4;codecs=mp4a.40.2", "audio/mp4"];
  return wanted.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
}

/** A size a person can read, at the size a RECORDED take actually comes in —
 * not the megabyte-rounded cap label. A good eight-second clip is around
 * 30KB, and 30KB to one decimal in MB is "0.0MB", which reads as alarming as
 * the 0:00 duration this pairs with (see the player note both recorders
 * render below it: a MediaRecorder WebM carries no Duration header). */
export function sizeLabel(n) {
  return n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))}KB`
    : `${(n / 1024 / 1024).toFixed(1)}MB`;
}
