# Decision memo — AdMob, Sign in with Apple, purchases (iOS v1.0)

**Recommendation in one line:** ship iOS 1.0 with **no ads, no third-party sign-in, and no purchases.** Email/password,
the free tier, and everything that doesn't sell a digital good. Add the rest in 1.1, one at a time, once 1.0 is through
review. Each is a separate way to get rejected, and 1.0 only needs to clear one door.

What this memo does and doesn't know: the Apple rules below are from my knowledge of the App Store Review Guidelines,
not a live read of today's text, and none of the code paths have run on iOS. Verify the rule numbers before you cite them
to a reviewer.

## 1. AdMob (and the AdZ / OfferZ ad frames)

| | |
|---|---|
| Today | `@capacitor-community/admob` is in the iOS project with Google's **test** app id in `Info.plist`. The web side has `src/admob.js`, `AdFrame.jsx` and AdZ. |
| If you ship ads | Real iOS AdMob app id; App Tracking Transparency prompt (`NSUserTrackingUsageDescription`); privacy label changes to **Tracking: Yes** with Device ID and Advertising Data; the Families/minor ad rule has to hold on iOS too. |
| If you don't | Privacy answers stay "no tracking", no ATT prompt, no AdMob review questions. |

**Recommend: remove ads from the iOS build.** It's the cheapest of the three to defer and the one that changes the privacy label.
Cost: no ad revenue and no AdZ/OfferZ 🍥 earning on iOS until 1.1.

To do:
- `npm uninstall @capacitor-community/admob`, then `npx cap sync ios`, and delete `GADApplicationIdentifier` from `Info.plist`.
- Hide `AdFrame` / AdZ when running natively on iOS. **A web ad frame inside the app collects identifiers the same way AdMob does**, so removing only the plugin isn't enough. I haven't checked what `ad-swap.web.app` collects.

## 2. Sign in with Apple

Rule (Guideline 4.8): an app that offers Google, Facebook or another third-party login must offer an equivalent privacy-preserving
login, which means Sign in with Apple. **An app with only its own email/password login is exempt.**

| Option | Cost | Risk |
|---|---|---|
| **A. Email/password only on iOS 1.0** (recommended) | hide the Google/Spotify/Facebook/GitHub sign-in buttons on iOS | none for 4.8 |
| B. Add Sign in with Apple natively | Mac work: the capability, a native plugin, Apple Services ID/keys; the backend already verifies Apple identity tokens (`apps/accounts/oauth.py`) | medium: untested on iOS |
| C. Keep third-party buttons and add Apple | both of the above | highest |

**Recommend A for 1.0, then B in 1.1.**

Two things to fix whichever you choose:
- **`appShell()` in `src/externalAuth.js` calls any native build "android"** (`Capacitor.isNativePlatform()` → `"android"`). On iOS that sends sign-in down the Android `intent://` deep-link path, which doesn't exist there. Give iOS its own value (check `Capacitor.getPlatform() === "ios"`) before anything else depends on it.
- Linking Spotify/SoundCloud to *verify reach* after signing in isn't "login", so 4.8 shouldn't apply, but a reviewer may look; say so in the App Review notes if you keep it.

## 3. Purchases

What the app sells today: Premium ($7/mo, $60/yr), StatZ, PromptZ credits and auto top-up, MerchZ, SpecZ, all through Stripe. Apple generally requires its own
in-app purchase for digital subscriptions and credits (Guideline 3.1.1), and takes 15–30%.

| Option | Cost | Risk |
|---|---|---|
| **A. No purchases on iOS 1.0** (recommended) | hide Premium/StatZ/PromptZ/top-up UI on iOS; members who already subscribed on the web keep their benefits and can sign in | low, if nothing on screen tells them to buy elsewhere |
| B. Apple in-app purchase | build StoreKit products plus server receipt validation; Apple's cut on every sale | medium: new payment path, never tested |
| C. Keep Stripe checkout on iOS | none | **high: the most common rejection for this app type** |

**Recommend A for 1.0.** Cost: no iOS revenue and no upgrade path from iOS. Premium's price (7/60) stays Corey's call and isn't touched.

Also decide, because a reviewer may ask:
- **Real cash between members** (escrow in CollabZ, payouts, the wallet): this is people paying people for real-world work, which Apple treats differently from digital goods. Keep it, and describe it in the review notes. Real-money *battles* are "not live" in the app, so say nothing about them.
- **SpinaZ → PromptZ** conversion is an in-app earn-and-spend loop with no cash in, so it's fine; it just can't be sold for money on iOS.
- **Copy that mentions plans** (the "Free, Premium and StatZ" paragraph in the listing and `LadderTable`) reads like a store. Remove or soften it in the iOS build and the listing.

## What changes if you take all three recommendations
- `play/apple-app-privacy.md`: Tracking = **No**; drop Advertising Data and Device ID; Purchases row can go.
- `play/apple-age-rating.md`: Advertising = **No**.
- `play/apple-review-notes.md`: fill in "Sign-in: email and password only" and "Purchases: this build has no in-app purchases".
- Listing description: delete the Free, Premium and StatZ paragraph.
- Code (a small, iOS-only flag, like `VITE_STANDALONE`): hide ads, third-party sign-in and purchase screens; fix `appShell()`.

## Order of work
1. Fix `appShell()` for iOS. 2. Add the iOS-only hiding flag. 3. Remove AdMob. 4. Update the four docs above. 5. Build and test on a device (see `apple-build-upload.md`).

## Implemented (iOS-only flags in `src/platform.js`)
- `appShell()` returns `"ios"` for the iOS app instead of falling into the Android branch.
- **Ads:** `initAdMob()` does nothing on iOS; the AdZ tab shows a one-line note. (The only ad frame in the repo is the static `public/partners.html`, not part of the app shell.)
- **Sign-in:** `OAuthButtons` renders nothing on iOS, so email/password is the only way in.
- **Purchases:** MembershipZ shows a one-line note, `PromptzDoor` (the "buy with your balance" door) and `OfferPanel` and `TierUpgradePrompt` render nothing.
- Tests: `src/platform.test.mjs`; full suite and build pass. Driven in a browser with the platform faked as iOS: plans and the cash buy door gone, AdZ note shown, web unchanged.
- **MerchZ** (members selling beats, packs and routines for cash, with a platform fee) is hidden on iOS the same way. **SpecZ** is left as it is: it spends earned 🍥, no cash, so it isn't a purchase of the kind Apple wants in-app purchase for.
- **Not covered:** scattered "upgrade" wording inside tier-locked screens. Review those before submitting. Also still to do: remove `@capacitor-community/admob` and its `Info.plist` id, and update the four docs listed above.
