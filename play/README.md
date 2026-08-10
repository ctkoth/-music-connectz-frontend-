# Google Play release kit — Music ConnectZ

Everything needed to ship the existing web app to Google Play as a **TWA**
(Trusted Web Activity): the app you already deploy, in a Play-installable
wrapper, loading `https://musicconnectz.net` with no browser chrome.

TWA rather than a rewrite because the PWA is already there — `manifest.webmanifest`,
the icon set, and a `standalone` display mode. A Capacitor or native port would
mean a second codebase to keep in step with the first.

```
play/
├── README.md              ← you are here: the build, start to finish
├── twa-manifest.json      ← Bubblewrap config, filled in
├── assetlinks.template.json
├── listing/
│   ├── title.txt          ← 30 chars max
│   ├── short-description.txt   ← 80 chars max
│   └── full-description.txt    ← 4000 chars max
├── data-safety.md         ← every answer to the Data safety form
├── content-rating.md      ← every answer to the IARC questionnaire
└── checklist.md           ← what to have done before you press Submit
```

## ⚠️ Read `data-safety.md` before you build anything

Two things in this app are **policy risks that can get a listing rejected or
pulled**, and both need a decision from you rather than a config value:

1. **The app collects sexual orientation** (`attracted_to`, `asexual` on the
   profile) and **substance use** (`substances`). Both are sensitive categories
   under Play's User Data policy.
2. **The app has a teen-safe mode _and_ attractiveness ratings.** If under-18s
   can reach a screen where people are rated on looks, or where orientation is
   collected, that is a Families policy problem, not a disclosure problem.

`data-safety.md` sets out the options. Do not submit until you've picked one.

## Prerequisites

```sh
npm install -g @bubblewrap/cli    # needs JDK 17+ and Android SDK; Bubblewrap offers to fetch both
```

## 1 — Build the Android project

```sh
cd play
bubblewrap init --manifest https://musicconnectz.net/manifest.webmanifest
# When it asks, take the answers from twa-manifest.json in this folder.
# Or skip the questions entirely:
cp twa-manifest.json ~/.bubblewrap-project/ && bubblewrap build
```

Bubblewrap generates a signing key on first build. **Back that keystore up
somewhere you will still have it in five years** — losing it means you can never
update the listing again, only publish a new one under a new package name.

## 2 — Wire up Digital Asset Links (the step everyone misses)

Without this the app opens with a browser address bar across the top, which
looks broken and fails review.

```sh
bubblewrap fingerprint list        # prints the SHA-256 of your signing key
```

Put that fingerprint into `assetlinks.template.json`, rename it
`assetlinks.json`, and serve it at exactly:

```
https://musicconnectz.net/.well-known/assetlinks.json
```

On Vercel / Cloudflare Pages, `public/.well-known/assetlinks.json` in this repo
deploys straight to that path. Verify with:

```sh
curl -s https://musicconnectz.net/.well-known/assetlinks.json
```

**Also add Play's own key.** Once the app is uploaded, Play App Signing re-signs
it with a key Google holds, and its fingerprint is different from yours. Copy it
from Play Console → Setup → App integrity → App signing key certificate, and add
it as a **second entry** in the same file. Both must be present or the address
bar comes back after the first Play-signed release.

## 3 — Build the release bundle

```sh
bubblewrap build              # produces app-release-bundle.aab
```

Upload the `.aab` to Play Console → Production (or Internal testing first —
recommended, it lets you install on your own phone and see the asset-links
result before anyone else does).

## 4 — Fill in the listing

Copy the text from `listing/`. Graphics you still need to make:

| Asset | Size | Notes |
|---|---|---|
| App icon | 512 × 512 PNG | `public/icons/app/icon-512.png` — already exists |
| Feature graphic | 1024 × 500 PNG | **Not made yet.** Shows at the top of the listing. No transparency. |
| Phone screenshots | ≥ 2, up to 8 | 16:9 or 9:16, min 320px on the short edge |
| Tablet screenshots | optional | Fills out the listing, not required |

Screenshots worth taking, in order — they read as a story: the feed, a Boss
Take mid-score, CollabZ escrow, OCC chat, BadgeZ.

## 5 — The forms

- **Data safety** → `data-safety.md`, answer for answer.
- **Content rating** → `content-rating.md`.
- **Privacy policy URL** → `https://musicconnectz.net/privacy.html` (already live).
- **Account deletion URL** → required for any app with accounts. The API has
  `POST /api/economy/account/delete/`, but Play needs a **web page a
  non-installer can reach**. See `checklist.md`.

## 6 — Before you press Submit

`checklist.md`.
