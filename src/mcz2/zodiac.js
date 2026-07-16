// ZodiacZ — auto-detects a user's sign from their birthday and carries a
// Corey-voice description for each. Sign is also a filterable metric.

// [name, emoji, startMonth, startDay, Corey-voice description]
const S = (name, emoji, m, d, desc) => ({ name, emoji, m, d, desc });
export const SIGNS = [
  S("Capricorn", "♑", 12, 22, "The grinder. You build the empire brick by brick — disciplined, ambitious, and quietly running the label while everyone else is freestyling."),
  S("Aquarius", "♒", 1, 20, "The visionary. Weird in the best way — genre-bending ideas nobody else hears yet. You're already three sounds ahead of the trend."),
  S("Pisces", "♓", 2, 19, "The dreamer. Pure emotion straight to the mic — your melodies feel like water. Protect that sensitivity; it's your whole sound."),
  S("Aries", "♈", 3, 21, "The starter. First on the beat, first in the booth, first to drop. Raw energy and zero fear — you set the tempo for the whole room."),
  S("Taurus", "♉", 4, 20, "The craftsman. You don't rush a mix — you build a groove that lasts. Loyal, luxurious, and stubborn enough to finish the album."),
  S("Gemini", "♊", 5, 21, "The switch-hitter. Two flows, two moods, endless bars. You rap, you sing, you produce — versatility is your signature."),
  S("Cancer", "♋", 6, 21, "The heart. Your music hits people right in the feelings — nostalgic hooks and home-grown loyalty. You build a real fanbase, not just streams."),
  S("Leo", "♌", 7, 23, "The star. Born for the stage — presence for days. When you perform, the spotlight was already yours. Just don't forget the team."),
  S("Virgo", "♍", 8, 23, "The perfectionist. You hear the one frequency that's off. Clean mixes, tight edits, flawless metadata — the engineer everyone needs."),
  S("Libra", "♎", 9, 23, "The collaborator. You balance the room and make the feature happen. Great ear for harmony, better instinct for the right partnership."),
  S("Scorpio", "♏", 10, 23, "The intensity. Deep, magnetic, all-in. Your music has a dangerous edge people can't stop replaying. You don't do half-effort."),
  S("Sagittarius", "♐", 11, 22, "The explorer. Global sound, restless creativity — you'd cut a track on three continents. Freedom is the whole vibe."),
];

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
