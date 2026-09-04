// The phrasebook — every line in the app that has a TONE, in one place.
//
// Central rather than scattered for the same reason limits.js is: voice is
// content, and content gets edited. Rewriting how the app talks should mean
// opening one file, not hunting the same sentence through twenty-eight
// components — which is exactly how the "20 free prompts" figure ended up in
// nine places and drifted.
//
// WHAT IS AND ISN'T IN HERE
//
// In: the moments with a reaction in them — something landed, something
// published, something was staked, something paid out.
//
// Out, deliberately:
//   - Errors and refusals. Somebody reading an error wants to know what
//     happened, not how we feel about it. Slang in a failure is a worse
//     failure.
//   - Prices, limits, char counts, MB caps. The cost/gain paradigm is exact
//     by design and a jokier version of a number is a wrong number.
//   - Field labels and buttons. "Save" has no register to be in.
//   - Age and legal copy. Never.
//   - Progress states ("Uploading…"). Gone in a second, and mid-upload is
//     not the moment for a bit.
//
// Nothing logged-out is in here either — Landing and /try always get the
// house voice, because there's no member yet whose setting could differ, so
// variants there would be code that can never run.
//
// Every entry gives `plain`. That's the floor: with every switch off the app
// still says the thing. `slang` and `explicit` are optional, and the ladder
// falls back, so a phrase only gets an explicit version where a swear
// actually earns its place.
import { ENERGY, SPINAZ } from "./resources.js";

export const P = {
  /* ---------------------------------------------------------- BattleZ --- */
  battle_entered: {
    plain: "You're in.",
    slang: "You're in. Go get it.",
    explicit: "You're in. Go fucking get it.",
  },
  battle_staked: (amount) => ({
    plain: `−${amount} ${SPINAZ} staked. It's held until the result.`,
    slang: `${amount} ${SPINAZ} on the line — held till it's called.`,
  }),
  battle_settled: {
    plain: "Settled.",
    slang: "Settled. Coin's moved.",
  },

  /* ------------------------------------------------------------- BugZ --- */
  bugz_reported: (bounty) => ({
    plain: `Reported! If the team squashes it, you earn +${bounty} ${SPINAZ}.`,
    slang: `Logged it. If it gets squashed that's +${bounty} ${SPINAZ} yours.`,
  }),

  /* ----------------------------------------------------------- CollabZ -- */
  collab_drafted: {
    plain: "Deal drafted — fund your share to put it in escrow.",
    slang: "Deal's drafted. Fund your half and it's in escrow.",
  },
  collab_rated: (username, score) => ({
    plain: `Rated @${username} ${score}/10.`,
    slang: `@${username} — ${score}/10, done.`,
  }),

  /* ----------------------------------------------------------- DirectZ -- */
  directz_posted: {
    plain: "Posted to DirectZ.",
    slang: "It's up on DirectZ.",
  },

  /* ------------------------------------------------------------ LabelZ -- */
  label_offered: {
    plain: "Contract offered — signed on your side, awaiting the artist.",
    slang: "Contract's out — your side's signed, ball's with the artist.",
  },

  /* ----------------------------------------------------------- LessonZ -- */
  lesson_offer_published: {
    plain: "Offer published! Students can now find and book you.",
    slang: "You're on the board — students can book you now.",
  },
  lesson_post_published: {
    plain: "Lesson post published!",
    slang: "Lesson's up.",
  },

  /* ------------------------------------------------------------- MimeZ -- */
  mimez_claimed: (energy, title) => ({
    plain: `+${energy} ${ENERGY} — ${title}.`,
    slang: `+${energy} ${ENERGY} banked — ${title}.`,
  }),

  /* ------------------------------------------------------------- PostZ -- */
  postz_rated: (score) => ({
    plain: `Rated ${score}/10 · +1 ${ENERGY}`,
    slang: `${score}/10, locked in · +1 ${ENERGY}`,
    explicit: `${score}/10, no notes · +1 ${ENERGY}`,
  }),
  postz_commented: {
    plain: "Comment posted.",
    slang: "Comment's up.",
  },
  postz_handed_over: (title, app) => ({
    plain: `"${title}" is waiting in ${app}.`,
    slang: `"${title}" is sat in ${app} waiting on you.`,
  }),

  /* ------------------------------------------------------- MembershipZ -- */
  membership_paid: {
    plain: "✅ Payment received — your StatZ upgrade activates as soon as the payment clears.",
    slang: "✅ Payment's in — StatZ lands the second it clears.",
  },

  /* ----------------------------------------------------------- OnboardZ -- */
  onboard_done: (spinaz, energy) => ({
    plain: `You're all set — +${spinaz} ${SPINAZ} · +${energy} Energy claimed!`,
    slang: `That's you sorted — +${spinaz} ${SPINAZ} · +${energy} Energy in the bag.`,
  }),
  onboard_done_plain: {
    plain: "You're all set — welcome to Music ConnectZ.",
    slang: "That's you sorted. Welcome in.",
  },

  /* ------------------------------------------------------------ SkillZ -- */
  profile_saved: (app) => ({
    plain: `${app} profile saved.`,
    slang: `${app} profile's saved.`,
  }),
};
