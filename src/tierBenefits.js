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
  ["CallZ", "—", "—", "Yes"],
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
    free: "—",
    premium: "—",
    statz: "StatZ only, and needs a cash balance. Calls are priced by the other member's skill rate per hour.",
  },
  {
    app: "SpecZ", icon: "specz.png",
    free: "—",
    premium: "—",
    statz: "The whole marketplace — audience demographics, engagement heatmaps, genre intelligence, collab compatibility.",
  },
  {
    app: "Lilith", icon: "toolz_lilith.png",
    free: "Manual tasks, streaks and simple reminders.",
    premium: "Expanded reward customization, more active missions, enhanced reminder bundles.",
    statz: "Auto-schedule, PersonaZ automation that builds tasks from your RapZ/SingZ/BattleZ/LabelZ activity, AI breakdown of big goals, smart priority scoring, and the analytics dashboard.",
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
