# BodieZ on Google Play

BodieZ as its own listing: the **BodieZ-only web app** (`npm run build:bodiez`,
hosted on its own origin) in a Trusted Web Activity, package
`net.musicconnectz.bodiez`. Same accounts and data as Music ConnectZ; a second
front door, not a fork.

**Why its own site and not `/bodie` on musicconnectz.net:** the main site is
what makes Music ConnectZ a Data safety question (orientation, substance use,
attractiveness ratings — `../data-safety.md`) and a Play Billing question
(Premium). The BodieZ-only shell contains BodieZ, sign-in and sign-up, and
nothing else, so none of that comes with it.

```
play/bodiez/
├── README.md              ← you are here
├── listing/               ← title, short + full description, release notes (limits checked)
├── graphics/              ← icon-512.png, feature-graphic-1024x500.png
├── screenshots/           ← eight 1080×1920 phone screenshots, in story order
├── review-notes.md        ← paste into Play Console → App access
├── data-safety.md         ← the Data safety answers
└── twa-manifest.json      ← only for the Bubblewrap route; the CI route below needs none of it
```

The Android project lives in the **backend** repo (`android/`, flavor `bodiez`),
and builds in GitHub Actions — nothing to install.

## What is already done in the repo

- The BodieZ-only web build, its icons and manifest.
- The Android app: name, adaptive icon (the neon-athletes art from the BodieZ tab,
  not a redrawn mark), splash, and `net.musicconnectz.bodiez` as a Gradle flavor.
- Listing text, graphics and screenshots. The screenshots are the real app on a
  seeded account, taken in the BodieZ-only shell — what a reviewer will see.
