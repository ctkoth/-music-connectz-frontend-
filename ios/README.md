# Music ConnectZ — iOS (Capacitor 6)

Scaffolded on Linux. **Never opened in Xcode or built** — every step below that
needs a Mac is untested. Bundle id: `net.musicconnectz.app`.

Tick each box in order. Steps 1–4 get a build on your phone; 5–8 are what stands
between that build and App Store review.

## 1. Accounts and tools (once)
- [ ] Apple Developer Program membership ($99/yr) — developer.apple.com/programs
- [ ] A Mac with a current Xcode (Capacitor 6 needs Xcode 15 or newer) — install from the Mac App Store
- [ ] CocoaPods: `sudo gem install cocoapods` (or `brew install cocoapods`)
- [ ] Node 18+ and this repo cloned on the Mac, branch `claude/eloquent-ride-tv6mwy` or `main` once merged

## 2. Build the web app and sync it into the iOS project
```bash
npm ci
npm run build
tools/ios-sync.sh     # build + sync WITHOUT the AdMob pod, then pod install (don't use plain `npx cap sync ios`)
npx cap open ios      # opens ios/App/App.xcworkspace — always the .xcworkspace, never .xcodeproj
```
- [ ] `pod install` finished without errors (if it fails, run `cd ios/App && pod install --repo-update`)

## 3. Signing in Xcode
- [ ] Select the **App** target → **Signing & Capabilities**
- [ ] Tick **Automatically manage signing** and choose your **Team**
- [ ] Confirm **Bundle Identifier** is `net.musicconnectz.app`
- [ ] **General** tab: set **Version** (e.g. 1.0.0) and **Build** (1; raise it for every upload)

## 4. Run it
- [ ] Pick a simulator (iPhone 16 Pro Max is the 6.9" size) and press Run — the app should show the splash, then the site
- [ ] Plug in a real iPhone, trust the Mac, press Run — the simulator has no real microphone path for the recorder
- [ ] On the device: sign in (email/password), open SingZ, press **Record**, allow the mic, record 5 seconds
- [ ] Check the icon and launch screen look right (artwork in `resources/icon.png` and `resources/splash.png`, already in the asset catalog)
- [ ] Note anything that fails — Google/Spotify/SoundCloud sign-in redirects are the most likely to need work

## 5. Fix before submitting (these will get the app rejected or crash it)
- [x] **AdMob.** Removed from the iOS build: no `GADApplicationIdentifier`, and `tools/ios-sync.sh` strips the pod. Ads, third-party sign-in and purchases are hidden on iOS by `src/platform.js` (see `play/apple-decisions-memo.md`).
- [ ] **Thin wrapper (guideline 4.2).** `capacitor.config.json` has `server.url` pointing at https://musicconnectz.net, so the app is the website in a frame. Either remove `server.url` so the bundled `dist/` runs, or add native value (push notifications, native recorder). Then re-test step 4.
- [ ] **Sign in with Apple.** Required when you offer Google or other third-party sign-in. `src/externalAuth.js` has Apple handled differently on each build and the backend provider list has Apple commented out — decide: enable it, or offer only email sign-in in the iOS build.
- [ ] **Purchases.** Premium, StatZ and PromptZ are digital goods; Apple requires its in-app purchase for them. Either build IAP, or hide every purchase screen in the iOS build (as the standalone shells do).
- [ ] **Account deletion** must work inside the app (it does: `DELETE /api/auth/me/`) — confirm you can reach it on the device.
- [ ] **Reporting and blocking** of member content must be reachable from posts and messages — confirm on the device.

## 6. App Store Connect — create the listing
- [ ] appstoreconnect.apple.com → **My Apps → + → New App**, platform iOS, bundle id `net.musicconnectz.app`
- [ ] Name, subtitle, description, keywords, support URL, marketing URL
- [ ] **Privacy policy URL** (`https://musicconnectz.net/privacy.html`) — re-read it first; it must match what the iOS app does
- [ ] **App Privacy** questionnaire: audio and video from takes, account details, usage, and the sensitive fields (sexual orientation, substance use) that `play/data-safety.md` already inventories — answer the same way
- [ ] **Age rating** questionnaire, including user-generated content and any mature or dating features
- [ ] **Screenshots** from `play/screenshots/`: upload `apple-iphone-6.9-1320x2868/` (required); `apple-ipad-13-2064x2752/` only if iPad is supported (else untick iPad in Xcode → Supported Destinations)
- [ ] **App Review information**: a test login and notes on how to reach the recorder, how to delete an account, and how reporting works (`play/skillz/review-notes.md` is a model)
- [ ] Select the **Sensitive/age-restricted** answers honestly — the 18+ features are the part reviewers look at hardest

## 7. Upload a build
- [ ] In Xcode choose **Any iOS Device (arm64)** as the destination
- [ ] **Product → Archive**
- [ ] In the Organizer: **Distribute App → App Store Connect → Upload**
- [ ] Wait for the build to finish processing (email arrives), then fix any "Missing compliance" or icon warnings
- [ ] `ITSAppUsesNonExemptEncryption` is already set to `false` (HTTPS only); change it if you add your own encryption

## 8. TestFlight, then review
- [ ] App Store Connect → **TestFlight**: add yourself as an internal tester and install the uploaded build on your phone
- [ ] Re-run the step 4 device checks on that build
- [ ] In the listing, pick the build, fill every required field, then **Add for Review → Submit**
- [ ] Reply quickly to any reviewer message; first reviews often come back with one round of questions

## Files in this project
| Path | What it is |
|---|---|
| `capacitor.config.json` | App id, name, `server.url`, allowed navigation, `ios` block |
| `ios/App/App/Info.plist` | Mic, camera, photo-library text; encryption flag |
| `ios/App/App/Assets.xcassets/` | App icon (1024px) and launch images |
| `resources/icon.png`, `resources/splash.png` | Source art for both |
| `play/screenshots/apple-*` | Store screenshots (6.9", 6.5", iPad 13") |
