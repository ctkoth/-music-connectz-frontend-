# RELEASE_ANDROID — publish the Music ConnectZ app to Google Play

This builds a **signed Android App Bundle (.aab)** from the Capacitor project and
uploads it to Google Play. The app wraps the live site (`https://musicconnectz.net`)
and adds native features (rewarded ads, etc.), so shipping the web updates the app.

> App id: `net.musicconnectz.app` · App name: `Music ConnectZ`

---

## 0. One-time: Google Play Developer account
- Go to <https://play.google.com/console> and pay the **one-time $25** registration.
- Complete identity + (for a company) D-U-N-S verification. This can take 1–3 days — start it now.

## 1. Prerequisites on your build machine
- Node 18+, the repo installed (`npm install`)
- **Android Studio** (bundles the Android SDK, Gradle) or the SDK + **JDK 17**

## 2. Generate your upload keystore (ONE time — never lose this file)
```bash
keytool -genkey -v -keystore mcz-upload.keystore \
  -alias mcz -keyalg RSA -keysize 2048 -validity 10000
```
- Choose a strong password; answer the name/org prompts.
- **Back up `mcz-upload.keystore` + the passwords somewhere safe.** If you lose it you can't update the app (unless you enrol in Play App Signing key reset). Do **not** commit it to git.

## 3. Build the web + add the Android project
```bash
npm run build                      # produces dist/
npx cap add android                # first time only (generates android/)
npx cap sync android               # copies dist/ + plugins into android/
```

## 4. Point Gradle at your keystore
Create `android/keystore.properties` (do **not** commit it):
```
storeFile=../../mcz-upload.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=mcz
keyPassword=YOUR_KEY_PASSWORD
```
In `android/app/build.gradle`, inside `android { }`, add signing + wire it to release:
```gradle
def kp = new Properties()
def kpf = rootProject.file("keystore.properties")
if (kpf.exists()) { kp.load(new FileInputStream(kpf)) }

signingConfigs {
    release {
        storeFile file(kp['storeFile'] ?: 'x'); storePassword kp['storePassword']
        keyAlias kp['keyAlias']; keyPassword kp['keyPassword']
    }
}
buildTypes {
    release { signingConfig signingConfigs.release }
}
```

## 5. Set the version for each release
In `android/app/build.gradle` → `defaultConfig`, bump **both** every upload:
```gradle
versionCode 1            // integer, +1 every upload (2, 3, 4 …)
versionName "1.0.0"      // human version shown on the store
```

## 6. Build the signed bundle
```bash
cd android
./gradlew bundleRelease
# output: android/app/build/outputs/bundle/release/app-release.aab
```

## 7. Upload to Play Console
1. Play Console → **Create app** → name `Music ConnectZ`, language, **App**, **Free**.
2. Complete **Set up your app** (see `store/GOOGLE_PLAY_KIT.md` for every answer):
   privacy policy URL, data safety, content rating, target audience, ads declaration.
3. **Testing → Internal testing → Create release** → upload the `.aab` → add your
   email as a tester → roll out. Install via the tester link to smoke-test on a real device.
4. When happy: **Production → Create release** → upload → submit for review
   (first review typically 1–7 days).

## 8. Enable Play App Signing (recommended)
When prompted, let Google manage the app signing key; your `mcz-upload.keystore`
becomes just the *upload* key (safer — Google can help if it's ever lost).

## Updating later
Ship web changes normally (Vercel). For app updates that change native code or
just to push a new build: bump `versionCode`/`versionName` → `npx cap sync android`
→ `./gradlew bundleRelease` → upload a new release.

## Heads-up: "webview-only app" policy
Google can reject apps that are *only* a website wrapper with no added value. Our
app adds native value (rewarded ads via AdMob, and more), which strengthens the
case. Make sure at least one native feature is wired before Production submission,
and describe that value in the listing.
