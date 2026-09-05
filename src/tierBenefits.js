// What each tier actually buys, per app.
//
// Sourced from the blueprint and from the server's own numbers — nothing here
// is invented marketing. Where the server publishes a figure (char limits,
// daily prompts, storage) the copy quotes it; where the blueprint defines a
// gate (CallZ is StatZ-only, LabelZ needs Premium) the copy states that gate.
//
// NO PRICES LIVE HERE. Prices come from the server via /api/economy/checkout/
// config and the founding endpoint, so this file can never drift from what a
// member is actually charged.

export const TIER_ORDER = ["free", "premium", "statz"];

export const TIER_BLURB = {
  free: "Everything you need to be here properly — post, rate, train, get found. The ceilings are real but nothing is locked away for show.",
  premium: "The ceilings move. More room to write, more to upload, faster Energy, and the apps that need a tier to open at all.",
  statz: "No character limit, the AI layer across every app, and the analytics that tell you what's actually working. This is the one built for people doing it for a living.",
};

// [label, free, premium, statz] — a dash means the tier does not have it.
export const TIER_MATRIX = [
  ["Character limit — posts, DMs, comments, prompts", "400", "1,500", "Unlimited"],
  ["Energy per hour", "reach ÷ 10", "reach ÷ 5", "reach ÷ 1"],
  ["Free AI prompts a day", "1", "5", "10"],
  ["Per-upload size", "40 MB", "400 MB", "4 GB"],
  ["Storage", "400 MB", "5 GB", "100 GB"],
  ["Edit window on anything you post", "4 min", "40 min", "4 hours"],
  ["PickConnectZ dock pins", "2", "Unlimited", "Unlimited"],
  ["DistributeZ submissions", "1 / month", "Unlimited", "Unlimited + licensing"],
  ["LabelZ — create and run a label", "—", "Yes", "Yes"],
  // Placing is StatZ. ANSWERING is every tier — see the CallZ row below.
  ["CallZ — place a call", "—", "—", "Yes"],
  ["CallZ — answer and get paid", "Yes", "Yes", "Yes"],
  ["SpecZ marketplace", "—", "—", "Yes"],
  ["PersonaZ alternate artwork", "—", "Yes", "Yes"],
];

