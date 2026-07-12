# BUILD_APK — Android app that mirrors the web release

The app icon and favicon both come from `favicon.webp`. The APK wraps your live
site (`https://musicconnectz.net`) so it always mirrors the web release — ship the
web, the app updates too.

## Prerequisites
- Node 18+ and the repo installed (`npm install`)
- Android Studio (includes the Android SDK + Gradle) — or just the SDK + JDK 17
- Java 17

## One-time setup
```bash
npm install
npm run build                      # produces dist/
npx cap init "Music ConnectZ" net.musicconnectz.app --web-dir dist   # if not already (capacitor.config.json is included)
npx cap add android
```

## App icon + splash from favicon.webp
The source icon is `assets/icon.png` (generated from favicon.webp) and
`assets/splash.png`. Install the asset generator (it pulls native deps, so do it
on your build machine, not in CI sandboxes) and generate all densities:
```bash
npm i -D @capacitor/assets
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#07060d' --splashBackgroundColor '#07060d'
npx cap sync android
```

## Build the APK
Option A — Android Studio (recommended for a signed release):
```bash
npx cap open android
```
Then: Build ▸ Generate Signed Bundle / APK ▸ APK ▸ create/choose a keystore ▸
release ▸ Finish. The signed APK lands in
`android/app/build/outputs/apk/release/`.

Option B — command line (debug APK, no signing):
```bash
cd android
./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

## Mirror mode vs bundled mode
- **Mirror (default, in capacitor.config.json):** `server.url = https://musicconnectz.net`.
  The APK loads the live site. Zero rebuilds when you ship web. Needs internet.
- **Bundled/offline:** remove the `server.url` block, set
  `VITE_API_BASE=https://admin.musicconnectz.net` in `.env`, `npm run build`,
  `npx cap sync`. The web assets ship inside the APK and call Render directly —
  in this mode add the app origin to the backend CORS list
  (`https://localhost` and `capacitor://localhost`).

## Play Store note
A pure wrapper can be flagged by Google Play review. For a store listing, prefer
bundled mode and add real native value (push, share targets). For sideloading /
personal distribution, mirror mode is fine.