- **In-app account deletion** (bottom of any screen → *Delete my account*) and the
  **web page** Play also wants: `public/delete-account.html`, served at
  `/delete-account.html` on both hosts. The BodieZ-only shell has no ProfileZ, so
  without the in-app control the listing would have offered sign-up and no way out.
  Deleting an account removes the stored files as well as the rows (it did not
  before 9 October 2026: the bytes stayed on disk, which made "your uploads are
  deleted" untrue).
- **The privacy policy names BodieZ and its health information** (`public/privacy.html`,
  updated 9 October 2026). Each statement in it about BodieZ was checked against
  the code first; the corrections that check forced are in the commit message.
- The signup screen no longer sells the music platform inside a fitness app: no
  "get paid for it", no 🍥 welcome line, no Free/Premium ladder, no singing-habit
  onboarding after you register (build-time flag `VITE_STANDALONE`; the main
  site is unchanged).

## What is yours to do (none of it can be done from the repo)

1. **Play developer account** — https://play.google.com/console/signup · $25 once.
   Personal accounts made after 13 Nov 2023 must run a **closed test with 12
   testers for 14 days** before applying for production. Check whether the
   Console asks again for this second app; plan for it if it does.
2. **Host the BodieZ web app on its own origin** — `bodiez.musicconnectz.net`.
   My pick is **Cloudflare Pages** (free): connect this repo, build command
   `npm run build:bodiez`, output folder `dist-bodiez`, custom domain
   `bodiez.musicconnectz.net`. Not a second Vercel project: `vercel.json` sits at
   the repo root and applies to every Vercel project on it, so the second one would
   build the main site. Hash routing means no rewrite rules are needed. The API's
   CORS already allows any `*.musicconnectz.net`. Open
   `https://bodiez.musicconnectz.net/` on a phone and sign in before going further.
3. **Build the bundle** — backend repo → Actions → **Android APK** → Run workflow →
   download `bodiez-playstore-bundle` (the `.aab`). To try it on your own phone
   first, `bodiez-apk`. If the host is not `bodiez.musicconnectz.net`, set the
   workflow's `bodiez_url` input and change the host in
   `android/app/src/bodiez/res/values/strings.xml` to match (the build fails
   loudly if the two disagree).
4. **Create the app in Play Console** — name `BodieZ`, package
   `net.musicconnectz.bodiez` (it cannot be changed later), upload the `.aab` to
   **Internal testing** first.
5. **Digital Asset Links, or the app opens with a URL bar.** Console → Setup →
   App signing → copy the *app signing key certificate* SHA-256 (and your upload
   key's) into `standalone/bodiez/public/.well-known/assetlinks.json` in this
   repo, replacing both `REPLACE_WITH_…` lines. Merge, let the host redeploy, then
   `curl -s https://bodiez.musicconnectz.net/.well-known/assetlinks.json`. This file is
   for **this host only**; the main site's file is a different one for a different app.
6. **Fill the listing** from `listing/`, `graphics/`, `screenshots/`.
7. **Forms** — Data safety (`data-safety.md`), content rating (IARC: no
   user-to-user content is reachable in this app; no purchases; no ads),
   target audience 13+ (not Families), **Health apps declaration**, privacy
   policy URL `https://musicconnectz.net/privacy.html`, account-deletion URL
   `https://musicconnectz.net/delete-account.html`, and the credentials in
   `review-notes.md` (a real account with a few sessions logged).
8. **One person, one account:** the review account is a real account on
   production. Make it yours, not a duplicate of anything.

## Before you market it as an adaptive / disability product

The listing text says only what the app does today, with the real numbers.
Measured against the library as it is now (186 exercises):

| Member says | Exercises left |
|---|---|
| seated or lying only | 102 |
| cannot use legs | 74 |
| cannot use arms | 45 |
| one arm only | 107 |
| one leg only | 107 |
| cannot use arms or legs | 5 |

A good start for **wheelchair users and people who train seated**; thin for
**limited use of arms**, and close to nothing with neither arms nor legs. A
disability-first headline raises the bar: reviews from the people it is for will
be about exactly these numbers. The honest order is to widen the library for the
arms-limited and one-sided cases, and film demos for the 53 exercises with none
(37 have one), *before* the listing leans harder on it. The filter has five
questions, not a person's actual range of movement, so the copy never says
"tailored to your disability". **These numbers are in `full-description.txt`;
re-count them before every release**: in the backend repo,
`python manage.py shell < tools/count_adaptive_exercises.py`.

Wording: lead with **adaptive / accessible workouts** rather than "disabled
exercises". It is what people searching for this use, it reads as for-the-person
rather than about-the-impairment, and "disabled exercises" also reads as
"exercises that are switched off".

## Play policy points that apply to this listing specifically

- **No medical claims.** "Rehab", "therapy", "treat", "heal", "improve your
  condition" all invite a Health Apps review. This is a workout logger with a
  filter; the copy says so, and tells people to ask a clinician.
- **Health apps declaration.** Fitness and health apps must complete it. Declare
  activity and fitness; the recovery check-in is self-reported sleep quality and
  fatigue, so read the Console's categories for it rather than assuming.
- **Accessibility of the app itself.** An adaptive-fitness app that fails
  TalkBack, tap-target size or contrast will be reviewed accordingly.
  `../../standalone/bodiez/ACCESSIBILITY.md` has the automated check (run it
  before every submission) and the TalkBack walk-through, which **has NOT been
  done on a real phone yet**. It is the biggest honest gap in this kit.
- **Data safety** (`data-safety.md`): what a member says they can and cannot do
  is health information.
- **Payments:** nothing in this build sells anything, which is why the signup
  ladder was taken off it. If a purchase is ever added here it needs Play Billing.
- **Two apps, one site's worth of code.** Play's repetitive-content rule is
  about two apps with the same experience. These two differ in purpose, name,
  icon and what is inside them, but a reviewer who opens both will see the same
  BodieZ. The listing says plainly that it is one account for both. If a reviewer
  pushes back, the answer is the shell: BodieZ only, no music platform.

## Still yours to decide (found while checking the privacy policy; none is fixed by this kit)

- **Stripe still holds the customer and the saved card.** Deleting an account now
  cancels its subscriptions first (and refuses the delete if Stripe can't cancel them),
  but it does not delete the Stripe *customer*, so the card on file stays under
  Stripe's own retention. Deleting the customer would be the complete version of
  "delete my data"; it is a separate call with its own side effects on refunds and
  disputes for past charges, so it was not made for you.
- **Run the backfill once, with the live Stripe key, after the backend deploys.**
  `python manage.py backfill_stripe_subscriptions` (dry by default) reads Stripe's own
  Checkout Sessions, writes the ledger rows for subscriptions the membership row forgot
  (Premium bought before a StatZ upgrade is the case), and lists live subscriptions
  whose account was already deleted. `--write --cancel-orphans` ends those. It was
  built and tested against a fake and has never run against Stripe, so read the dry
  output before the second command; cancelling is immediate and refunds nothing.
- **DupeZ's self-serve close can be pointed at somebody else's account.** It trusts the
  same address on two linked sign-ins as proof, and the link flow does not record
  whether the provider verified that address. Reproduced with rows made the way the
  link view makes them; whether any provider lets somebody set an unverified address
  was not checked. Found by review, pre-existing, and not changed here.
- **`AutoTopUpCancelView` still lies when Stripe fails.** It flips the row to inactive
  even if its Stripe call errored ("already gone / network — flip local state
  regardless"), so a member can believe an auto top-up is off while it still bills.
  Account deletion no longer trusts that flag; the cancel button itself still does.
- **Transaction records.** The old policy promised "limited records (for example,
  transaction records)" are kept after deletion. The code keeps none: every money
  table cascades with the member. The policy now says what the code does. If the LLC
  needs to retain financial records for tax, that is a code change (anonymise rather
  than cascade), and the policy changes with it.
- **Name the BodieZ host in `privacy.html`'s Hosting line** once it exists. It says
  "BodieZ's website is served from its own web host" because the host is not chosen.
- **`public/terms.html` is stale in the same ways the policy was** (scope sentence
  names only the website and the Android app, "delete it in ProfileZ", AdMob, a
  16 August date) and is served on the BodieZ host too.
- **13+ is a rule, not a check.** Birthday is optional and no minimum age is enforced.
- **Account export omits BodieZ data**, so "you can export your data" is not true for it.
- **`support@musicconnectz.net` has to be read by somebody.** The delete page and the
  policy both promise a person behind it.
- **The main app's logged-out `/login` offers a sideload APK** — a separate risk for the
  *Music ConnectZ* listing, not this one.
