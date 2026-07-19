# 📱 Music ConnectZ — Mobile Deployment Guide

Ship the app to **Google Play** (Android) and the **Apple App Store** (iOS) from the
existing web codebase using **Capacitor** (already a dependency).

The project is pre-configured in `capacitor.config.json`:

```json
{ "appId": "net.musicconnectz.app", "appName": "Music ConnectZ", "webDir": "dist",
  "server": { "url": "https://musicconnectz.net", "cleartext": false } }
```

`server.url` means the native shell loads the live site, so the app stays
auto-updated without re-submitting. (To ship a **bundled/offline** build instead,
delete the `server` block — then each release ships the `dist/` you built.)

> You cannot build a signed APK/IPA in a cloud sandbox — the steps below run on
> **your Mac/PC** with the platform SDKs installed. Everything is scripted; you
> mostly run commands and click through the store consoles.

---

## 0. One-time prerequisites
- **Node 18+** and this repo cloned.
- **Android:** [Android Studio](https://developer.android.com/studio) (installs the Android SDK + Gradle + JDK).
- **iOS:** a **Mac** with [Xcode](https://apps.apple.com/app/xcode/id497799835) + an [Apple Developer account](https://developer.apple.com/programs/) ($99/yr).
- **Google Play:** a [Play Console account](https://play.google.com/console/signup) (one-time $25).

Install deps once: `npm install`

---

## 1. 🤖 Build the Android APK / AAB

```bash
npm run cap:add:android     # generates the native android/ project (first time only)
npm run android:open        # builds web, syncs, opens Android Studio
```

In **Android Studio**:
1. Let Gradle sync finish.
2. **Build → Generate Signed Bundle / APK**.
   - Choose **Android App Bundle (.aab)** for Play (required), or **APK** for a direct install/sideload.
3. **Create new keystore** (first time) — *store this `.jks` file + passwords somewhere safe; you can never update the app without it.*
   - Fill: key alias, passwords, your name/org.
4. Pick **release** build variant → **Finish**.
5. Output lands in `android/app/release/` — that's your `.aab` (Play) or `.apk` (sideload).

**Quick sideloadable APK for yourself** (no signing UI): in Android Studio, **Build → Build APK(s)** produces a debug APK at `android/app/build/outputs/apk/debug/app-debug.apk` — email it to your phone and open it (enable "install unknown apps").

### App icons / splash
Replace icons in `android/app/src/main/res/mipmap-*` (Android Studio → right-click `res` → New → Image Asset), or use `@capacitor/assets`:
```bash
npx @capacitor/assets generate --iconBackgroundColor '#07060d' --android
```
(Put a 1024×1024 `assets/icon.png` and `assets/splash.png` first.)

---

## 2. 🏪 Publish to Google Play
1. [Play Console](https://play.google.com/console) → **Create app** → name **Music ConnectZ**, language, **App** (not game), Free/Paid.
2. **Complete the required declarations** (left nav → *Policy → App content*):
   - Privacy policy URL — **required** (see note below).
   - Data safety form (what you collect: email, payments, location if used).
   - Ads (declare Yes/No), Content rating questionnaire, Target audience.
3. **Create a release:** *Production → Create new release* → upload your `.aab`.
   - Play manages app signing (accept "Play App Signing").
4. **Store listing:** short + full description, 512×512 icon, feature graphic (1024×500), ≥2 phone screenshots.
5. **Send for review.** First review is typically 1–7 days; Google now requires **~14 days of closed testing with ≥12 testers** for brand-new personal developer accounts before production — set up a *Closed testing* track first and invite testers.

> ⚠️ **Webview policy:** a shell that only loads a website can be rejected under
> *Minimum Functionality*. Mitigate by shipping a **TWA** (Trusted Web Activity via
> [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)) for a pure PWA, or by
> using native Capacitor plugins (push, camera, geolocation) so it's clearly an app,
> not a bookmark. Music ConnectZ already uses geolocation + media capture, which helps.

---

## 3. 🍎 Build + publish to the Apple App Store (Mac only)
```bash
npm run cap:add:ios
npm run ios:open            # builds web, syncs, opens Xcode
```
In **Xcode**:
1. Select the **App** target → **Signing & Capabilities** → set your **Team** (Apple Developer account). Xcode auto-manages the signing certificate + provisioning profile.
2. Set the **Bundle Identifier** to `net.musicconnectz.app` (must match App Store Connect).
3. Set a **Version** (e.g. 1.0.0) and **Build** number.
4. Choose **Any iOS Device (arm64)** → **Product → Archive**.
5. When the Organizer opens → **Distribute App → App Store Connect → Upload**.

Then in [App Store Connect](https://appstoreconnect.apple.com):
1. **My Apps → +** → New App → platform iOS, name **Music ConnectZ**, bundle id, SKU.
2. Fill **App Privacy** (data types collected), **Age rating**, category (Music), **Privacy Policy URL** (required).
3. Add screenshots (6.7" + 6.5" iPhone at minimum), description, keywords, support URL.
4. Select your uploaded build → **Add for Review → Submit**. Review is usually 24–48h.

> ⚠️ Apple's **Guideline 4.2 (Minimum Functionality)** is stricter than Google's about
> "website in a wrapper." Ensure native capabilities are wired (Apple sign-in is
> **required** if you offer any third-party login — see the OAuth guide) and the app
> feels native. Add push via `@capacitor/push-notifications` to strengthen the case.

---

## 4. 🔗 Required for both stores
- **Privacy Policy URL** — host one (e.g. `https://musicconnectz.net/privacy`). Both stores reject without it. (The in-app LegalZ page is a start; publish a public URL version.)
- **Account deletion** — both stores require an in-app (or documented) way to delete your account when you offer sign-in.
- **Apple Sign In** — if the app offers Google/Facebook/etc. login, Apple **requires** offering *Sign in with Apple* too (already supported server-side).
- **OAuth redirect URIs** must include your production domain **and** the app's custom scheme — see `OAUTH_SETUP.md`.

---

## 5. Release checklist
```
[ ] npm install && npm run build   (web builds clean)
[ ] Android: signed .aab uploaded, keystore backed up
[ ] iOS: archive uploaded from Xcode
[ ] Privacy Policy URL live
[ ] Data safety / App privacy forms completed
[ ] Backend env: SECRET_KEY + Stripe/PayPal/OAuth keys set (see backend audit + OAUTH_SETUP.md)
[ ] OAuth redirect URIs include prod domain + app scheme
[ ] Screenshots + icon + descriptions added
[ ] Closed testing (Android) / TestFlight (iOS) before production
```
