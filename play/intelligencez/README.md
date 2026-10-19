# IntelligenceZ on Google Play

IntelligenceZ as its own listing: the **IntelligenceZ-only web app**
(`npm run build:intelligencez`, hosted on its own origin) in a Trusted Web Activity,
package `net.musicconnectz.intelligencez`. Same accounts and data as Music ConnectZ;
a second front door, not a fork. Sign-in, a hub, and the four IntelligenceZ screens
that can stand on their own:

| Tab | Screen | What it is |
|---|---|---|
| Home | `src/apps/IntelligenceZ.jsx` | every app, whether it is switched on, what a run costs *before* it is opened, and the newest pieces across all of them |
| Write | Sentence ConnectZ | resumes, cover letters, lyrics, poems, bios, captions, posts, essays (Gemini) |
| Chat | OCC's chat | chat with Claude, engine and price chosen up front (Anthropic) |
| Compose | Instrumental ConnectZ | AI-composed MIDI loops (Gemini) |
| Master | Mix ConnectZ | mastering on the device: measured loudness, true peak, tone, EQ, glue compression, limiter, dither, WAV. Free, no model, nothing leaves the device unless Save is pressed |

**Not in it, and the listing must not present as features:** Video ConnectZ (a fixed
price, no free tier — Play's billing rules do not allow an app that is not using Play
Billing to sell, so the app cannot sell it), FaceZ (it exists to feed Video, and needs
the 18+ rate-faces feed), and Image ConnectZ (not built). The hub lists only what the
shell contains (`in_app` from `GET /api/economy/intelligencez/`).

```
play/intelligencez/
├── README.md              ← you are here
├── listing/               ← title, short + full description, release notes (limits checked)
├── graphics/              ← icon-512.png, feature-graphic-1024x500.png
├── screenshots/           ← 1080×1920 phone screenshots, in story order
├── review-notes.md        ← paste into Play Console → App access
├── data-safety.md         ← the Data safety answers (and the reasoning behind "shared")
├── content-rating.md      ← the IARC answers and the AI-content policy notes
├── recount-numbers.py     ← recounts every number the listing quotes, from the code
└── twa-manifest.json      ← only for the Bubblewrap route; the CI route below needs none of it
```

The Android project lives in the **backend** repo (`android/`, flavor `intelligencez`)
and builds in GitHub Actions — nothing to install.

## What is already done in the repo

- The IntelligenceZ-only web build (`standalone/intelligencez/`, `vite.intelligencez.config.js`,
  `tools/finish-intelligencez.mjs`), its icons, manifest and an `assetlinks.json` with
  placeholders. Hash routing, so any static host works.
- **The shell** (`standalone/intelligencez/Shell.jsx`): sign-in / sign-up / forgot, a tab
  bar (Home · Write · Chat · Compose · Master), every screen kept alive when you leave it
  (a half-written brief or a finished master is not thrown away by checking Chat), and a
  listener for the same `mcz-goto-tab` event the main site answers, so a screen's door to
  another one (`goToSpot("occ", …)`) switches tabs and lands on the control.
- **The hub** (`src/apps/IntelligenceZ.jsx`), also mounted on the main site as the
  `intelligencez` tab. It reads the price of every app from the server, in the house
  cost format, before the Open button; it types no number. If the server cannot be
  reached it lists the apps from a local keys-and-labels list and says it cannot show
  prices — never an invented one.
- **In-app account deletion** (bottom of any screen → *Delete my account*), listing what
  goes before the button — pieces, loops, kept replies, saved masters with their audio —
  and `public/delete-account.html` for the web page Play also wants.
- **The privacy policy names IntelligenceZ** and what it sends where
  (`public/privacy.html`, updated 12 October 2026). Every sentence about IntelligenceZ was
  checked against the code first; the table is below.
