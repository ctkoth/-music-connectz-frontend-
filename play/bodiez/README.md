# BodieZ on Google Play

BodieZ as its own listing: the **standalone web app** (`npm run build:bodiez`,
hosted on its own origin) in a Trusted Web Activity, exactly the way
`play/README.md` ships Music ConnectZ — new package id, new host, own keystore.
Same accounts and data as Music ConnectZ; a second front door, not a fork.

## What is yours to do (none of it can be done from the repo)

1. **Host `dist-bodiez/`** on its own origin (e.g. `bodiez.musicconnectz.net` —
   the API's CORS already allows any `*.musicconnectz.net`; any other domain
   needs adding to `CORS_ALLOWED_ORIGINS` on the backend first).
   `npm run build:bodiez`, then publish the folder as a static site. Hash
   routing means it needs no rewrite rules.
2. Put the host into `twa-manifest.json` (every `REPLACE_WITH_BODIEZ_HOST`).
3. Build with Bubblewrap as in `../README.md`. **Make a NEW keystore** — it
   must not be the Music ConnectZ one — and back it up.
4. Publish `/.well-known/assetlinks.json` on that host with the new package id
   and the keystore's SHA-256 (template: `../assetlinks.template.json`).
   Without it the app opens with a browser address bar.
5. Play Console: new app, $25 account already covers it. Then listing,
   Data safety, content rating, privacy policy URL, and the **account-deletion
   URL** (Play requires one for any app with sign-up; the in-app route is
   Settings → delete account, but Play also wants a web page that explains it).

## Before you market it as an adaptive / disability product

The listing text in `listing/` says only what the app does today. Measured
against the real library (71 exercises) the filter leaves:

| Member says | Exercises left |
|---|---|
| seated or lying only | 47 |
| cannot use legs | 39 |
| cannot use arms | 10 |
| cannot use arms or legs | 1 |

That is a good start for **wheelchair users and people who train seated**, and
thin for **limited use of arms**. A headline of disability-first positioning
raises the bar: reviews from the people it is for will be about exactly these
numbers. The honest order is to widen the library for the arms-limited and
one-sided cases (and film demos for the 34 exercises with none) *before* the
listing leans on it — and the filter has three questions, not a person's
actual range of movement, so the copy never says "tailored to your disability".

Wording: lead with **adaptive / accessible workouts** rather than "disabled
exercises". It is what people searching for this actually use, it reads as
for-the-person rather than about-the-impairment, and "disabled exercises"
also reads as "exercises that are switched off".

## Play policy points that apply to this listing specifically

- **No medical claims.** "Rehab", "therapy", "treat", "heal", "improve your
  condition" all invite a Health Apps review. This is a workout logger with a
  filter; the copy says so. Add a line to consult a clinician.
- **Health apps declaration.** Fitness and health apps must complete it.
- **Accessibility of the app itself.** An adaptive-fitness app that fails
  TalkBack, tap-target size or contrast will be reviewed accordingly. Run
  TalkBack through Today → log a set, and fix what it cannot reach, before
  submitting. This has NOT been audited yet.
- **Data safety** (`data-safety.md`): what a member says they can and cannot
  do is health information.
