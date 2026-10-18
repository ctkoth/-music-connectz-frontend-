// FaceZ's small pure decisions, kept out of the component so they run under
// plain node.

/**
 * What the server did with the member to tag. A tag to a handle nobody holds is
 * dropped by the server and the photo is saved anyway (201, `tagged: ""`) — and
 * the screen's own line said "tagging someone tells them" regardless. So the
 * answer is read back rather than assumed:
 *
 *   none    — no tag was asked for
 *   tagged  — the server holds the tag (and tells the member, unless it is you)
 *   unknown — a tag was asked for and not kept: no member has that handle
 */
export function tagOutcome(sent, result) {
  const want = String(sent || "").trim().replace(/^@/, "");
  if (!want) return { state: "none" };
  const got = String(result?.face?.tagged ?? result?.tagged ?? "");
  if (got && got.toLowerCase() === want.toLowerCase()) return { state: "tagged", handle: got };
  return { state: "unknown", handle: want };
}

/** The sentence for an unkept tag. The photo itself was saved. */
export const unknownTagLine = (handle) =>
  `No member called @${handle} — the photo was added, but nobody was tagged or told.`;

/**
 * What adding a face does, said BEFORE the file is chosen — on FaceZ and on the
 * Video ConnectZ photo control, which posts to the same endpoint and so does the
 * same thing. Every face goes into the Rate faces feed (social.FaceZView), which
 * other ADULT members score 1-10 on looks; those scores are part of the owner's
 * attractiveness median (models.attractiveness_median). There is no per-face
 * setting; deleting the face is the only way out. A member known to be under 18
 * is never shown in the feed (`is_minor`), which is a fact about the feed, not a
 * promise about an unknown age.
 *
 * Typed here because the server serves no sentence for it; if a private option
 * is ever added there, this line is the one to change with it.
 */
export const FACE_FEED_NOTE =
  "Every face you add also goes into the 18+ Rate faces feed, where other adult members score it 1–10 on looks " +
  "(a member known to be under 18 is kept out of it). Those scores count toward your 💯 Attractiveness rating. " +
  "There is no setting to keep a face out of the feed — deleting it from FaceZ is the only way to take it out.";
