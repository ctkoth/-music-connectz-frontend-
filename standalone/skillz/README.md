# SkillZ, as its own app

Sign-in, the SkillZ hub, and the seven instrument coaches, on their own host. Same account,
same API, same rows as Music ConnectZ — a take scored here is in the member's history there.

```
npm run dev:skillz      # :5178 — pair with MCZ_API=http://localhost:8000 VITE_API_BASE=http://localhost:5178
npm run build:skillz    # → dist-skillz/ (static; HashRouter, so any static host works)
```

| Tab | Route | Screen |
|---|---|---|
| Home | `#/` | `src/apps/SkillZ.jsx` — the hub, from `GET /api/economy/skillz/` |
| SingZ, RapZ, GuitarZ, BassZ, KeyZ, ViolinZ, DrumZ | `#/singz` … | `InstrumentZ.jsx` — the same screen and props the main site mounts (`coaches.js` is the list; `src/skillz.test.mjs` holds it to `App.jsx`) |

Not here: DJ, producer, A&R, illustrator, videographer. They are on the icon; none has a coach, a
scored take or a route. The hub says "Not built yet" in words and renders no control for them.

## What differs from the main site (`VITE_STANDALONE="skillz"`, `src/standalone.js`)

- **No door to a screen the shell lacks** (`shellHas`): no upgrade, share, post-to-PostZ, coach voice,
  gear advice (store links) or member profile links in the coach screens. Edits are in `BossTake.jsx`,
  `ProgressPanel.jsx`, `SkillZPanel.jsx`, `InstrumentZ.jsx` (the "Teen-safe" pill is not claimed here).
- **Nothing to buy.** Out of free prompts the coach says they renew tomorrow.
- **Report this output** under every score (`components/ReportTake.jsx`, `take:<coach>:<id>`) and an AI
  line on every screen (`coaches.js`). The hub has *What leaves your device*.
- **Recorders stop when you leave their screen** (`mcz-shell-leave`): BossTake's mic/camera, DrumZ's pad.
- **Delete my account** is in the app (`DeleteAccount.jsx`).
- **The skill tree is hidden while empty.** `seed_skillz` seeds mimez, directz and lessonz only; no
  instrument has a drill or badge, and nothing deploys the seed. `SkillZPanel` draws nothing in a shell
  until the server has drills; "Drill it" is hidden too. Seeding them is a content decision.

## Hosting, icons, screenshots

Static files; `skillz.musicconnectz.net` (Cloudflare Pages: build `npm run build:skillz`, output
`dist-skillz`). Do not add a `_headers` with `Permissions-Policy: microphone=()` — the recorder needs it.
`python standalone/skillz/make_icons.py` makes the web icons; the backend's
`android/tools/make_skillz_assets.py` makes the Android art from the same source.
`seed_screenshots.py` + `take_screenshots.mjs` make `play/skillz/screenshots/` (see `play/skillz/README.md`).
`dist-skillz` carries every main-site chunk (App.jsx is imported for `IconImg`); none is reachable.
