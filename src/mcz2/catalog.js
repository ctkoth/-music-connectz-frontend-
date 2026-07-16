// Blueprint app catalog — the Music ConnectZ tab/app taxonomy from Corey's
// blueprints, folded into the 2.2 rebuild. Each app carries its real icon
// (a key in CUSTOM_ICONS) and a Corey-voice description shown in the tap modal.
// `fn` marks apps with a working page in this build; the rest open their
// description modal (the blueprint's "click the icon → modal" pattern) until
// their full logic is built.

export const CATALOG = [
  {
    label: "SkillZ",
    apps: [
      { key: "mimez", name: "MimeZ", emoji: "🕺", icon: "mimez.png", desc: "Lipsync & dance selfie challenges — capture a real performance take from your camera." },
      { key: "directz", name: "DirectZ", emoji: "🎬", icon: "directz.png", desc: "Directing drills — shot planning, scene calls, and creative direction assignments." },
      { key: "lessonz", name: "LessonZ", emoji: "🎓", icon: "lessonz.png", desc: "Guided learning paths, technique breakdowns, mini-courses, and structured practice modules." },
      { key: "singz", name: "SingZ", emoji: "👩🏼‍🎤", icon: "singz.png", desc: "Vocal training built like a game: range detection, warmups, pitch/breath scoring, Boss SongZ — voice health first." },
      { key: "rapz", name: "RapZ", emoji: "👨🏼‍🎤", icon: "rapz.png", desc: "Rap training: 16 style tracks, flow pockets, breath control, punchlines, a combo meter, and Boss Mode." },
      { key: "drumz", name: "DrumZ", emoji: "🥁", icon: "drumz.png", desc: "Drum training — technique, timing, rudiments, chops & fills." },
      { key: "violinz", name: "ViolinZ", emoji: "🎻", icon: "violinz.png", desc: "Violin training — posture, bowing, intonation, repertoire." },
      { key: "guitarz", name: "GuitarZ", emoji: "🎸", icon: "guitarz.png", desc: "Guitar training — chords, strumming, riffs, lead." },
      { key: "bassz", name: "BassZ", emoji: "🎸", icon: "bassz.png", desc: "Bass training — groove, fingerstyle, slap, locking in." },
      { key: "keyz", name: "KeyZ", emoji: "🎹", icon: "keyz.png", desc: "Keyboard training — hands, chords, scales, reading." },
      { key: "producez", name: "ProduceZ", emoji: "🎚️", icon: "producez.png", desc: "Producer training — beat construction, arrangement, sound selection, mixing fundamentals." },
      { key: "designz", name: "DesignZ", emoji: "🎨", icon: "designz.png", desc: "Design briefs with explicit goals — cover art, branding, visuals. Upload the finished work." },
      { key: "shotz", name: "ShotZ", emoji: "📸", icon: "shotz.png", desc: "Shooting assignments — capture photo/video work to a real brief." },
      { key: "developz", name: "DevelopZ", emoji: "👾", icon: "developz.png", desc: "Code development training — ship real builds: an arcade game, a puzzle, an API toy, an open-source PR." },
      { key: "managez", name: "ManageZ", emoji: "🕴🏼", icon: "managez.png", desc: "Management drills verified server-side: found a label, offer a contract, book a collab, build a roster, send outreach." },
      { key: "bodiez", name: "BodieZ", emoji: "💪🏽", icon: "bodiez.png", desc: "Strength & body-transformation: Jefit-style muscle groups, equipment/location-aware exercise library, custom routines, live session logging, and a StatZ AI coach.", fn: true },
    ],
  },
  {
    label: "CollabZ",
    apps: [
      {
        key: "collabz", name: "CollabZ", emoji: "🤝", icon: "collabz.png",
        desc: "Collaborate with other users and manage collab projects — filter collaborators by NationalitieZ heritage, SubstanceZ stance, and PreferenceZ.",
        children: [
          { name: "CoverZ", emoji: "🫴🏼", icon: "coverz.png", desc: "Covers of songs and redraws of existing art." },
          { name: "RemixeZ", emoji: "🔄", icon: "collabz_remixez.png", desc: "Remixing posts and songz." },
        ],
      },
    ],
  },
  {
    label: "CompeteZ",
    apps: [
      {
        key: "battlez", name: "BattleZ", emoji: "🪖", icon: "battlez.png",
        desc: "One post versus another. Contestants verified 18+ can bet money on themselves; other users bet SpinAZ. Winners decided by community rating. Browse and filter battles by NationalitieZ, SubstanceZ, and PreferenceZ.",
        children: [
          { name: "Freestyle", emoji: "🆓", icon: "battlez.png", desc: "Live sporadic battles." },
          { name: "1v1", emoji: "1️⃣", icon: "battlez.png", desc: "One artist versus one artist, regardless of other personas helping." },
          { name: "Battle Cypher", emoji: "🧑‍🤝‍🧑", icon: "battlez.png", desc: "More than one artist versus more than one, with other personas helping." },
        ],
      },
    ],
  },
  {
    label: "ConnectZ",
    apps: [
      {
        key: "social_connectz", name: "Social ConnectZ", emoji: "💓", icon: "social_connectz.png",
        desc: "Social matching, message boards, and personality-based discovery — filterable by your NationalitieZ heritage, SubstanceZ stance, and PreferenceZ partner preference.",
        fn: true,
        children: [
          { name: "VibeZ", emoji: "♥️", icon: "socialz.png", desc: "Plenty of Fish-style dating/collab app — clear about what you're looking for: romance or a partnership collab." },
          { name: "Inferno", emoji: "❤️‍🔥", icon: "socialz.png", desc: "Tinder-style dating/collab app — romance or a quick collab." },
          { name: "BoardZ", emoji: "🪧", icon: "boardz.png", desc: "Message boards." },
          { name: "PersonalitieZ", emoji: "😶", icon: "intuition.png", desc: "MBTI tests, simple and complex." },
        ],
      },
      {
        key: "messagez", name: "MessageZ", emoji: "📨", icon: "messagez.png",
        desc: "Your messaging center.",
        children: [
          { name: "Inbox", emoji: "📥", icon: "inbox.png", desc: "Incoming messages." },
          { name: "Outbox", emoji: "📤", icon: "messagez_outbox.png", desc: "Sent messages." },
        ],
      },
      {
        key: "callz", name: "CallZ", emoji: "📞", icon: "callz.png",
        desc: "Available to StatZ; requires a cash balance to call. SpinAZ attempts say \"coming soon\" and prompt you to add balance via Stripe/PayPal.",
        children: [
          { name: "AI", emoji: "🤖", icon: "callz_ai.png", desc: "Costs vary by AI model choice." },
          { name: "User", emoji: "🗣️", icon: "callz_user.png", desc: "Costs vary by the other user's skill, per hour." },
        ],
      },
      {
        key: "groupz", name: "GroupZ", emoji: "👥", icon: "groupz.png",
        desc: "Combine other users into editable groups: Friends (mutual benefits), Fans, Partners (frequent collaborators), Blocked (cannot contact you), or Custom. Create renamable custom groups (free 1 / premium 5 / statz 20) with per-group visibility.",
        fn: true,
        children: [
          { name: "Friends", emoji: "🙂", icon: "groupz_friendz.png", desc: "Mutual benefits." },
          { name: "Fans", emoji: "👋🏽", icon: "groupz_fanz.png", desc: "Followers you have less need to manage." },
          { name: "Blocked", emoji: "🤚🏽", icon: "groupz_blocked.png", desc: "Cannot contact you." },
          { name: "Custom", emoji: "❓", icon: "groupz_custom.png", desc: "Type your own group title." },
        ],
      },
    ],
  },
  {
    label: "MetricZ",
    apps: [
      { key: "nationalitiez", name: "NationalitieZ", emoji: "🌐", icon: "nationalitiez.png", desc: "Your heritage — pick by continent (e.g. Africa) if you don't know the specific country, or choose exact countries. A filterable metric across Social ConnectZ, CollabZ, and BattleZ.", fn: true },
      { key: "substancez", name: "SubstanceZ", emoji: "🧠", icon: "substancez.png", desc: "Declare your stance on caffeine, nicotine, alcohol, cannabis, prescriptions, and psychedelics — for sober-friendly matching and healthy spaces. A filterable metric across the platform.", fn: true },
      { key: "preferencez", name: "PreferenceZ", emoji: "💞", icon: "preferencez_partner.jpg", desc: "Your partner preference — Male, Female, or Neutral — plus the traits that matter to you. Powers compatibility and is a filterable metric across matching, collabs, and battles.", fn: true },
    ],
  },
  {
    label: "BusinessZ",
    apps: [
      { key: "labelz", name: "LabelZ", emoji: "🏷️", icon: "labelz.png", desc: "Essentially public groups. Requires Premium, A&R Scout, or Manager persona to create/edit. Gives advances with terms — record-label logic with e-signed contracts." },
      { key: "distributez", name: "DistributeZ", emoji: "🎶", icon: "distributez.png", desc: "Distribution submissions that fill metadata by media type: audio becomes the track, image the cover, text the lyrics. Free = 1/month; Premium & StatZ unlimited; StatZ can submit for licensing." },
      { key: "royaltiez", name: "RoyaltieZ", emoji: "👑", icon: "royaltiez.png", desc: "Current balance and logz, with every royalty source timestamped." },
      { key: "specz", name: "SpecZ", emoji: "✴️", icon: "specz.png", desc: "The StatZ marketplace for purchasable user metadata & UGC — audience demographics, engagement analytics, genre intelligence, and creator content packs. StatZ only.", fn: true, statz: true },
    ],
  },
  {
    label: "ToolZ",
    apps: [
      { key: "keyconnectz", name: "Key ConnectZ", emoji: "⌨️", icon: "keyconnectz.png", desc: "System keyboard on mobile, floating keyboard on desktop (Ctrl+Shift+K). Custom background image, mic speech-to-text, and translation to your desired output." },
      { key: "sentencez", name: "SentenceZ", emoji: "📃", icon: "sentencez.png", desc: "A Microsoft Word-style editor — all text media opens here." },
      { key: "imagez", name: "ImageZ", emoji: "🖼️", icon: "imagez.png", desc: "A Photoshop-style editor — all image media opens here." },
      { key: "videoz", name: "VideoZ", emoji: "📹", icon: "shotz.png", desc: "A Sony Vegas-style editor — all video media opens here." },
      { key: "lilith", name: "Lilith", emoji: "💃🏽", icon: "toolz_lilith.png", desc: "An Apple Things-style engine with MCZ mission logic: Inbox, Today, Upcoming, Anytime, Someday, Logbook, RewardZ, AutomationZ. Combo chains, streaks, and XP-based completion — the Artist's Daily Engine." },
    ],
  },
  {
    label: "You",
    apps: [
      { key: "onboardz", name: "OnboardZ", emoji: "👋", icon: "onboardz.jpg", desc: "Your guided first session — set up your profile, pick a persona, post your first work, and explore a SkillZ app. Auto-checks each step as you go.", fn: true },
      { key: "setup", name: "Setup", emoji: "⚙️", icon: "preferencez.png", desc: "Your profile basics — name, contact, location, bio, and picture.", fn: true },
      { key: "personas", name: "PersonaZ", emoji: "🎭", icon: "personaz.png", desc: "Pick your personas (Artist, Producer, Mix Engineer, Designer, Videographer, Manager, Ghostwriter, Developer) and add your skills.", fn: true },
      { key: "examples", name: "PostZ", emoji: "🎵", icon: "spinaz.png", desc: "Upload work examples — audio becomes the track, image the cover, text the lyrics — with genre, required skills, and privacy.", fn: true },
      { key: "profile", name: "Profile", emoji: "👤", icon: "personaz_indieartist.png", desc: "Your public profile — picture, bio, contact, and skills.", fn: true },
      { key: "money", name: "Money", emoji: "💰", icon: "energy.png", desc: "Your wallet — balance, earnings, add funds via Stripe, and payment history.", fn: true },
      { key: "bugz", name: "BugZ", emoji: "🐞", icon: "bugz.png", desc: "Submit a bug as a post. Admins mark it In Progress 💭 or Squashed 🪦 (which rewards you 200 SpinAZ)." },
      { key: "settings", name: "Settings", emoji: "⚙️", icon: "preferencez.png", desc: "Themes, notifications, and preferences.", fn: true },
    ],
  },
];

// Flat lookup of every top-level app by key.
export const APPS_BY_KEY = Object.fromEntries(
  CATALOG.flatMap((g) => g.apps).map((a) => [a.key, a]),
);
