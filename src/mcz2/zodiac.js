// ZodiacZ — auto-detects a user's sign from their birthday and carries a
// Corey-voice description for each. Sign is also a filterable metric.

// [name, emoji, startMonth, startDay, dateRange, Corey-voice description]
const S = (name, emoji, m, d, range, desc) => ({ name, emoji, m, d, range, desc });
export const SIGNS = [
  S("Capricorn", "♑", 12, 22, "December 22 – January 19", "The grinder. You build the empire brick by brick — disciplined, ambitious, and quietly running the label while everyone else is freestyling."),
  S("Aquarius", "♒", 1, 20, "January 20 – February 18", "The visionary. Weird in the best way — genre-bending ideas nobody else hears yet. You're already three sounds ahead of the trend."),
  S("Pisces", "♓", 2, 19, "February 19 – March 20", "The dreamer. Pure emotion straight to the mic — your melodies feel like water. Protect that sensitivity; it's your whole sound."),
  S("Aries", "♈", 3, 21, "March 21 – April 19", "The starter. First on the beat, first in the booth, first to drop. Raw energy and zero fear — you set the tempo for the whole room."),
  S("Taurus", "♉", 4, 20, "April 20 – May 20", "The craftsman. You don't rush a mix — you build a groove that lasts. Loyal, luxurious, and stubborn enough to finish the album."),
  S("Gemini", "♊", 5, 21, "May 21 – June 20", "The switch-hitter. Two flows, two moods, endless bars. You rap, you sing, you produce — versatility is your signature."),
  S("Cancer", "♋", 6, 21, "June 21 – July 22", "The heart. Your music hits people right in the feelings — nostalgic hooks and home-grown loyalty. You build a real fanbase, not just streams."),
  S("Leo", "♌", 7, 23, "July 23 – August 22", "The star. Born for the stage — presence for days. When you perform, the spotlight was already yours. Just don't forget the team."),
  S("Virgo", "♍", 8, 23, "August 23 – September 22", "The perfectionist. You hear the one frequency that's off. Clean mixes, tight edits, flawless metadata — the engineer everyone needs."),
  S("Libra", "♎", 9, 23, "September 23 – October 22", "The collaborator. You balance the room and make the feature happen. Great ear for harmony, better instinct for the right partnership."),
  S("Scorpio", "♏", 10, 23, "October 23 – November 21", "The intensity. Deep, magnetic, all-in. Your music has a dangerous edge people can't stop replaying. You don't do half-effort."),
  S("Sagittarius", "♐", 11, 22, "November 22 – December 21", "The explorer. Global sound, restless creativity — you'd cut a track on three continents. Freedom is the whole vibe."),
];

// Look up a sign by name (used to open any member's detailed reading).
export function signByName(name) {
  return SIGNS.find((s) => s.name === name) || null;
}

// ---- Daily ZodiacZ reading (Corey voice) ----
// Deterministic per (sign, day) so everyone with the same sign gets the same
// reading each day, and it refreshes at midnight.
const R_VIBE = [
  "The stars cleared their throat for you today — energy's up, ego's in check, go make something.",
  "Today's a green light. The universe already signed off; you're just waiting on yourself.",
  "Slow morning, loud afternoon. Save the big move for when the room warms up.",
  "You're magnetic today — people are gonna reach out. Answer the ones that matter.",
  "Low-key power day. Nobody sees the grind but the results show up in a week.",
  "Creative floodgates are open. Catch the idea now, it won't knock twice.",
  "Cosmic curveball incoming — roll with it, don't fight it. The detour's the plot.",
];
const R_FOCUS = [
  "Lean into your craft — finish the thing you keep almost-finishing.",
  "Money's moving your way. Handle a payment, price your work, don't undersell.",
  "Collabs are blessed today. Slide in that DM, book the session.",
  "Post it. Your audience is listening louder than usual right now.",
  "Rest is the move. You can't pour from an empty 808.",
  "Learn one new thing today — a plugin, a chord, a trick. It compounds.",
  "Handle the boring admin — metadata, contracts, the follow-up email. Future you says thanks.",
];
const R_CAUTION = [
  "Watch the overthinking — first instinct's usually the hit.",
  "Don't chase clout today; the real ones aren't in the comments.",
  "Guard your energy — one draining conversation can eat the whole session.",
  "Don't drop it half-baked just because you're impatient. Let it breathe.",
  "Skip the comparison scroll — your timeline isn't your competition.",
  "Say no to one thing today so you can say yes to your work.",
];
const LUCKY_COLORS = ["Neon Pink", "Cyan", "Gold", "Purple", "Electric Blue", "Crimson", "Lime"];

function daySeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// Returns a Corey-voice reading for a sign on a given date (Date or default today).
export function dailyReading(sign, date = new Date()) {
  if (!sign) return null;
  const key = `${sign.name}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const s = daySeed(key);
  const pick = (arr, off) => arr[(s + off) % arr.length];
  return {
    date: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    vibe: pick(R_VIBE, 0),
    focus: pick(R_FOCUS, 3),
    caution: pick(R_CAUTION, 7),
    luckyNumber: (s % 9) + 1,
    luckyColor: pick(LUCKY_COLORS, 5),
  };
}

// Returns the SIGNS entry for a "YYYY-MM-DD" birthday, or null.
export function zodiacFor(birthday) {
  if (!birthday) return null;
  const parts = String(birthday).split("-");
  if (parts.length < 3) return null;
  const m = +parts[1];
  const d = +parts[2];
  if (!m || !d) return null;
  // Walk signs; a date belongs to the last sign whose (m,d) start it's on/after,
  // wrapping so late-December → Capricorn.
  let match = SIGNS[0];
  for (const s of SIGNS) {
    if (m > s.m || (m === s.m && d >= s.d)) match = s;
  }
  // Handle the Capricorn wrap (Dec 22 – Jan 19): Jan 1–19 falls before Aquarius.
  if (m === 1 && d < 20) return SIGNS[0]; // Capricorn
  return match;
}
