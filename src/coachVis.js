// Who sees the coach's read on a post — said in plain words, never decided here.
//
// A post carries two settings. WHO CAN OPEN THE POST is PostZ's own (public,
// members, private). WHO SEES THE COACH'S READ on it is separate, and has three
// values the server stores on `Post.score_visibility`:
//
//     ""        same as the post
//     "members" signed-in members only
//     "private" only the author
//
// The server enforces all of it (apps/economy/coachshare.py `coach_read_for`)
// and answers each viewer with `coach: {state: none|locked|shown, …}`. This file
// decides NOTHING about who may see what. It only turns a setting into a
// sentence — what the member picks, and what a stranger will therefore meet —
// because a control that names an option without saying its RESULT is the one
// Corey keeps finding ("Members" means what, exactly?).
//
// Pure on purpose: it imports nothing, so it runs under plain `node --test`
// (api.js and limits.js read `import.meta.env`).

/** Post visibility, with the explanations PostZ's own composer gives them. The
 *  composer keeps its own copy of these three tips; if one changes, change both
 *  — `coachVis.test.mjs` pins the wording so a drift is a red test. */
export const POST_CHOICES = [
  { value: "public", label: "Public", tip: "People who rate it earn +25% ⚡, so it draws more ratings — and it shows on leaderboards" },
  { value: "restricted", label: "Members", tip: "Visible to members only" },
  { value: "private", label: "Private", tip: "Just you" },
];

/** The three choices for the read, in the order they widen. */
export const READ_CHOICES = [
  { value: "", label: "Same as the post" },
  { value: "members", label: "Members only" },
  { value: "private", label: "Only me" },
];

/** The label of the current setting, or "Same as the post" for anything unknown
 *  — an unrecognised value is the widest-looking one, so say so rather than
 *  pretend it is narrower. */
export function readChoiceLabel(value) {
  return (READ_CHOICES.find((c) => c.value === (value || "")) || READ_CHOICES[0]).label;
}

const VALID_POST = new Set(POST_CHOICES.map((c) => c.value));
const post = (v) => (VALID_POST.has(v) ? v : "public");

/**
 * What picking `choice` ACTUALLY DOES, one line, given who can open the post.
 *
 * The same words ("Same as the post") mean three different things depending on
 * the post, which is why this is keyed by both.
 */
export function readResult(choice, postVisibility) {
  const c = choice || "";
  switch (post(postVisibility)) {
    case "public":
      if (c === "") return "Anyone with the link — including people from Reddit or TikTok who aren't members — sees your score and the coach's notes next to your song.";
      if (c === "members") return "Strangers hear your song and see a locked coach card; signed-in members see the score and notes.";
      return "Only you see the read; the song is still posted.";
    case "restricted":
      if (c === "private") return "Only you see the read; members who can open the post still hear the song.";
      return "Signed-in members who can open the post see your score and the coach's notes. Strangers can't open the post at all, so they see neither.";
    default:
      // A private post is the author's alone, whatever the read says. Said
      // outright so "Members only" on a private post doesn't read as a promise.
      if (c === "members") return "The post is private, so members still can't open it or see the read until you make the post public or members-only.";
      return "Only you — the post is private, so the read is too.";
  }
}

/** The member-facing sentence for "what will a stranger see?" — always on the
 *  screen, and it changes with the choices. `score` is optional: it is named
 *  only when the caller really has it. */
export function strangerSees(postVisibility, choice, score) {
  const c = choice || "";
  const n = Number.isInteger(score) ? `${score}/10 with the coach's notes` : "the score and the coach's notes";
  switch (post(postVisibility)) {
    case "public":
      if (c === "") return `A stranger who opens your link hears the song and sees ${n} on the same page. A link preview on Reddit or TikTok shows the score too.`;
      if (c === "members") return "A stranger hears the song and sees a locked coach card with a sign-up button. A link preview shows no score.";
      return "A stranger hears the song and sees no coach card at all. A link preview shows no score.";
    case "restricted":
      return "A stranger can't open this post, so they see neither the song nor the score. Signed-in members can open it.";
    default:
      return "Nobody but you can open this post, so no stranger sees the song or the score.";
  }
}

