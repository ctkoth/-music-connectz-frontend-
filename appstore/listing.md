# App Store listing — Music ConnectZ

Copy into App Store Connect. Limits in brackets are Apple's; counts checked.

## App Information
- **Name [30]:** `Music ConnectZ`
- **Subtitle [30]:** `Collab, get rated, get paid`
- **Primary category:** Music · **Secondary:** Social Networking
- **Bundle ID:** `net.musicconnectz.app` (same as `capacitor.config.json`)
- **Privacy Policy URL:** https://musicconnectz.net/privacy.html
- **Support URL / Marketing URL:** https://musicconnectz.net

## Version page
- **Promotional text [170]** (editable any time, no review):
  `Record a take, get it scored by an AI coach, collab with escrow so nobody pays and prays, and get rated by people who make music.`
- **Keywords [100]:** `music,collab,rap,singer,producer,beats,songwriter,coach,vocal,guitar,drums,battle,lyrics,mix`
- **Description [4000]:** use `play/listing/full-description.txt` (about 2,300 characters).
- **What's New:** use the block in `playkit/LISTING.md`.
- **Copyright:** `2026 Music ConnectZ`

## Files
| Field | File | Spec |
|---|---|---|
| App icon | `appstore/icon/icon-1024.png` | 1024×1024, RGB, no alpha, square corners |
| iPhone 6.9" screenshots | `appstore/screenshots/iphone-6.9/*.png` | 1320×2868 (6 shots, max 10) |
| iPad 13" screenshots | `appstore/screenshots/ipad-13/*.png` | 2064×2752 (only if the app runs on iPad) |
| Header | `appstore/creative/header-3840x1646.png` | 21:9, no alpha |
| Search results | `appstore/creative/search-results-2880x1920.png` | 3:2, 1920×1280 to 3840×2560 |
| Header + search in one | `appstore/creative/universal-5244x2950.png` | 16:9 PNG; tick "Use header asset in search results" |

Header and Search Results assets need iOS 27 / iPadOS 27 or later and are
optional. Apple states the sizes in "Creative assets specifications" in App
Store Connect Help.

## Review-risk list (decide before submitting)
1. **Payments (3.1.1).** Premium, StatZ, PromptZ and wallet top-ups are digital
   goods sold through Stripe. On iOS they have to be In-App Purchase, or hidden
   inside the iOS build. The BodieZ shell already hides purchase flows the same way.
2. **Sign in with Apple (4.8).** Google/GitHub/Spotify etc. sign-in is offered, so
   Apple sign-in must be offered too. Setup is in `APPLE_OAUTH.md` (backend repo).
3. **Thin wrapper (4.2).** `capacitor.config.json` loads `https://musicconnectz.net`
   remotely. Review notes should point at the native pieces (mic/camera recording,
   push, share) so it does not read as a website in a frame.
4. **User-generated content (1.2).** Needs report, block, and a published contact —
   all exist in the app; say so in the review notes.
5. **Account deletion (5.1.1v).** In-app via ProfileZ; say where in the notes.
6. **Real-money battles.** The "Vote YES" real-money-battles poll on BattleZ and the
   SpinaZ wagers: describe SpinaZ as an in-app points currency in the notes.
7. **Age rating.** UGC, user-to-user messaging, and a 18+ dating filter (VybeZ):
   answer the questionnaire to match; the main app is 13+ per the Play listing.
8. **Demo account.** Give review a working login; there is no iOS build yet (`ios/`
   has not been added; `npm run cap:add:ios` on a Mac).
