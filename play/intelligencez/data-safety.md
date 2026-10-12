# Data safety — IntelligenceZ listing (checked against the code on 12 October 2026)

IntelligenceZ signs in with a Music ConnectZ account, so registering here creates a
full Music ConnectZ account (profile, wallet, and a username every signed-in Music
ConnectZ member can find). The IntelligenceZ-only shell contains sign-in, a hub and
four screens — Write, Chat, Compose, Master — and nothing else: no profile,
orientation, substance or attractiveness-rating screens, no messaging, no feed, no
purchases. That is what keeps the *screens* out of the two policy risks
`../data-safety.md` flags for the main app. The *account* is still the main app's, so
say so honestly on the form. Re-check if the shell ever grows more screens.

The one thing this app does that BodieZ's does not: **text a member types leaves our
hands and goes to a third-party AI service.** That is the part of this form that
needs care, and it is why "shared" is answered **yes** below.

| Data | Collected | Purpose | Shared | Optional |
|---|---|---|---|---|
| Username, email address, password | yes | account | no | no — all three are required |
| Phone number | yes | account / sign-in | no | yes |
| Birthday | yes | account (works out a star sign and an age band; it gates nothing at sign-up) | no | yes |
| **Other user-generated content:** what a member types into Write (the brief, the style, the kind) and Compose (genre, instruments, tempo, key, length, note), and the pieces and loops the AI writes back | yes — stored with the account | app function | **yes — Google (Gemini API)** | yes |
| **Other user-generated content, Chat:** each message and the most recent turns of the conversation on screen. **Not stored** unless the member saves the reply to WorkZ or reports it (a report keeps the reply first, so a person can read it) | in transit to the AI service always; stored only on Save or Report | app function | **yes — Anthropic (Claude API)** | yes |
| **Audio files:** a master the member saves from Mix ConnectZ (the mastered WAV), with a record of its title, settings and before/after measurements. **Only when the member presses Save.** The song they mastered from, and any reference track, are never uploaded | yes — only on Save | app function | no | yes |
| Random browser identifier + sign-up/sign-in step events (no name or email) | yes | analytics: where sign-up breaks | no | no |
| IP address — account-creation address kept for the life of the account; up to 12 recent sign-in addresses, older ones dropped after 180 days at the next sign-in | yes | fraud / duplicate-account detection | no | no |
| Ledger line per AI run (app and cost, never the text) | yes | app function | no | no |
| Crash reports / diagnostics | **no** — no crash or analytics SDK is in the build | — | — | — |

- Encrypted in transit: yes (HTTPS).
- Users can request deletion: yes — in the app (scroll to the bottom of any screen →
  *Delete my account*) and on the web at `https://musicconnectz.net/delete-account.html`.
  Play asks for both. Deleting removes the rows and the stored files, including every
  saved master's audio.
- Not sold. No ads: the shell loads no ad script and the main app's rewarded-ads plugin
  is not in a TWA. Answer **No** to "contains ads".
- Not collected by this build: location, contacts, photos, video, camera, microphone,
  health or fitness data, financial info, messages. Mix ConnectZ reads **a file the
  member picks** with the system file picker; the app declares no Android permissions.

## Why "shared: yes" for the typed text, and what that rests on

Play's form treats data sent to a *service provider that processes it on your
behalf* as not "shared". Whether Google and Anthropic fit that depends on which terms
the API keys are under — whether Gemini is on a paid tier or the free one (the free
tier's terms allow Google to use content to improve its products), and the Claude API
under Anthropic's commercial terms — and **nothing in this repo can tell**. The policy
therefore says only "processed under its own terms", and this form errs toward
disclosing. If you confirm both keys are on terms that make them processors, "shared"
can honestly move to **no**, and that is a one-line change to this file and to the
Console form; the other direction, after a reviewer finds it, is a rejection.

## Open items

- **A saved master's link opens without signing in.** Audio players cannot send an
  Authorization header, so `/api/economy/media/<id>/<name>` is unauthenticated by design
  (`apps/economy/media.py`). The id and the filename must agree, so ids cannot be walked
  for a list, but the filename is the title the member typed. The policy says so in
  plain words and the hub repeats it. Account-private audio would need signed,
  expiring links — a backend change, not made here.
- **The age question is open.** Registration is optional on birthday and enforces no
  minimum age, while the policy says 13+. Chat with an AI model is a Play question for
  that age range; decide the target-audience answer before submitting (`README.md`).
- **Account export does not include IntelligenceZ data.** If the form says members can
  export their data, that is not yet true for these rows.
