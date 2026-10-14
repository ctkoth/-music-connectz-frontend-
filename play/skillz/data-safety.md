# Data safety — SkillZ listing (checked against the code on 12 October 2026)

SkillZ signs in with a Music ConnectZ account, so registering here creates a full
Music ConnectZ account (profile, wallet, and a username every signed-in Music ConnectZ
member can find). The SkillZ-only shell contains sign-in, a hub and the seven instrument
coaches — and nothing else: no profile, orientation, substance or attractiveness-rating
screens, no messaging, no feed, no purchases. That keeps the *screens* out of the two
policy risks `../data-safety.md` flags for the main app. The *account* is still the main
app's, so say so honestly on the form. Re-check if the shell ever grows more screens.

What SkillZ does that IntelligenceZ and BodieZ do not: **it records the member's voice (and
face, if they choose the camera), and sends the recording to a third-party AI.** That is
the part of this form that needs care, and it is why "shared" is answered **yes** below.

| Data | Collected | Purpose | Shared | Optional |
|---|---|---|---|---|
| Username, email address, password | yes | account | no | no — all three are required |
| Phone number | yes | account / sign-in | no | yes |
| Birthday | yes | account (works out a star sign and an age band; it gates nothing at sign-up) | no | yes |
| **Voice or sound recordings (Audio files):** the take the member records with the microphone or attaches, sent when they press *Send it to the coach*. **Not stored** after it is scored | yes — in transit to our server and on to the AI service, every time a take is sent | app function | **yes — Google (Gemini API)** | yes — a member can use the app without sending a take, and can attach a file instead of using the microphone |
| **Videos:** only if the member records on camera or attaches a video. Same handling as audio | yes — only then | app function | **yes — Google (Gemini API)** | yes |
| **Other user-generated content:** what the coach gave back for each take — the scores, what it heard, its verdict and advice — with the genre, difficulty, range/style picked and the date; the goal range, fatigue setting, tempo range and favourite rap styles the member sets. **Stored with the account** | yes | app function | **yes — the text of the scores and notes (never the audio), with a short summary of earlier scores, goes to Anthropic (Claude API)** | yes |
| **Other user-generated content:** the score page minted for each scored take (score, verdict, genre, username). Never shown or shared by this app; **opens for anyone who has its link** | yes | app function (the share link the main site offers) | no — but publicly reachable by link | n/a |
| Report this output: which score, the reason, an optional note | yes — only when the member files one | safety / moderation | no | yes |
| Random browser identifier + sign-up/sign-in step events (no name or email) | yes | analytics: where sign-up breaks | no | no |
| IP address — account-creation address kept for the life of the account; up to 12 recent sign-in addresses, older ones dropped after 180 days at the next sign-in | yes | fraud / duplicate-account detection | no | no |
| Ledger line per scored take (app and cost, never the recording) | yes | app function | no | no |
| Crash reports / diagnostics | **no** — no crash or analytics SDK is in the build | — | — | — |

- Encrypted in transit: yes (HTTPS).
- Users can request deletion: yes — in the app (scroll to the bottom of any screen →
  *Delete my account*) and on the web at `https://musicconnectz.net/delete-account.html`.
  Play asks for both. Deleting removes the rows (every score, the score pages, the progress
  and goals). There is no recording to remove: a take is never stored.
- Not sold. No ads: the shell loads no ad script and the main app's rewarded-ads plugin is
  not in a TWA. Answer **No** to "contains ads".
- Not collected by this build: location, contacts, still photos, financial info, messages,
  health records. (The microphone and camera are used only on a press; see below.)

## Microphone and camera

SkillZ is a Trusted Web Activity: the web app runs in Chrome, so **Chrome** asks the member
for the microphone (and the camera) the first time they press Record, and the app's own
manifest declares **no Android permissions** (`android/app/src/main/AndroidManifest.xml`).
That is the same mechanism Music ConnectZ's own recorder already uses. The form's data
types above (Audio files, Videos) are what to declare; there is no separate permission
declaration to make. Nothing records before a press: `BossTake.jsx` calls `getUserMedia`
only from the Record buttons, and the shell's `Screens` stops a recorder when the member
leaves that coach's screen (`mcz-shell-leave`).

## Why "shared: yes", and what that rests on

Play's form treats data sent to a *service provider that processes it on your behalf* as
not "shared", and treats data processed only ephemerally in memory as not "collected".
Whether Google and Anthropic fit that depends on which terms the API keys are under —
whether Gemini is on a paid tier or the free one (the free tier's terms allow Google to
use content to improve its products), and the Claude API under Anthropic's commercial
terms — and **nothing in this repo can tell**. The policy therefore says only "processed
under its own terms", and this form errs toward disclosing. If you confirm both keys are on
terms that make them processors, "shared" can honestly move to **no** (and the recordings'
"collected" to the ephemeral-processing answer), which is a one-line change to this file
and to the Console form. The other direction, after a reviewer finds it, is a rejection.

## Open items

- **A derived "strain" flag goes to Anthropic.** The coach's second pass is sent a short
  summary of earlier scores, which includes whether recent takes read as strain
  (`coach_think.history_for` → `takescorez.strain`, computed from the member's own weak
  breath/range scores). It is not a medical record and is not a diagnosis, but it is
  health-adjacent. My call: not declared as Health info; the policy says it is sent. If
  you would rather declare it, add *Health info* (optional, app function, shared with
  Anthropic).
- **A score page opens without signing in.** `ScoreShare` is minted for every scored take
  (`models.mint_score_share`) and served at `/api/economy/scores/<token>/` and the `/s/<token>`
  card with the member's username on it. This app never shows or sends the link, so a link
  exists only for somebody who took it from the main site; the policy says so. A
  member-controlled switch, or not minting one for takes scored here, is a backend change
  and was not made.
- **The age question is open.** Registration is optional on birthday and enforces no
  minimum age, while the policy says 13+. A recording of a young person's voice or face is
  more sensitive than typed text; decide the target-audience answer before submitting
  (`content-rating.md`).
- **Account export does not include SkillZ data.** If the form says members can export
  their data, that is not yet true for the score rows.
- **There is no per-take delete.** Scores can only be removed by deleting the account (the
  policy says so).
