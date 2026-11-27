// The tabs a member can open, as { key, label }. The Lilith tag picker reads
// this list, so a tag can only name a tab that exists. A tag pointed at a key
// the shell does not know would be a dead button: App.jsx ignores an unknown
// tab event without a word.
//
// The full entries (icon, screen element) stay in App.jsx's TABS array. That
// array is JSX and cannot be imported here without pulling in every screen, so
// tabList.test.mjs reads App.jsx instead and fails if the two disagree. A new
// tab missing from this list is a red test, not a missing door.
//
// Pure data and no imports, so it runs under plain node.

export const TAB_LIST = [
  { key: "toolz", label: "Music ConnectZ" },
  { key: "onboardz", label: "OnboardZ" },
  { key: "postz", label: "PostZ" },
  { key: "filez", label: "FileZ" },
  { key: "playlistz", label: "PlaylistZ" },
  { key: "social", label: "SocialiZeZ" },
  { key: "budgetz", label: "BudgetZ" },
  { key: "genrez", label: "GenreZ" },
  { key: "vybez", label: "VybeZ" },
  { key: "soundcloudengagementz", label: "SoundCloud Engagement" },
  { key: "coachz", label: "CoachZ" },
  { key: "profilez", label: "ProfileZ" },
  { key: "voicez", label: "VoiceZ" },
  { key: "personaz", label: "PersonaZ" },
  { key: "preferencez", label: "PreferenceZ" },
  { key: "substancez", label: "SubstanceZ" },
  { key: "zodiacz", label: "ZodiacZ" },
  { key: "facez", label: "FaceZ" },
  { key: "lookmaxz", label: "LookZMaxZ" },
  { key: "distributez", label: "DistributeZ" },
  { key: "ratez", label: "Rate ConnectZ" },
  { key: "sonday", label: "Sonday" },
  { key: "parcel", label: "Parcel Primate" },
  { key: "merchz", label: "MercheZ" },
  { key: "beatz", label: "BeatZ" },
  { key: "statsz", label: "StatsZ" },
  { key: "opportunitiez", label: "OpportunitieZ" },
  { key: "specz", label: "SpecZ" },
  { key: "membershipz", label: "MembershipZ" },
  { key: "adz", label: "AdZ" },
  { key: "offerz", label: "OfferZ" },
  { key: "mimez", label: "MimeZ" },
  { key: "directz", label: "DirectZ" },
  { key: "lessonz", label: "LessonZ" },
  { key: "singz", label: "SingZ" },
  { key: "rapz", label: "RapZ" },
  { key: "guitarz", label: "GuitarZ" },
  { key: "bassz", label: "BassZ" },
  { key: "keyz", label: "KeyZ" },
  { key: "violinz", label: "ViolinZ" },
  { key: "flutez", label: "FluteZ" },
  { key: "saxz", label: "SaxZ" },
  { key: "clarinetz", label: "ClarinetZ" },
  { key: "trumpetz", label: "TrumpetZ" },
  { key: "messagez", label: "MessageZ" },
  { key: "keyconnectz", label: "KeyConnectZ" },
  { key: "intelligencez", label: "IntelligenceZ" },
  { key: "sentenceconnectz", label: "Sentence ConnectZ" },
  { key: "sentencez", label: "SentenceZ" },
  { key: "characterz", label: "CharacterZ" },
  { key: "mangaz", label: "MangaZ" },
  { key: "designz", label: "DesignZ" },
  { key: "mixez", label: "MixEZ" },
  { key: "discover", label: "Explore" },
  { key: "connect", label: "Connect" },
  { key: "animez", label: "AnimeZ" },
  { key: "animeconnectz", label: "Anime ConnectZ" },
  { key: "instrumentalconnectz", label: "Instrumental ConnectZ" },
  { key: "mixconnectz", label: "Mix ConnectZ" },
  { key: "imageconnectz", label: "Image ConnectZ" },
  { key: "viewz", label: "ViewZ" },
  { key: "videoconnectz", label: "Video ConnectZ" },
  { key: "videoz", label: "VideoZ" },
  { key: "imagez", label: "ImageZ" },
  { key: "occ", label: "OCC" },
  { key: "logz", label: "LogZ" },
  { key: "royaltiez", label: "RoyaltieZ" },
  { key: "callz", label: "CallZ" },
  { key: "gamez", label: "GameZ" },
  { key: "soundz", label: "SoundZ" },
  { key: "metz", label: "MetZ" },
  { key: "tunerz", label: "TunerZ" },
  { key: "chordz", label: "ChordZ" },
  { key: "breathz", label: "BreathZ" },
  { key: "drumz", label: "DrumZ" },
  { key: "producez", label: "ProduceZ" },
  { key: "journalz", label: "JournalZ" },
  { key: "habitz", label: "HabitZ" },
  { key: "lilith", label: "Lilith" },
  { key: "bodiez", label: "BodieZ" },
  { key: "healthz", label: "HealthZ" },
  { key: "collabz", label: "CollabZ" },
  { key: "venuez", label: "VenueZ" },
  { key: "battlez", label: "BattleZ" },
  { key: "labelz", label: "LabelZ" },
  { key: "groupz", label: "GroupZ" },
  { key: "bugz", label: "BugZ" },
  { key: "dawz", label: "DawZ" },
  { key: "arsenal", label: "Arsenal" },
  { key: "fruitymobius", label: "Fruity Möbius" },
  { key: "witchcraft", label: "Witchcraft" },
  { key: "azrael", label: "Azrael" },
  { key: "trumptoupee", label: "Trump Toupee" },
  { key: "studiodragon", label: "Studio Dragon" },
  { key: "settingz", label: "Settings" },
  { key: "cleanconnectz", label: "Clean ConnectZ" },
  { key: "formulawon", label: "FormulaWon" },
  { key: "intuition", label: "Intuition" },
  { key: "funnelz", label: "FunnelZ" },
  { key: "dupez", label: "DupeZ" },
  { key: "iconz", label: "IconZ" },
];

const LABEL_BY_KEY = new Map(TAB_LIST.map((t) => [t.key, t.label]));

// The label for a tab key, or null when the shell has no tab by that key.
export function tabLabel(key) {
  return LABEL_BY_KEY.get(String(key)) || null;
}

export function isTabKey(key) {
  return LABEL_BY_KEY.has(String(key));
}