// Per-app, in Corey voice. Each entry says what the tier changes about THAT app
// rather than repeating the matrix above.
export const APP_BENEFITS = [
  {
    app: "PostZ", icon: "postz.png",
    free: "Post, get rated, earn +1 Energy for every rating you give. 400 characters.",
    premium: "1,500 characters, and 40 minutes to fix a typo instead of 4.",
    statz: "Write as long as the work needs — no cap at all — with four hours to edit.",
  },
  {
    app: "MessageZ", icon: "messagez.png",
    free: "DM anyone on the platform, free. 400 characters a message.",
    premium: "1,500 characters, so a pitch fits in one message instead of five.",
    statz: "No limit. Send the whole treatment.",
  },
  {
    app: "SingZ · RapZ", icon: "singz.png",
    free: "The full drill sets, XP, levels, streaks and badges. Nothing about training is paywalled.",
    premium: "Expanded content and higher daily limits on every drill.",
    statz: "The AI layer: vocal coach feedback on why a note failed, advanced range mapping, auto weekly plans, smart song breakdown, and fine-grain accuracy analytics.",
  },
  {
    app: "DistributeZ", icon: "distributez.png",
    free: "One submission a month.",
    premium: "Unlimited submissions.",
    statz: "Unlimited, plus you can submit for licensing.",
  },
  {
    app: "LabelZ", icon: "labelz.png",
    free: "Join a label and sign to one.",
    premium: "Create and run your own — advances, terms, e-signed contracts. (An A&R Scout or Manager PersonaZ opens this too.)",
    statz: "Same, with the analytics to actually run a roster.",
  },
  {
    app: "CallZ", icon: "callz.png",
    // No number in this copy. What a call COSTS is the other member's own
    // per-minute rate, derived from their priced skills and published by
    // `GET /api/economy/callz/rate/<username>/` before anything rings.
    free: "Answer calls and get paid your own per-minute rate — receiving is never gated, because charging somebody to be hired is backwards. You see what you'll earn a minute before you pick up.",
    premium: "The same, at a lower platform fee on what you earn.",
    statz: "Place calls as well as answer them. You see their rate, your balance and how many minutes you can afford before it rings, and the running cost while you talk.",
  },
  {
    app: "SpecZ", icon: "specz.png",
    free: "—",
    premium: "—",
    statz: "The whole marketplace — audience demographics, engagement heatmaps, genre intelligence, collab compatibility.",
  },
  // Lilith was listed here and sold at all three tiers — "auto-schedule,
  // PersonaZ automation…, AI breakdown of big goals, smart priority scoring,
  // and the analytics dashboard". None of it exists. It is three icons in
  // App.jsx (lilith_today/anytime/logbook) and an entry in the translator's
  // do-not-translate glossary: no tab, no component, no endpoint. It is not
  // HabitZ renamed (HabitZ tallies observations; this is tasks and
  // scheduling), and it is not OCC TaskZ (that is the agent's own queue).
  //
  // NOTHING GOES IN THIS FILE THAT A MEMBER CANNOT DO AFTER PAYING. Every row
  // here is a promise attached to a price, so an entry for something unbuilt
  // is not optimism, it is a refund conversation with a delay on it. Put
  // Lilith back the day it ships and not one deploy sooner.
  {
    app: "RoyaltieZ", icon: "royaltiez.png",
    // No tier gate, and the copy must not invent one: what changes by tier is
    // the CASHOUT RATE, which comes from the server (catalog.cashout_rate) and
    // is printed on the button beside the money it takes. No number here.
    free: "Your royalty balance and its ledger, and every cashout plan with the fee and the net stated before you pick one. Quarterly always keeps all of it, at every tier.",
    premium: "A lower fee on the weekly plan than Free pays.",
    statz: "The lowest weekly fee of any tier.",
  },
  {
    app: "SoundZ", icon: "soundz.png",
    // Sound itself is NOT the perk and the copy must not imply it is. Hearing
    // your own balance move is free at every tier; choosing a different set of
    // sounds is decoration, which is the same line KeyConnectZ draws when it
    // puts the wallpaper behind Premium and leaves translate free.
    free: "The house sound set, and the on/off switch. Every sound tells you which resource moved and which way — gains rise, spends fall — and none of them is ever the only signal.",
    premium: "Choose a different pack — Arcade, Soft or Deep — or take a single sound from another pack and leave the rest. It's stored on your account, so it follows you to every device.",
    statz: "The same. Sound isn't a tier ladder past Premium.",
  },
  {
    app: "GameZ", icon: "gamez.png",
    // No number: a build is priced per SECOND of build time, so a fixed figure
    // here would be a guess. The endpoint states the rate and your balance
    // before the button.
    free: "Build the games you make in OCC and play them in the app. Builds cost Energy by the second, quoted before you start, and a build that never starts costs nothing.",
    premium: "More storage for sprites and audio — game assets ride the same quota your tier already gives you.",
    statz: "Run a build command in the sandbox, and the most storage of any tier.",
  },
  {
    app: "JournalZ", icon: "journalz.png",
    // No numbers in this copy on purpose. The per-tier room comes from the
    // server (`/api/economy/journalz/cost/` → `limits`) and JournalZ prints it
    // beside the control it applies to, which is where a cap belongs. Retyping
    // the figures here is exactly how "20 free prompts" reached nine places.
    free: "The diary itself, forever — write every day, search every word, keep it private, and tag people without telling them anything. Your words are yours at every tier, and the account export always includes them.",
    premium: "On This Day — the same date in every year you've kept — and the whole journal out as one file. Plus the room a real habit needs: more entries a day, more tags, more people and more attachments on one.",
    statz: "No character limit on an entry, the most room of any tier, and the export whenever you want it.",
  },
  {
    app: "ProfileZ", icon: "personaz.png",
    free: "Every PersonaZ, every skill, every metric. Your identity is never the paywall.",
    premium: "Alternate PersonaZ artwork, and the dock pins to match.",
    statz: "Same, plus everything above.",
  },
];

/** The tier a member would move to next, or null at the top. */
export const upgradeFrom = (tier) => {
  const i = TIER_ORDER.indexOf((tier || "free").toLowerCase());
  return i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
};