/** What a signed-in member (not you) will see — the other half of the same
 *  question, because "Members only" is only explained when both are said. */
export function memberSees(postVisibility, choice) {
  const c = choice || "";
  const pv = post(postVisibility);
  if (pv === "private") return "A member can't open this post.";
  if (c === "private") return "A signed-in member hears the song and sees no coach card.";
  return "A signed-in member hears the song and sees the score and the coach's notes.";
}

/** What the card for a post that carries NO read says to its author. */
export const NO_READ = "No coach read is attached to this post.";

/** What removing a read does, said before it is pressed. */
export const REMOVE_RESULT = "The song stays on the post. The score and notes come off it for everyone, including you. Nothing is charged or refunded.";

/** The tail of `/s/<token>` — the coach's response carries `share_url`. */
export function shareTokenOf(shareUrl) {
  const t = String(shareUrl || "").split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop();
  return /^[A-Za-z0-9_-]{6,64}$/.test(t) ? t : "";
}

/** The coach's first sentence — what fits on one line of a feed card. */
export function firstSentence(text, max = 140) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  const first = t.split(/(?<=[.!?])\s/)[0] || "";
  if (first.length <= max) return first;
  const cut = first.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 20 ? cut.slice(0, sp) : cut).replace(/[,;:\s]+$/, "")}…`;
}

/** The dimensions that can be shown: each WITH its server-sent label.
 *  A dimension with no label is dropped, never shown as a bare number — a blank
 *  label means the screen and the coach disagree about what exists. */
export function dimensionRows(read) {
  const scores = read?.scores || {};
  const labels = read?.labels || {};
  return Object.keys(scores)
    .filter((k) => labels[k] && Number.isFinite(scores[k]))
    .map((k) => ({ key: k, label: labels[k], value: scores[k] }));
}

/** "Oct 3, 2026" from the server's ISO string, or "". */
export function givenOn(iso) {
  const d = new Date(iso || "");
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** A title for a post made from a take: the take's own name when it has a real
 *  one, otherwise what it is. Never the temp name a recorder gives a blob. */
export function defaultTitle({ takeName = "", genre = "", label = "" } = {}) {
  const base = String(takeName || "").replace(/\.[A-Za-z0-9]{2,5}$/, "").replace(/[_-]+/g, " ").trim();
  const generic = !base || /^(take|audio|video|recording|blob|image)[\s\d]*$/i.test(base) || /^\d[\d\s]*$/.test(base);
  if (!generic) return base.slice(0, 160);
  return [genre, label && `${label} take`].filter(Boolean).join(" · ").slice(0, 160) || "My take";
}

export function sizeLabel(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  if (n >= 1024) return `${Math.round(n / 1024)}KB`;
  return `${n}B`;
}

export function mmss(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The storage a file will use, said BEFORE it is uploaded.
 *
 * `fileBytes` is the file; `storageMb` / `usedMb` / `uploadMb` come from the
 * member's own limits (nothing here is a tier number). Returns the cost line,
 * whether it fits, and — when it doesn't — the sentence, written the way the
 * server's refusal is so the screen and the 413 can't disagree. Until the limits
 * land nothing is refused: guessing low would refuse files the tier allows.
 */
export function storageLine({ fileBytes, storageMb, usedMb, uploadMb }) {
  const mb = (Number(fileBytes) || 0) / 1024 / 1024;
  const out = { mb, cost: `${mb.toFixed(1)}MB of your storage`, fits: true, refusal: "", left: null };
  if (storageMb != null) out.left = Math.max(0, storageMb - (usedMb || 0));
  if (uploadMb && mb > uploadMb) {
    return { ...out, fits: false,
      refusal: `That's ${mb.toFixed(1)}MB — your tier allows ${uploadMb}MB per upload. A shorter clip, or a tier up raises it.` };
  }
  if (out.left != null && mb > out.left) {
    return { ...out, fits: false,
      refusal: `That's ${mb.toFixed(1)}MB and you have ${out.left.toFixed(1)}MB left of your ${storageMb}MB of storage. Delete an old upload, or a tier up raises it.` };
  }
  return out;
}
