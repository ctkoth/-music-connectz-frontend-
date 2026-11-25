# Apple build upload — step by step

Written from Capacitor 6 and Xcode's documented flow. **None of it has been run**: the iOS project has never been
opened on a Mac. If a menu name differs in your Xcode version, follow the intent, not the wording.

## A. Before you build (10 minutes, on the Mac)
1. [ ] `git pull` the branch, then `npm ci && npm run build`.
2. [x] **AdMob:** already removed from the iOS project (`GADApplicationIdentifier` deleted; `tools/ios-sync.sh` strips the pod). The package stays installed because the Android bundle uses it.
3. [ ] **Thin wrapper:** in `capacitor.config.json`, decide whether to keep `server.url` (loads the live site) or remove it so the bundled `dist/` runs. Removing it is safer for review; test sign-in redirects either way.
4. [ ] `tools/ios-sync.sh` — builds, syncs, **strips the AdMob pod** and runs `pod install`. (Plain `npx cap sync ios` puts AdMob back; don't use it.) If pods fail, `cd ios/App && pod install --repo-update`.
5. [ ] `npx cap open ios`. Always open the `.xcworkspace`, never the `.xcodeproj`.

## B. Xcode settings (once)
1. [ ] Select the **App** project → **App** target → **Signing & Capabilities**: tick **Automatically manage signing**, pick your **Team**.
2. [ ] **Bundle Identifier:** `com.musicconnectz.app` (must match the app record in App Store Connect).
3. [ ] **General → Identity:** Version `1.0.0`; Build `1`. Every upload needs a build number higher than the last one.
4. [ ] **General → Deployment Info:** set the minimum iOS version; untick iPad under **Supported Destinations** if the app isn't offered on iPad (and don't upload iPad screenshots).
5. [ ] **Capabilities:** add Push Notifications / Sign in with Apple only if you ship those.
6. [ ] Check the icon: **Assets → AppIcon** shows the 1024px image with no warning.

## C. Test it before you upload
1. [ ] Run on a simulator (iPhone 16 Pro Max), then on a real iPhone (Product → Run).
2. [ ] On the device: sign in, SingZ → Record a take → allow mic → Stop → confirm the recorder works.
3. [ ] Fix anything that breaks. Reviewers reject apps that crash on launch or show a blank screen.

## D. Archive and upload
1. [ ] Set the run destination to **Any iOS Device (arm64)** (top bar).
2. [ ] **Product → Archive.** Wait for the Organizer window to open with the new archive.
3. [ ] **Validate App** first (optional but catches icon, signing and plist errors cheaply). Fix any warning it names.
4. [ ] **Distribute App → App Store Connect → Upload**. Accept the defaults (automatic signing, upload symbols).
5. [ ] Wait for "Upload Successful".

## E. After the upload
1. [ ] App Store Connect → your app → **TestFlight**. The build shows "Processing" for 10–60 minutes, then an email says it's ready.
2. [ ] If it asks about **export compliance**: the plist already says `ITSAppUsesNonExemptEncryption = false` (HTTPS only). Change it only if you add your own encryption.
3. [ ] Add yourself as an **internal tester** and install the build with the TestFlight app. Re-run section C on that exact build.
4. [ ] **Distribution tab → iOS App Version 1.0 → Build:** click **+**, choose the processed build.
5. [ ] Finish the remaining sections (App Privacy, App Compliance, App Review, age rating) — the drafts are in `play/`.
6. [ ] **Add for Review → Submit.**

## F. If an upload fails
| Message | Usual cause | Fix |
|---|---|---|
| "No profiles / signing certificate" | no Team selected | Signing & Capabilities → pick the Team |
| "Invalid bundle / app record not found" | bundle id doesn't match the record | make them identical |
| "The bundle version must be higher" | build number reused | raise **Build** and re-archive |
| "Missing icon / alpha channel" | icon issue | re-check AppIcon (1024px, no transparency; the checked-in one is RGB) |
| "Missing usage description" | permission string absent | add the `NS…UsageDescription` key it names to `Info.plist` |
| Crash on launch at review | AdMob id missing/invalid | step A2 |

## G. Command-line alternative (if you prefer, or for CI)
```bash
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
  -archivePath build/App.xcarchive archive
xcodebuild -exportArchive -archivePath build/App.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath build/export
xcrun altool --upload-app -f build/export/App.ipa -t ios \
  --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>
```
`ExportOptions.plist` (method `app-store-connect`, your team id) and an App Store Connect API key are yours to create; neither is in the repo.
Transporter (Mac App Store) can upload the exported `.ipa` by drag-and-drop instead.
