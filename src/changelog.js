// What shipped, in Corey's voice, newest first.
//
// The header wordmark opens this. Before it, the only record of what changed
// was a git log nobody on the platform can read and a set of screens that
// quietly got better — which is the worst way to ship work: a member who
// noticed something was different had nowhere to go and confirm it, and a
// member who didn't notice never learned the app had grown.
//
// Two rules for writing an entry, and they are the same two the commit
// messages follow:
//
//   SAY WHAT WAS WRONG, not just what is new. "ViewZ ships" tells nobody
//   anything. "You had no way to find out if anyone saw your track" is the
//   sentence somebody recognises, because they lived it.
//
//   NO NUMBERS RETYPED FROM A TIER. Anything that ladders comes off the
//   server — that is how "20 free prompts" ended up in nine places, and this
//   file is exactly the kind of place a tenth would land.
//
// `id` is stable and never reused: the header dot uses it to know whether
// this member has read the latest entry.
export const CHANGELOG = [
  {
    id: "2026-09-viewz",
    date: "2026-09-05",
    title: "👁️ ViewZ, a 4:20 reset, and three things that were locked or invented",
    lines: [
      "**ViewZ is live, on every page.** You had ratings, which need somebody to act, and comments, which need somebody to care — and no answer at all to the first thing anybody asks: did anyone see it? Silence reads as nobody, and nobody is why people stop posting.",
      "**It's drawn like a track, not printed like a receipt.** Twenty-four bars across a day: the spike when it got shared, the flat stretch overnight, whether it's still climbing or already over. \"128 views\" can't tell you a single one of those.",
      "**A view is a person, once a day.** Refresh it yourself all you like — it doesn't move. Your own looks at your own work are never counted. Logged-out people count once per browser, and because that can be cleared the panel tells you the number is a floor, not a total. A number you can't check is decoration.",
      "**Who's here RIGHT NOW is the number that matters.** A total is a receipt for something that already happened. Three people in the room is an invitation.",
      "**⚡ resets at 4:20 AM Eastern, for everyone, everywhere.** One moment, so the answer to \"when does my Energy come back\" is the same sentence for everybody instead of a different time for each of us. Cross the line and the tank is full — a reset has to be true at 4:21 or it's just a slow refill with a start time nobody can see. Inside the day it still fills at reach ÷ tier.",
      "**LogZ is free.** It was Premium, which meant asking \"where did my SpinaZ go\" got you an upsell — about your own money, on a screen the app was already telling free members to open. Everybody sees their ledger now; what you pay for is how far BACK it goes.",
      "**Every balance leads back to what moved it.** Tap ⚡ or 🍥 anywhere and you land in LogZ already filtered. Tap a row and it opens the app that caused it.",
      "**Social ConnectZ was showing six people who don't exist.** Hardcoded names, while the real member directory sat there with nothing calling it. It's real people now, in whatever order you pick.",
      "**Swipe works.** Left and right between apps, flick down to put a sheet away. The buttons all still work — a gesture you can't discover is a feature you don't have, and one you can't make is a wall.",
      "**Record a take at the door and SIGN IN and it's still yours.** It only worked if you made a new account, which is a strange thing to require of somebody who already has one.",
      "**RoyaltieZ, CallZ, GameZ and SoundZ can explain themselves now.** All four shipped answering \"A Music ConnectZ app.\" when you pressed ⓘ. There's a test that fails the build if that ever happens again.",
    ],
  },
];

const SEEN_KEY = "mcz_changelog_seen";

/** The newest entry this member has read, or "". */
export function lastSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) || "";
  } catch {
    // Storage blocked. Treat it as "seen": a dot that can never be cleared is
    // worse than no dot, and this is a nicety, not a notification.
    return CHANGELOG[0]?.id || "";
  }
}

export function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, CHANGELOG[0]?.id || "");
  } catch {
    /* nothing to remember it with — the dot simply won't clear */
  }
}

export const hasUnread = () => !!CHANGELOG[0] && lastSeen() !== CHANGELOG[0].id;
