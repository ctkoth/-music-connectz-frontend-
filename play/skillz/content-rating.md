# Content rating (IARC) — SkillZ

Answer the questionnaire from what is in this build, not from the main app. What decides
most of it:

- **Generative AI.** Every coach sends a recording to Google's Gemini, which writes the
  scores and notes; Anthropic's Claude then checks the advice (text only). The words a
  member reads were written by a model and are not reviewed before they see them; the
  providers' own safety filters are the first line. Answer the AI / chatbot and
  user-input questions as **yes**, and do not claim the output is filtered by us. What a
  member *says or sings* is the input, so the input is the member's own voice, in any
  language, about anything.
- **In-app reporting is built.** Google Play's AI-generated content policy asks for a way
  to flag output inside the app: every coach score has *Report this output*, which files
  to `POST /api/economy/report/` as `take:<coach>:<id>` and lands in the owner's queue
  (`src/components/ReportTake.jsx`). It says before it is pressed what it shares: which
  score, readable by the owner with what the coach wrote — and that the recording is not
  kept, so it cannot be heard.
- **User-to-user sharing: none.** No feed, comments, messages, profiles, live chat or file
  sharing is reachable in this app. The coaches' leaderboards are not drawn until a coach
  has drills (none has; see `README.md`), and when they are they show a username, a level
  and points — nothing from a take. The share and post doors the main site offers on a
  score are hidden in this shell (`BossTake.jsx`, `IN_SHELL`). One thing to know: a public
  score page exists for each scored take, reachable only by its link, which this app never
  displays (`data-safety.md`).
- **Recording of the user.** The app records the member's voice, and their face if they
  choose the camera, on a press. It is a capture of themselves for their own coaching. It
  keeps no recording.
- **Purchases: none.** Nothing here sells anything. **Ads: none.** **Location: none.**
- **Violence, sexual content, language, substances, gambling:** none authored by the app. A
  member can sing or rap anything, and the model will describe what it heard; say so where
  the form asks about user-generated or AI-generated content, and do not answer "no
  content of this kind can appear" — a rap take can carry strong language and the coach's
  notes may quote it (`lyrics_read` is only produced when the member asks for the lyrics to
  be rated).
- **Health.** The coach gives performance advice and the screen says it is not medical
  advice and to stop if anything hurts (`standalone/skillz/coaches.js`, `AI_NOTE`). SingZ
  and RapZ also hold back the two hardest difficulty settings when recent takes read as
  strain on breath or range (`takescorez.recovery_block`). It is not a health product and makes no claim to be one.
- **Target audience: 13+, not Families.** That matches the privacy policy's "Children"
  section. It is a rule and not a check (birthday is optional), same as BodieZ and
  IntelligenceZ. **My recommendation is 13+, and what it trades away:** a recording of a
  13-to-17-year-old's voice or face going to an AI service is a heavier thing than typed
  text. If Play reads it that way, the move is 18+, and the policy's Children section
  changes in the same commit; it costs the 13-17 audience, who are a real part of anyone
  learning an instrument. The thing that would make 13+ safer is a minimum-age check at
  sign-up, which does not exist (`data-safety.md`).