- The signup screen says "One account for IntelligenceZ and Music ConnectZ" (it said
  BodieZ in every shell), offers no OAuth buttons, no Free/Premium ladder, no 🍥 welcome
  line and no music-habit onboarding (`VITE_STANDALONE`).
- The Android flavor: name, adaptive icon (the IntelligenceZ sign — your supplied art,
  not a redrawn mark), splash, `net.musicconnectz.intelligencez`, a `intelligencez_url`
  workflow input, and tests that hold the three apps apart (`test_android_kit`).
- Listing text in your voice, graphics, and screenshots (see below).

## What is yours to do (none of it can be done from the repo)

1. **Play developer account** — https://play.google.com/console/signup · $25 once.
   Personal accounts made after 13 Nov 2023 must run a **closed test with 12 testers for
   14 days** before applying for production. Check whether the Console asks again for a
   third app; plan for it if it does.
2. **Host the IntelligenceZ web app on its own origin** — `intelligencez.musicconnectz.net`.
   My pick is **Cloudflare Pages** (free): connect this repo, build command
   `npm run build:intelligencez`, output folder `dist-intelligencez`, custom domain
   `intelligencez.musicconnectz.net`. Not a Vercel project: `vercel.json` sits at the repo
   root and applies to every Vercel project on it, so it would build the main site.
   Hash routing means no rewrite rules are needed. **CORS:** the API already allows any
   `*.musicconnectz.net` (`CORS_ALLOWED_ORIGIN_REGEXES` in the backend's `settings.py`),
   and sign-in is Bearer tokens, so `CSRF_TRUSTED_ORIGINS` is not involved. Open
   `https://intelligencez.musicconnectz.net/` on a phone and sign in before going further.
3. **Make sure both AI keys are set on the production API** — `GEMINI_API_KEY` (Write,
   Compose) and `ANTHROPIC_API_KEY` (Chat). Without them the screens honestly say
   "isn't switched on yet", and that is what a Play reviewer would see. The hub shows the
   same state per app.
4. **Build the bundle** — backend repo → Actions → **Android APK** → Run workflow →
   download `intelligencez-playstore-bundle` (the `.aab`). To try it on your own phone
   first, `intelligencez-apk`. If the host is not `intelligencez.musicconnectz.net`, set the
   workflow's `intelligencez_url` input and change the host in
   `android/app/src/intelligencez/res/values/strings.xml` to match (the build fails loudly
   if the two disagree).
5. **Create the app in Play Console** — name `IntelligenceZ`, package
   `net.musicconnectz.intelligencez` (it cannot be changed later), upload the `.aab` to
   **Internal testing** first.
6. **Digital Asset Links, or the app opens with a URL bar.** Console → Setup → App signing →
   copy the *app signing key certificate* SHA-256 (and your upload key's) into
   `standalone/intelligencez/public/.well-known/assetlinks.json` in this repo, replacing both
   `REPLACE_WITH_…` lines. Merge, let the host redeploy, then
   `curl -s https://intelligencez.musicconnectz.net/.well-known/assetlinks.json`. This file is
   for **this host only**; the main site's and BodieZ's are different files for different
   apps. (`npm run build:intelligencez` refuses to finish if the overlay's file does not
   name this package.)
7. **Fill the listing** from `listing/`, `graphics/`, `screenshots/`.
8. **Forms** — Data safety (`data-safety.md`), content rating (`content-rating.md`),
   target audience (decision below), privacy policy URL
   `https://musicconnectz.net/privacy.html`, account-deletion URL
   `https://musicconnectz.net/delete-account.html`, and the credentials in
   `review-notes.md` (a real account on production).
9. **One person, one account:** the review account is a real account on production. Make
   it yours, not a duplicate of anything.

## Numbers the listing quotes, and what recounts them

A number in a store listing is a tier number in copy. These are quoted, each read from
the code that owns it, and `recount-numbers.py` fails when one of them moves:

| Quoted | Where it comes from |
|---|---|
| 3 free prompts a day | `PROMPT_ALLOWANCE["free"]`, `apps/economy/models.py` |
| 3,000 characters (the Write brief) | `WRITER_BRIEF_CHARS["free"]`, `catalog.py` |
| 500 MB of storage | `TIER_LIMITS["free"]["storage_mb"]`, `catalog.py` |
| four or eight bars; up to six instruments | `BARS`, `MAX_TRACKS`, `instrumentalz.py` |
| up to 15 minutes of audio | `MAX_SECONDS`, `src/mastering/client.js` |
| eight kinds of writing | `sentencez.KINDS` without the persona-gated agreements |

```bash
cd $MCZ_BACKEND && python manage.py shell < /path/to/play/intelligencez/recount-numbers.py
```

Run it before every release. Not quoted on purpose: the price of any Chat engine (it is
served and shown beside Send), the Premium and StatZ rows of every ladder (nothing in
this app sells them), and the mastering ladder (Free gets Low and Medium intensity and
automatic glue compression up to 2 dB; Premium and StatZ reach further — the shell shows
only what the member's plan includes, and no locked door).

## The screenshots, and what is real in them

Taken in the **shell build** (`npm run dev:intelligencez`, port 5177, proxied to a local
API) on a 360×640 touch screen at 3x — 1080×1920, a phone — on a seeded account.
**What is seeded, and why:** this box and CI have no Gemini or Anthropic key, so
AI-written text cannot be generated live. The resume, poem and bio, the lo-fi loop and
the kept Chat reply were written by hand, as fictional people, and inserted as the
member's own rows (`standalone/intelligencez/seed_screenshots.py`) — the same rows the
real endpoints write. The screens, prices, allowance, buttons and disclosures are the real
app talking to the real API; only the AI's output is seeded. The API ran with placeholder
keys so the screens show their ready state; nothing in a screenshot was generated by a
model. **Mix ConnectZ is not seeded:** it runs on the device, and its screenshots are a
real run — a synthesized 40-second stereo song with a deliberate low-mid bump
(`standalone/intelligencez/make_demo_song.py`, measured at -22.0 LUFS by an independent
BS.1770 meter in the script and by the engine itself), loaded through the real file input
and mastered in headless Chromium. The listing claims nothing the screenshots do not show.

### The files

Upload `01`–`08` in that order (Play takes eight); `09`–`12` are spares and reference.
`01` is the one to drop if you want the Master set whole — a reviewer signs in anyway.

| File | Shows |
|---|---|
| `01-sign-in.png` | the shell signed out: the IntelligenceZ icon, sign-in, "Create an account" |
| `02-home.png` | the hub: the day's allowance (2 of 3 left), then each app with its state, your piece count and the price before Open |
| `03-write-resume.png` | Write → Resume: the eight kinds, the voice note, a brief typed in, the count against 3,000, and the price beside Write it |
| `04-written-piece.png` | a seeded resume open: "Written by AI. Check it before you use it", the fill-the-blanks note, the editable text, Copy, Save as text, *Report this output* |
| `05-chat.png` | Chat: the four engines with their prices, the voice, a message typed, and the price under Send |
| `06-compose-loop.png` | a seeded lo-fi loop: its parts, Preview and Download .mid, and "Composed by AI" |
| `07-master-measured.png` | Master, a real run: the song measured — -22.0 LUFS, -8.0 dBTP, 1.3 LU, 14.0 dB, 0.73 — each with what it means |
| `08-master-result.png` | the result: peak-to-loudness and stereo correlation before → after, the tonal-balance chart (grey before, cyan after), and the start of "What the master did, and why" |
| `09-master-before-after.png` *(spare)* | the A/B player (Your mix / Master, level-matched) and every number before → after: -22.0 → -14.1 LUFS, -8.0 → -1.0 dBTP |
| `10-master-why.png` *(spare)* | every move the master made, each beside the measurement that caused it |
| `11-master-export.png` *(spare)* | 24- or 16-bit WAV, Download, Save to Your masters, and what saving would use of the storage |
| `12-what-leaves-your-device.png` *(spare)* | the hub's panel on where text and files go |

## Before you market it, and Play policy points that apply here

- **The icon is your sign, and the sign shows more than the app does.** It has panels
  labelled IMAGE / PHOTO, VIDEO / CLIP, MEDIA FILES and 3D / VISUALS, and a tagline "AI
  MEDIA CREATION". As an icon it is yours to use and I used it as supplied. The **feature
  graphic does not reuse the sign**: it is the brain alone, with the four things the app
  actually does beside it, because a graphic that shows a video panel promises one. If a
  reviewer compares the icon with the app, the answer is the listing, which says plainly
  that there is no image or video generation.
- **Mix ConnectZ's own art says "AI Generated Song Master"; the mastering is not a model.**
  The listing and the in-app screen say it is measured signal processing, and that is true
  of the code (`src/mastering/` has no model and makes no network call). The tile art is
  Music ConnectZ's and was not changed here.
- **AI-generated content policy.** Play requires in-app flagging of AI output and a clear
  account of what the AI does. Write and Chat have *Report this output*; the hub's *What
  leaves your device* panel and `privacy.html` say where text goes. The Console's own
  questions about generative AI are yours to answer from `content-rating.md`.
- **Payments.** Nothing in this build sells anything, which is why the shell offers no
  upgrade link and no PromptZ top-up. One loose end: Chat still lists the engines a plan
  does not include, with the plan named ("Needs premium") and no link — it shows in
  `screenshots/05-chat.png`. Mix ConnectZ hides its locked options
  instead, which is the cleaner rule; Chat is another agent's screen and was left as it
  was built. If a purchase is ever added here it needs Play Billing.
- **Two apps, one site's worth of code.** Play's repetitive-content rule is about apps with
  the same experience. IntelligenceZ differs in purpose, name, icon and contents from Music
  ConnectZ, BodieZ and Sentence ConnectZ, but a reviewer who opens Sentence ConnectZ's app
  and this one will see the same Write screen. The listing says plainly that it is one
  account. If a reviewer pushes back, the answer is that Write is one of four tools here and
  the app is the hub, Chat, Compose and a mastering engine around it.

## Privacy claims, each one checked against the code (12 October 2026)

| Claim in `privacy.html` / the hub | What backs it |
|---|---|
| Write sends the brief to Gemini, with our instructions and without name, username or email | `sentencez.py`: `prompt_for(kind, topic, genre, …)` is the whole request body; no user field is read |
| Compose sends genre, instruments, tempo, key, length and the note to Gemini | `instrumentalz.py` `prompt_for(genre, instruments, bpm, key, bars, brief)` |
| Chat sends the message and recent turns to Claude, no identity | `occ.py` `OccChatView`: `system` is `voice_prompt` (style prefs and our rules, no user field) plus courses; `messages` are `history[-N:]` and the prompt. `OccChat.jsx` sends `{prompt, history, model?}` only |
| We do not store the conversation | the chat endpoint writes an `OccOutput` only when `save_work` is sent; `OccChat.jsx` never sends it, and keeps the conversation in React state |
| A reply is stored on Save to WorkZ, and on Report | `OccChat.jsx`: `ensureSaved()` POSTs to `occ/workz/` for both, and the Report control says so before it is pressed |
| Stored: Write pieces and inputs; Compose loops; most recent twenty listed | `SentenceWork`, `InstrumentalWork`; `[:20]` in both views |
| Every AI run adds a ledger line naming the app and cost, never the text | `charge_ai_usage` writes `Transaction(note=…)`, and every caller's note is app + kind / key and BPM / engine |
| Mastering uses no model, no server, and the song is not uploaded | `src/mastering/` has no `fetch`, XHR or worker import beyond its own; `MixConnectZ.jsx` calls the API only for the ladder, the list, Save and Delete (and fetches a track another app hands it, which this shell has no door for) |
| Save uploads the WAV and a record of title, settings, before/after measurements | `MixConnectZ.save()`: `POST uploads/` then `POST mixz/`; `mixz.clean_settings` and `clean_measures` keep only those fields |
| A reference track and the original are never uploaded | `clean_settings` keeps `reference` as a boolean; the client never sends `source_upload_id` |
| A saved master's link opens without signing in | `media.py` `MediaFileView`: `AllowAny`, `authentication_classes = []` |
| Deleting a saved master deletes its file; deleting the account removes the rows and the files | `mixz.MixDetailView.delete` (`up.file.delete`); `accounts/erasure.py` finds every `FileField` on a cascading row, and `MasterWork`, `SentenceWork`, `InstrumentalWork`, `OccOutput` all cascade from the user |
| Sentence pieces and Compose loops can only be removed by deleting the account | no DELETE route exists for either (`urls.py`) |
| A reply kept from OCC can be deleted from WorkZ | `OccWorkDetailView.delete` |
| The export does not include IntelligenceZ data | `account.py` `AccountExportView` lists neither |
| No ads, no OAuth, nothing to buy | the shell mounts no ad code; `OAuthButtons` renders null under `VITE_STANDALONE`; the screens hide membership doors under `IN_SHELL` (Write, Compose and Master; Chat as noted above) |
| Post-to-PostZ is not in the app | `OCC.jsx` renders the Post control and its counts only under `!IN_SHELL`; the WorkZ row keeps Delete |

**Verified by running it, not only by reading it** (headless Chromium on the shell build,
a local API, the synthesized song): the network log for loading a song, measuring it and
mastering it is **empty** — no request of any kind; after Save it is exactly
`POST uploads/`, `POST mixz/` and a list refresh; the saved master's link answers a
request carrying no token with a `302` to the file; and Delete removes the file from
disk as well as the row.

**BLOCKING, and not fixed here because the file is another agent's:** the Chat tab's
WorkZ composer (`src/apps/OCC.jsx`, the `<MediaFields … label="Attachment" />` line in the
WorkZ card) renders **in the shell**, so a member can press Record (microphone), or attach
audio, video or an image to a kept reply, and those files are uploaded. Everything in
`review-notes.md`, `data-safety.md` and the policy that says this app has no microphone,
camera, photo or video use is written for the shell WITHOUT that control. Either hide it
under `IN_SHELL` (`{!IN_SHELL && <MediaFields … />}` — my recommendation: a shell whose
WorkZ keeps chat replies has no use for a recorder) or change those three files to declare
microphone, photos and video and the Camera/Microphone answers in the Console. Do not
ship the shell with the control and the current text.

## Still yours to decide (found while checking the policy; none is fixed by this kit)

- **A saved master's link is open.** See `data-safety.md`. Private audio needs signed links.
- **Gemini's tier and Anthropic's terms decide whether "shared: yes" is right.** See
  `data-safety.md`.
- **Target audience 13+ with AI chat.** See `content-rating.md`.
- **Stripe still holds the customer and the saved card**, and every other open item in
  `../bodiez/README.md` that is about the shared account (the DupeZ proof, the
  auto-top-up cancel, transaction records, `support@musicconnectz.net` being read by a person).
  They apply here unchanged.
- **Name the IntelligenceZ host in `privacy.html`'s hosting line** once it exists. It says
  the websites "are served from their own web hosts" because the host is not chosen.
- **`public/terms.html` is stale** in the ways `../bodiez/README.md` lists, and is served on
  this host too.
- **The TalkBack walk-through has not been done** on a real phone for this app either.
  `standalone/bodiez/ACCESSIBILITY.md` has the method; the `.sa` touch-target and contrast
  rules are applied to this shell, but nobody has run it with a screen reader.
