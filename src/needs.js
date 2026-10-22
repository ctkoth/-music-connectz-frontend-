// "By what you need": the other way into the same apps.
//
// The home screen leads with the instrument coaches, which answers "what do I
// play?". A newcomer often does not know what the apps are for, so this answers
// "what do I want?" instead and says, per app, what it does FOR THEM. Same tabs,
// same routing — a lens, not a second menu. Every key must be a real tab
// (needs.test.mjs), and every line says what the app does, not what it is called.
//
// An app may appear under more than one need; that is the point.
export const NEEDS = [
  { key: "better", emoji: "🎯", title: "Get better at my instrument or voice",
    blurb: "Send a take, get a score and the reasons, then send it again.",
    apps: [
      { key: "singz", label: "SingZ", why: "Scores a vocal take on pitch, timing and tone, and says what to fix." },
      { key: "rapz", label: "RapZ", why: "Scores a verse on flow, timing, breath, clarity and delivery." },
      { key: "guitarz", label: "GuitarZ", why: "Scores a guitar take; BassZ, KeyZ, DrumZ and ViolinZ do the same for theirs." },
      { key: "metz", label: "MetZ", why: "A metronome to practise against." },
      { key: "tunerz", label: "TunerZ", why: "Tune by ear." },
      { key: "breathz", label: "BreathZ", why: "Free breath training; the coach's Breath score is the measure." },
    ] },
  { key: "heard", emoji: "📣", title: "Get my music heard",
    blurb: "Put work where people can listen, rate it and share it.",
    apps: [
      { key: "postz", label: "PostZ", why: "Post a track, video or lyric; ratings and plays come back to you." },
      { key: "playlistz", label: "PlaylistZ", why: "Group tracks into a playlist." },
      { key: "viewz", label: "ViewZ", why: "See who viewed your posts, how long they stayed, and where they came from." },
      { key: "distributez", label: "DistributeZ", why: "Turn a finished post into a release for the stores." },
    ] },
  { key: "promote", emoji: "🎬", title: "Make something to promote it",
    blurb: "Videos, words and backing tracks for a release.",
    apps: [
      { key: "videoconnectz", label: "Video ConnectZ", why: "A music video from a few shots, with your own track playing under it." },
      { key: "sentenceconnectz", label: "Sentence ConnectZ", why: "Captions, promo posts, lyrics, a bio or a resume, written to your brief." },
      { key: "instrumentalconnectz", label: "Instrumental ConnectZ", why: "A backing track you can keep and release." },
      { key: "mixconnectz", label: "Mix ConnectZ", why: "Master a finished song on your device: measured loudness, tone and peaks, free." },
    ] },
  { key: "people", emoji: "🤝", title: "Find people to work with",
    blurb: "Collaborators, opponents and an audience.",
    apps: [
      { key: "collabz", label: "CollabZ", why: "Start a deal with a split, an escrow and release dates." },
      { key: "battlez", label: "BattleZ", why: "Challenge someone, or enter an open battle; the community rates it." },
      { key: "messagez", label: "MessageZ", why: "Message anyone you have history with; a first message to a stranger costs a little ⚡." },
      { key: "groupz", label: "GroupZ", why: "Your own private lists of people." },
    ] },
  { key: "paid", emoji: "💵", title: "Earn from what I make",
    blurb: "Where the money and the 🍥 come from.",
    apps: [
      { key: "royaltiez", label: "RoyaltieZ", why: "What your posts have earned, and why each earns what it does." },
      { key: "collabz", label: "CollabZ", why: "Get paid for a deal through escrow." },
      { key: "lessonz", label: "LessonZ", why: "Teach, or book a lesson." },
      { key: "adz", label: "AdZ", why: "Earn 🍥 for watching ads." },
      { key: "offerz", label: "OfferZ", why: "Offers that pay 🍥 when you complete them." },
    ] },
  { key: "numbers", emoji: "📊", title: "Understand where I stand",
    blurb: "Scores, views, and where your credits went.",
    apps: [
      { key: "logz", label: "LogZ", why: "Every ⚡, 🍥 and 🏷️ that moved, with the reason." },
      { key: "viewz", label: "ViewZ", why: "Views, stay time and who came back." },
      { key: "ratez", label: "Rate ConnectZ", why: "Rate other members' work to earn ⚡, and see every rating you have." },
    ] },
  { key: "routine", emoji: "🔥", title: "Keep a routine going",
    blurb: "Streaks, habits and a place to write things down.",
    apps: [
      { key: "lilith", label: "Lilith", why: "Routines and tasks that tick themselves from what you actually do." },
      { key: "habitz", label: "HabitZ", why: "Habits with streaks." },
      { key: "journalz", label: "JournalZ", why: "A diary that publishes nothing." },
      { key: "bodiez", label: "BodieZ", why: "A workout log." },
    ] },
  { key: "account", emoji: "⚙️", title: "Set up my account",
    blurb: "Profile, plan and how things work.",
    apps: [
      { key: "profilez", label: "ProfileZ", why: "Your profile, links and what others can see." },
      { key: "filez", label: "FileZ", why: "Every file you've uploaded: post one, make an image your picture, free up storage." },
      { key: "membershipz", label: "MembershipZ", why: "Your plan, and what each plan holds." },
      { key: "onboardz", label: "OnboardZ", why: "A short list of first steps, each linking to the control that does it." },
      { key: "bugz", label: "BugZ", why: "Report something that is broken." },
    ] },
];

/** The apps under one need, or [] for a need that does not exist. */
export function appsFor(needKey) {
  return (NEEDS.find((n) => n.key === needKey) || { apps: [] }).apps;
}
