// The genre list, in one place, in the 2.2 paradigm.
//
// There were three lists: PostZ had 12, BossTake had 15, and
// musicconnectz_code_2.2 had a different 15. They disagreed on Techno, Indie,
// Electronic and Ambient (in 2.2, in neither of ours) and even on spelling —
// PostZ said "Afrobeat", BossTake said "Afrobeats", so the same music tagged
// from two screens didn't group together.
//
// This is the UNION, unabridged: every genre from 2.2, every one the live app
// had added, and the sub-genres 2.2 already carried inside its Rapping skill
// category — which was a genre list in all but name.
//
// Every genre carries an emoji, exactly as 2.2 does for skills, and the rap
// emoji are 2.2's own (Trap 🏚️, Drill ⚔️, Cloud Rap ☁️, Boom Bap 🥁 …) so the
// same sound reads the same whether it's a genre tag or a claimed skill.
//
// Grouped by family rather than alphabetically, because that is how somebody
// scans for their own sound.

export const GENRE_GROUPS = [
  {
    key: "hiphop",
    label: "Hip hop / rap",
    emoji: "🎤",
    genres: [
      ["Trap", "🏚️"],
      ["Drill", "⚔️"],
      ["Boom Bap", "🥁"],
      ["Cloud Rap", "☁️"],
      ["Hip Hop", "🎤"],
      ["Alternative Rap", "🎸"],
      ["Conscious Rap", "🧠"],
      ["Jazz Rap", "🎷"],
      ["Gangsta Rap", "⛓️"],
      ["Hardcore Hip Hop", "🔨"],
      ["Old School", "📻"],
      ["G-Funk", "🌴"],
      ["Crunk", "🔥"],
      ["Chopper", "🚁"],
      ["Emo Rap", "🖤"],
      ["Mumble Rap", "💤"],
      ["Snap", "🫰"],
      ["Grime", "🇬🇧"],
      ["Afro Drill", "🌍"],
    ],
  },
  {
    key: "soul",
    label: "Soul family",
    emoji: "💜",
    genres: [
      ["R&B", "💜"],
      ["Soul", "🔥"],
      ["Neo Soul", "🌙"],
      ["Funk", "🕺"],
      ["Gospel", "🙏"],
      ["Blues", "💙"],
      ["Motown", "🎩"],
    ],
  },
  {
    key: "pop",
    label: "Pop / rock",
    emoji: "⭐",
    genres: [
      ["Pop", "⭐"],
      ["Rock", "🎸"],
      ["Indie", "🌾"],
      ["Alternative", "🌀"],
      ["Punk", "🧷"],
      ["Metal", "🤘"],
      ["Emo", "🖤"],
      ["Folk", "🪕"],
      ["Country", "🤠"],
      ["Singer-Songwriter", "✍️"],
    ],
  },
  {
    key: "electronic",
    label: "Electronic",
    emoji: "🎛️",
    genres: [
      ["House", "🏠"],
      ["Techno", "🔊"],
      ["Electronic", "🎛️"],
      ["Ambient", "🌌"],
      ["Lo-Fi", "📼"],
      ["Drum & Bass", "🥁"],
      ["Dubstep", "🌊"],
      ["Garage", "🚪"],
      ["Hyperpop", "💊"],
      ["Synthwave", "🌇"],
      ["Jersey Club", "👟"],
      ["Phonk", "🚗"],
    ],
  },
  {
    key: "global",
    label: "Global",
    emoji: "🌍",
    genres: [
      ["Afrobeats", "🌍"],
      ["Amapiano", "🪘"],
      ["Dancehall", "🇯🇲"],
      ["Reggae", "🌴"],
      ["Reggaeton", "🔥"],
      ["Latin", "💃"],
      ["Bachata", "🌹"],
      ["Salsa", "🎺"],
      ["K-Pop", "🇰🇷"],
      ["Bollywood", "🇮🇳"],
      ["Highlife", "🎶"],
      ["Baile Funk", "🇧🇷"],
    ],
  },
  {
    key: "instrumental",
    label: "Instrumental / classical",
    emoji: "🎼",
    genres: [
      ["Jazz", "🎷"],
      ["Classical", "🎻"],
      ["Opera", "🎭"],
      ["Musical Theatre", "🎬"],
      ["Orchestral", "🎼"],
      ["Score / Soundtrack", "🎞️"],
      ["Instrumental", "🎹"],
    ],
  },
  {
    key: "spoken",
    label: "Spoken / other",
    emoji: "🗣️",
    genres: [
      ["Spoken Word", "🗣️"],
      ["Poetry", "📜"],
      ["Comedy", "😂"],
      ["Podcast", "🎙️"],
      ["Experimental", "🧪"],
      ["Other", "🎵"],
    ],
  },
];

/** { "Trap": "🏚️", … } — every genre's emoji, flat. */
export const GENRE_EMOJI = Object.fromEntries(
  GENRE_GROUPS.flatMap((g) => g.genres.map(([name, emoji]) => [name, emoji])),
);

/** Every genre name, flat and in family order. The old export, unchanged in
 *  shape so nothing that consumed a string list has to care. */
export const GENRES = GENRE_GROUPS.flatMap((g) => g.genres.map(([name]) => name));

/** "Trap 🏚️" — the label 2.2 renders, name and emoji together. */
export const genreLabel = (name) =>
  GENRE_EMOJI[name] ? `${name} ${GENRE_EMOJI[name]}` : name;
