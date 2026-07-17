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
        desc: "One post versus another. Contestants verified 18+ can bet money on themselves; other users bet SpinAZ. Winners decided by anonymous community rating (0–10, 3+ ratings to qualify). Browse and filter battles by NationalitieZ, SubstanceZ, and PreferenceZ.",
        fn: true,
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
        desc: "Your messaging center — Inbox and Outbox.",
        fn: true,
        children: [
          { name: "Inbox", emoji: "📥", icon: "inbox.png", desc: "Incoming messages." },
          { name: "Outbox", emoji: "📤", icon: "messagez_outbox.png", desc: "Sent messages." },
        ],
      },
      {
        key: "callz", name: "CallZ", emoji: "📞", icon: "callz.png", fn: true,
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
      { key: "zodiacz", name: "ZodiacZ", emoji: "♌", icon: "zodiacz.png", desc: "Your personal cosmic guide — auto-detects your sign from your birthday, with a Corey-voice read on all 12 signs. A filterable metric across matching, collabs, and battles.", fn: true },
    ],
  },
  {
    label: "BusinessZ",
    apps: [
      { key: "labelz", name: "LabelZ", emoji: "🏷️", icon: "labelz.png", desc: "Essentially public groups. Requires Premium, A&R Scout, or Manager persona to create/edit. Gives advances with terms — record-label logic with e-signed contracts.", fn: true },
      { key: "distributez", name: "DistributeZ", emoji: "🎶", icon: "distributez.png", desc: "Distribution submissions that fill metadata by media type: audio becomes the track, image the cover, text the lyrics. Free = 1/month; Premium & StatZ unlimited; StatZ can submit for licensing.", fn: true },
      { key: "royaltiez", name: "RoyaltieZ", emoji: "👑", icon: "royaltiez.png", desc: "Current balance and logz, with every royalty source timestamped.", fn: true },
      { key: "specz", name: "SpecZ", emoji: "✴️", icon: "specz.png", desc: "The StatZ marketplace for purchasable user metadata & UGC — audience demographics, engagement analytics, genre intelligence, and creator content packs. StatZ only.", fn: true, statz: true },
    ],
  },
  {
    label: "ToolZ",
    apps: [
      { key: "keyconnectz", name: "Key ConnectZ", emoji: "⌨️", icon: "keyconnectz.png", desc: "System keyboard on mobile, floating keyboard on desktop (Ctrl+Shift+K). Custom background image, mic speech-to-text, and translation to your desired output." },
      { key: "sentencez", name: "SentenceZ", emoji: "📃", icon: "sentencez.png", desc: "A Microsoft Word-style editor — all text media opens here." },
      { key: "imagez", name: "ImageZ", emoji: "🖼️", icon: "imagez.png", desc: "A Photoshop-style editor — all image media opens here." },
      { key: "videoz", name: "VideoZ", emoji: "📹", icon: "videoz.png", desc: "A Sony Vegas-style editor — all video media opens here." },
      { key: "lilith", name: "Lilith", emoji: "💃🏽", icon: "toolz_lilith.png", desc: "An Apple Things-style engine with MCZ mission logic: Inbox, Today, Upcoming, Anytime, Someday, Logbook, Trash. XP-based completion — the Artist's Daily Engine.", fn: true },
      { key: "cleanconnectz", name: "Clean ConnectZ", emoji: "🧹", icon: "cleanconnectz.png", desc: "Device cleaner. StatZ users set a target percent or size; AI selects the largest, least-used files to delete first (by priority, size, or frequency) until the target is met." },
      { key: "sonday", name: "Sonday", emoji: "🌞", icon: "sonday.png", desc: "A Monday.com-style project/board manager for your creative work." },
      { key: "builder", name: "Builder", emoji: "🏗️", icon: "builder.png", desc: "A Buffer-style post scheduler and management tool." },
      { key: "parcel", name: "Parcel Primate", emoji: "🐵", icon: "parcel.png", desc: "A Mailchimp-style email campaign tool." },
      { key: "filez", name: "FileZ", emoji: "📁", icon: "filez.png", desc: "File management and uploads. Storage caps by tier: Free 400MB / Premium 5GB / StatZ 100GB.", fn: true },
    ],
  },
  {
    label: "StudioZ",
    apps: [
      {
        key: "dawz", name: "DawZ", emoji: "🎛️", icon: "dawz.png",
        desc: "The DAW hub — VST support with filtering by your installed plugins. Each engine is a full production environment.",
        children: [
          { name: "Fruity Möbius", emoji: "🍑", icon: "fruity_mobius.png", desc: "An FL Studio-style DAW." },
          { name: "Arsenal", emoji: "⚔️", icon: "arsenal.png", desc: "A Pro Tools-style DAW." },
          { name: "Witchcraft", emoji: "🔮", icon: "witchcraft.png", desc: "An Acoustica Mixcraft-style DAW." },
          { name: "Trump Toupee", emoji: "🤵🏼‍♂️", icon: "trump_toupee.png", desc: "A Bitwig-style DAW." },
          { name: "Azrael", emoji: "☠️", icon: "azrael.png", desc: "A Reaper-style DAW." },
          { name: "Intuition", emoji: "🤔", icon: "intuition.png", desc: "A Logic Pro-style DAW." },
          { name: "FormulaWon", emoji: "🚦", icon: "dawz_formulawon.png", desc: "A GarageBand-style DAW." },
        ],
      },
      {
        key: "intelligence", name: "Intelligence", emoji: "🧠", icon: "intelligence.png",
        desc: "The AI creation suite. Everything it makes attributes Corey Knap to the applicable role (Ghostwriter, Designer, Mix Engineer, Producer), adds a low-gradient MCZ watermark, and splits transparent royalties — 15% to admin plus a mirrored contributor split.",
        fn: true,
        children: [
          { name: "Sentence ConnectZ", emoji: "📃", icon: "sentencez.png", desc: "AI docs, lyrics, essays, contracts — with language, tone, and rhyme controls." },
          { name: "Image ConnectZ", emoji: "👨🏽‍🎨", icon: "imageconnectz.png", desc: "AI cover art, portraits, promo pictures." },
          { name: "Instrumental ConnectZ", emoji: "🎹", icon: "instrumentalconnectz.png", desc: "AI instrumentals and beats." },
          { name: "Mix ConnectZ", emoji: "🎚️", icon: "mixez.png", desc: "AI mixing and mastering." },
          { name: "Video ConnectZ", emoji: "📺", icon: "videoz.png", desc: "AI music videos and intro videos." },
          { name: "Ocular Code ConnectZ", emoji: "👁️‍🗨️", icon: "occ.png", desc: "The AI code editor — see OCC." },
        ],
      },
      { key: "occ", name: "Ocular Code ConnectZ", emoji: "👁️‍🗨️", icon: "occ.png", desc: "A VS Code-style editor with git-synced TaskZ, cross-device CRUD, and real-time task ETAs. StatZ users build games in any language (incl. C++/Unreal); Premium in any language except C++. Games publish to GameZ." },
      { key: "gamez", name: "GameZ", emoji: "👾", icon: "gamez.png", desc: "User-made games built in OCC, sorted by genre and subgenre — Action, RPG, Strategy, Shooter, Puzzle, Racing, Fighting, Simulation, Sports, Horror, and more.", fn: true },
      { key: "venuez", name: "VenueZ", emoji: "🏛️", icon: "venuez.png", desc: "Host or join events — collaborative sessions and performances." },
      { key: "ratez", name: "Rate ConnectZ", emoji: "🤔", icon: "ratez.png", desc: "Rate media: images by artistic value or attractiveness, text by wit, audio by mix & performance, video by performance. Raters earn 1 Energy per rating.", fn: true },
    ],
  },
  {
    label: "EconZ",
    apps: [
      { key: "spinaz", name: "SpinaZ", emoji: "🍥", icon: "spinaz.png", desc: "Your SpinAZ log — how they're earned and spent. Buy at 80% of face value ($80 = 100). Earned by streaming other users' media (seconds played − 30).", fn: true },
      { key: "energy", name: "Energy", emoji: "⚡", icon: "energy.png", desc: "Your Energy log — earned and spent. Buy at 80% of face value. Energy is earned from ratings, comments, and daily activity.", fn: true },
      { key: "analytics", name: "Analytics", emoji: "📈", icon: "analytics.png", desc: "Deep dive into your usage and performance across the platform." },
      { key: "facez", name: "FaceZ", emoji: "🙄", icon: "facez.png", desc: "Faces available for use in AI-generated images/videos — taggable by user profile." },
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
      { key: "homez", name: "Homez", emoji: "🏠", icon: "homez.png", desc: "Your home dashboard — a quick view across your MCZ activity." },
      { key: "moodz", name: "MoodZ", emoji: "😅", icon: "moodz.png", desc: "The mood you were in when posting — tracked and filterable across the platform." },
      { key: "tellz", name: "TellZ", emoji: "🗣️", icon: "tellz.png", desc: "Logs of what you've prompted/posted, selectable per tab. Detailed (word-for-word) or Summary (AI + emoji)." },
      { key: "logz", name: "LogZ", emoji: "🪵", icon: "logz.png", desc: "Logs of what was done by day, week, month, or custom range, per tab. Detailed or Summary view." },
      { key: "bugz", name: "BugZ", emoji: "🐞", icon: "bugz.png", desc: "Submit a bug as a post. Admins mark it In Progress 💭 or Squashed 🪦 (which rewards you 200 SpinAZ)." },
      { key: "settings", name: "Settings", emoji: "⚙️", icon: "preferencez.png", desc: "Themes, notifications, and preferences.", fn: true },
    ],
  },
];

// Flat lookup of every top-level app by key.
export const APPS_BY_KEY = Object.fromEntries(
  CATALOG.flatMap((g) => g.apps).map((a) => [a.key, a]),
);
