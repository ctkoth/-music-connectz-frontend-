# App Review notes — paste into App Store Connect → App Review → Notes

Fill the two credential lines first. The account must be a real one on production, signed in once so
nothing blocks it, with the day's free AI prompts unspent. Check before you submit:
the server's `GEMINI_API_KEY` is set (without it every coach says "isn't switched on yet").

---

Music ConnectZ is a social network for musicians: record a take, get it scored by an AI coach, post
work, collaborate with escrow, and rate other members' work. Sign-in is required to use it.

DEMO ACCOUNT
  Username: REPLACE_WITH_A_REAL_REVIEW_ACCOUNT
  Password: REPLACE_WITH_ITS_PASSWORD

HOW TO TRY THE MAIN FEATURE (no instrument needed)
1. Open the SingZ or RapZ tab (bottom dock → ⊞ → SingZ).
2. Tap "Record a take", allow the microphone, talk or hum for about ten seconds, tap Stop.
3. Tap "Send it to the coach". The price is shown beside the button before it is pressed, and a
   failed or unscorable take is not charged. Scoring can take up to about two minutes and then says so.
4. The result shows each score with its name, what worked, what to fix and one drill, and a line saying what
   one take can and cannot show. Scores are produced by AI and are labelled as such.

PERMISSIONS
The microphone and camera are used only when the member taps Record or Record on camera; the photo library
only when attaching a file. Location is used only if a member turns on ProfileZ → "Share my approximate location"
(adults only, off by default, stored rounded to about 1 km, deleted when turned off). Each prompt appears at that tap, with its reason.

USER-GENERATED CONTENT — reporting, blocking, moderation
- "Report this output" under every AI result, and report options on posts, go to the owner's moderation queue.
- Members can block other members; blocked members cannot message or interact with the blocker.
- Members under 18 and adults are kept apart: member search and direct messages are age-grouped server-side,
  and adult-only features (member matching, looks-related features, orientation and substance fields) are
  refused for minors and for accounts without a stated adult age.

ACCOUNT DELETION (in the app)
ProfileZ → scroll to "Danger zone" → Delete account. It states what is deleted before the button. Deleting
also cancels any active subscription first. Web page for the same: https://musicconnectz.net/delete-account.html

PRIVACY
Policy: https://musicconnectz.net/privacy.html. A take is sent to Google for scoring and the written advice
to Anthropic; the recording is not stored unless the member ticks "Keep this take".

SIGN-IN
Email and password only. There is no Google, Facebook or other third-party sign-in in this build.

PURCHASES
This build has no in-app purchases and no ads. Premium, credits and the member marketplace are not offered here.
Members can pay each other for real-world creative work (CollabZ deals held in escrow), and withdraw earnings;
that is payment between people for services, not a purchase of digital content from us.

CONTACT
REPLACE_WITH_A_REAL_EMAIL_AND_PHONE_THE_REVIEWER_CAN_REACH

---

# Checklist: make the review account (not part of the notes — don't paste this)

**Create it**
- [ ] In a private window, sign up at https://musicconnectz.net with a **new email that isn't yours** (a separate address or a plus-alias). Reusing your own email can group it with your main account under the one-account-per-person rule.
- [ ] Username like `appreview` (letters, numbers, underscore; 3–20 characters). Password you can paste here; common ones like `password` are refused.

**Ready it for a reviewer**
- [ ] ProfileZ: set an adult birthday.
- [ ] Finish or dismiss OnboardZ so the first screen isn't the "I'm here for…" picker.
- [ ] Post one thing in PostZ so the feed isn't empty.
- [ ] Leave the day's free AI prompts unspent (the counter at the top reads 4/4).

**Check it**
- [ ] The server's Gemini key is set (otherwise every coach says "isn't switched on yet").
- [ ] On a real iPhone, from the TestFlight build: log in, SingZ → Record a take → Stop → Send it to the coach.
- [ ] ProfileZ → Danger zone → Delete account is reachable (the notes above say it is). Test deletion on a throwaway account, never this one.

**Submit it**
- [ ] Replace the two credential lines and the contact line above, then paste the notes into App Review → Notes.
- [ ] Also enter the username and password in App Review → Sign-in information (tick "Sign-in required"), plus a contact email and phone.
- [ ] Don't delete the account or change its password while the app is in review.
