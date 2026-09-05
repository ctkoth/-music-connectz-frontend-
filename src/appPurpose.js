// What each app is FOR, in the words somebody would actually search.
//
// Straight out of ITS335's material: `Interaction Design` (Rogers, Sharp &
// Preece) puts LEARNABILITY among its six usability goals, and Nielsen's
// "recognition rather than recall" says the same thing from the other side —
// a system should not make you retrieve from memory what it could show you.
//
// The dock's drawer lists thirty apps as a grid of artwork with invented
// names: SpinaZ, PromptZ, OmviardZ, SpecZ, MimeZ. Finding one requires either
// remembering it exists or scanning thirty icons hoping to recognise the right
// picture. That is recall twice over — of the name AND of what the name means
// — and it is the single heaviest cognitive load in this app.
//
// The fix is not renaming anything. The invented vocabulary is the brand and
// members who stay will learn it. The fix is that you should be able to find
// the app by describing THE THING YOU WANT TO DO, in ordinary words, and be
// shown the one whose name you would never have guessed. Type "record" and get
// SingZ. Type "money" and get RoyaltieZ, MembershipZ and CallZ.
//
// So each entry is a plain-English purpose plus the words a stranger would
// reach for — not synonyms of the app's own name, which would only match
// people who already knew it.
export const APP_PURPOSE = {
  onboardz:    { does: "Set your profile up",            words: "start setup welcome begin first steps getting started" },
  postz:       { does: "Share a track or video",         words: "post upload share feed publish release song" },
  playlistz:   { does: "Collect tracks into a playlist", words: "playlist collection album mixtape queue" },
  social:      { does: "Find and follow members",        words: "social follow friends people discover network community" },
  profilez:    { does: "Your identity and skills",       words: "profile persona skills bio avatar about me rates" },
  specz:       { does: "Attach custom metadata",         words: "metadata tags notes preferences bpm specs" },
  membershipz: { does: "Plans and what each buys",       words: "membership upgrade subscription plan price tier pay premium statz" },
  adz:         { does: "Watch ads to earn",              words: "ads earn free coin spinaz reward watch" },
  offerz:      { does: "Complete offers to earn",        words: "offers earn free coin spinaz rewards tasks" },
  mimez:       { does: "Practise performance",           words: "mime performance acting stage practice" },
  directz:     { does: "Post and rate video work",       words: "video film director reel movie footage craft" },
  lessonz:     { does: "Book or teach a lesson",         words: "lesson teach learn tutor booking coach hire class" },
  singz:       { does: "Record singing and get scored",  words: "sing vocal record voice pitch coach score take practice" },
  rapz:        { does: "Record rap and get scored",      words: "rap bars flow record freestyle score take practice" },
  messagez:    { does: "Direct messages",                words: "message dm chat inbox talk write contact" },
  keyconnectz: { does: "Translate and read aloud",       words: "translate language keyboard speak voice transcribe foreign" },
  occ:         { does: "Build things with AI",           words: "ai assistant chat build code project agent help" },
  logz:        { does: "Where your balances moved",      words: "history ledger log transactions where did my money went activity" },
  journalz:    { does: "Private diary",                  words: "journal diary write notes private entries" },
  habitz:      { does: "Track habits and patterns",      words: "habit track streak routine daily notice pattern" },
  collabz:     { does: "Work with other members",        words: "collab collaborate together feature split deal partner" },
  battlez:     { does: "Compete head to head",           words: "battle compete versus contest challenge fight cypher" },
  labelz:      { does: "Label contracts and rosters",    words: "label contract roster sign artist deal advance" },
  groupz:      { does: "Manage who sees what",           words: "groups friends fans blocked circles privacy visibility" },
  bugz:        { does: "Report a bug and get paid",      words: "bug report broken problem issue fix error feedback" },
  funnelz:     { does: "Owner: join funnel numbers",     words: "funnel analytics conversion stats owner numbers growth" },
  royaltiez:   { does: "Your royalty balance and cashout", words: "royalties money earnings payout cashout withdraw paid revenue" },
  callz:       { does: "Call a member, by the minute",   words: "call phone talk voice ring hire consult minutes" },
  gamez:       { does: "Build and play games",           words: "game play build arcade web unity fun" },
  soundz:      { does: "Change what the app sounds like", words: "sound audio noise sfx effects volume mute pack" },
};

/** Does this app match what somebody typed? Matches the app's own name, its
 *  purpose, and the ordinary words for it — so "where did my money go" finds
 *  LogZ even though nothing in that phrase is the word "LogZ". */
export function matchesApp(app, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  const p = APP_PURPOSE[app.key] || {};
  const hay = `${app.key} ${app.label} ${p.does || ""} ${p.words || ""}`.toLowerCase();
  // Every word has to appear SOMEWHERE, so "record rap" narrows to RapZ rather
  // than returning everything that mentions either.
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export function purposeOf(key) {
  return APP_PURPOSE[key]?.does || "";
}
