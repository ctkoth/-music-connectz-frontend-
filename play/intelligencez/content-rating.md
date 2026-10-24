# Content rating (IARC) — IntelligenceZ

Answer the questionnaire from what is in this build, not from the main app. What
decides most of it:

- **Generative AI.** Write and Compose produce text and MIDI from what the member types
  (Google Gemini); Chat answers in free text (Anthropic Claude). Output is not reviewed
  before the member sees it, and the model providers' own safety filters are the first
  line. Answer the AI / chatbot and user-input questions as **yes**, and do not claim
  the output is filtered by us.
- **In-app reporting is built.** Google Play's AI-generated content policy asks for a way
  to flag output inside the app: Write and Chat have *Report this output*, which files
  to `POST /api/economy/report/` and lands in the owner's queue (`sentence:<id>`,
  `occ:<id>`).
- **User-to-user sharing: none.** No feed, comments, messages, profiles, live chat or
  file sharing is reachable in this app. What a member makes is theirs alone. (Anything
  that could publish a piece — posting to PostZ, attaching to a collaboration — is a
  Music ConnectZ screen, and this shell does not have it.)
- **Purchases: none.** Nothing here sells anything.
- **Ads: none.**
- **Location sharing: none.** No location permission.
- **Violence, sexual content, language, substances, gambling:** none authored by the
  app. A model can write about anything a member asks it to; say so where the form
  asks about user-generated or AI-generated content, and do not answer "no content of
  this kind can appear".
- **Target audience: 13+, not Families.** That matches the privacy policy's "Children"
  section. It is a rule and not a check (birthday is optional), same as BodieZ.
  Open question for you: an AI chat product is read more strictly for younger
  teenagers. If you would rather say 18+, change the policy's Children section in the
  same commit.
