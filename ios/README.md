# Music ConnectZ — iOS (Capacitor)

Scaffolded on Linux. **Never opened in Xcode or built** — that needs a Mac.

## On the Mac
```bash
npm ci && npm run build
npx cap sync ios          # runs pod install
npx cap open ios
```
In Xcode: set Team, confirm bundle id `net.musicconnectz.app`, add app icon (1024px) and launch art, then Product → Archive → TestFlight.

## Before submitting
- **`GADApplicationIdentifier` in Info.plist is Google's TEST AdMob id** (without any id the app crashes at launch). Replace with the real iOS app id, or remove `@capacitor-community/admob` from the iOS build.
- **`server.url` in `capacitor.config.json` loads the live site**, so the app is a thin wrapper — the main 4.2 rejection risk. Bundle `dist` (remove `server.url`) or add native value, and test sign-in redirects.
- **Sign in with Apple** is required if Google sign-in is offered; `externalAuth.js` has Apple commented out.
- **In-app purchase**: Premium/StatZ/PromptZ sold on iOS need Apple IAP, or hide purchase screens in this build.
- UGC report/block, 18+/sensitive-data answers (orientation, substances, looks ratings), privacy labels, and a privacy policy URL.
- Screenshots: `play/screenshots/apple-*`.
