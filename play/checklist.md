# Pre-submit checklist

## Blocking — the app is not submittable without these

- [ ] **Decide the teen / sensitive-data question** — `data-safety.md`, top.
      Everything else is mechanical; this one is a product decision.
- [ ] **`assetlinks.json` live** at `https://musicconnectz.net/.well-known/assetlinks.json`,
      containing **both** your upload key and the Play App Signing key.
      Without both, the app shows a browser address bar.
- [ ] **Web account-deletion page.** Play requires a URL a non-installer can
      reach. The API endpoint exists (`POST /api/economy/account/delete/`); a
      public page explaining how to request deletion does not. A static page at
      `/delete-account.html` naming the in-app path and a contact address is
      enough — it does not have to be a working form.
- [ ] **Privacy policy names the AI processors** — that a Boss Take (voice, and
      on camera, face) goes to Google for scoring, and that OCC prompts go to
      Anthropic. `privacy.html` is live but should say this in plain words.
- [ ] **Feature graphic, 1024 × 500.** Not made yet. Listing won't publish without it.
- [ ] **Two phone screenshots minimum.**
- [ ] **Back up the signing keystore** somewhere you'll still have in five
      years. Lose it and the listing can never be updated, only replaced.

## Do these or the first review will be slower than it needs to be

- [ ] Ship an **Internal testing** release first and install it on your own
      phone. It's the only way to see the asset-links result before users do.
- [ ] Check the app runs offline-tolerantly — a TWA with no network shows a
      Chrome error page, which reviewers read as a crash. A simple offline
      fallback in the service worker avoids it.
- [ ] Confirm **every permission the app asks for has a visible reason** at the
      moment it asks. Mic (Boss Take), camera (video takes), location (opt-in,
      nearby collabs). A permission requested on launch with no context is the
      single most common TWA rejection.
- [ ] Set **"Contains ads"** correctly if AdZ / OfferZ serve third-party ads.
- [ ] Target audience: set it deliberately, matching whatever you decided above.

## Worth knowing

- Play requires apps to target a recent Android API level; Bubblewrap's current
  template already does. If a build is rejected on target SDK, update Bubblewrap
  and rebuild rather than editing the Gradle file by hand.
- First review of a brand-new developer account commonly takes days rather than
  hours, and a new personal developer account may need to run a **closed test
  with testers before it can publish to production**. Check what your account
  requires early — it's the longest pole and it's invisible until you hit it.
