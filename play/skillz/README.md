# SkillZ on Google Play

The SkillZ-only web app (`npm run build:skillz`) in a Trusted Web Activity, package
`net.musicconnectz.skillz`, flavor `skillz` in the backend's `android/`. Hub plus seven coaches.
Files: `listing/`, `graphics/`, `screenshots/` (1080x1920, `01`–`08` are the set, `09`–`13` spares),
`review-notes.md`, `data-safety.md`, `content-rating.md`, `recount-numbers.py`, `twa-manifest.json`.
The privacy policy and delete-account page were updated for SkillZ (`public/privacy.html`,
`public/delete-account.html`) — every sentence checked against the code.

## Yours to do
1. Play developer account; check whether the Console asks for a closed test (12 testers, 14 days) again.
2. Host `dist-skillz` at `skillz.musicconnectz.net`; test on a phone.
3. Production API needs `GEMINI_API_KEY` (scoring) — without it every coach says "isn't switched on" —
   and `ANTHROPIC_API_KEY` (second check; absent = listener's notes only, still scored).
4. Backend repo → Actions → Android APK → `skillz-playstore-bundle`; create the app `net.musicconnectz.skillz`.
5. Put the app-signing and upload SHA-256 into `standalone/skillz/public/.well-known/assetlinks.json`
   (build refuses a file not naming this package), redeploy, curl it.
6. Forms from `data-safety.md`, `content-rating.md`; review account in `review-notes.md` (a real
   production account, yours, with free prompts unspent).
7. Decide the open items in `data-safety.md` / `content-rating.md` (13+ vs 18+, strain flag, public score page).

## Numbers quoted, and what recounts them
`recount-numbers.py` (`manage.py shell < …`) checks: 3 free prompts a day (`PROMPT_ALLOWANCE`), seven coaches
(`INSTRUMENT_APP_KEYS`), 90 s recorded video (`VIDEO_MAX_SECONDS`), 100 MB free audio (`min(MAX_MB,
TIER_LIMITS.free.upload_mb)`), four difficulties, five scores per coach and every dimension named,
fourteen-day consistency (`RECENT_DAYS`), two DrumZ kits (counted in `DrumZ.jsx`), lyrics only SingZ/RapZ,
and Play's field lengths. Not quoted: any price, the Premium/StatZ rows.

## Screenshots: what is real
Phone 360x640 at 3x, Chromium with the fake capture device, so Record is the real recorder. The history
is seeded rows (`seed_screenshots.py`, fictional member). **`03`–`05` and `10` show a hand-written reply
to the real coach route, intercepted in the browser** — no Gemini key here. On a box with a key, run
`LIVE=1 node standalone/skillz/take_screenshots.mjs` and ship those.

## Before you market it
- The icon shows ten people; five (DJ, producer, A&R, illustrator, videographer) are not built. The feature
  graphic uses only the five portraits of coaches that exist, and the listing says the rest aren't built.
- The coaches' main-site taglines ("16 style tracks", "Teen-safe") are not repeated: RapZ has 12 styles.
- Other agents' coach work (reference listen, VoiceZ, gear advice) is hidden or untouched in the shell; recheck
  data-safety if any of it is let into the shell.
