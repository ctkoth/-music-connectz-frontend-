// The genre list, in one place.
//
// There were three: PostZ had 12, BossTake had 15, and musicconnectz_code_2.2
// had a different 15. They disagreed on Techno, Indie, Electronic and Ambient
// (in 2.2, in neither of ours) and even on spelling — PostZ said "Afrobeat",
// BossTake said "Afrobeats", so the same music tagged from two screens didn't
// group together.
//
// This is the union: every genre from 2.2 plus the ones the live app had added.
// Ordered by family rather than alphabetically, because that is how someone
// scans for their own sound.
export const GENRES = [
  // Hip hop / rap
  "Trap", "Drill", "Boom Bap", "Cloud Rap", "Hip Hop",
  // Soul family
  "R&B", "Soul", "Gospel",
  // Pop / rock
  "Pop", "Rock", "Indie",
  // Electronic
  "House", "Techno", "Electronic", "Ambient", "Lo-Fi",
  // Everything else with a real scene here
  "Jazz", "Afrobeats", "Country", "Musical Theatre", "Opera",
];

export default GENRES;
