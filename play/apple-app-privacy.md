# App Store Connect — App Privacy answers (draft)

Derived from `data-safety.md` (the Play form, itself checked against the model fields), not from
a fresh read of the code. **A privacy label is a declaration you are held to**: check each row against the iOS
build before you submit, and re-read `public/privacy.html` so the two match.

Apple's rule of thumb: "collected" = sent off the device and kept longer than it takes to answer the request.
Every row below is **linked to the member's identity** (it hangs off their account) and **not used for tracking**
unless the Tracking section below says otherwise.

## Step 1 — "Do you or your third-party partners collect data from this app?"
**Yes.**

## Step 2 — data types

| Apple category → type | Collect? | Purposes to tick | Notes |
|---|---|---|---|
| Contact Info → Name | Yes | App Functionality | username / display name |
| Contact Info → Phone Number | Yes | App Functionality | optional field on the signup form |
| Contact Info → Email Address | Yes | App Functionality | sign-in and account |
| Identifiers → User ID | Yes | App Functionality | |
| Sensitive Info | Yes | App Functionality | sexual orientation (optional, adults only, set in the profile). Declare it. |
| Health & Fitness → Fitness | Yes | App Functionality | BodieZ workouts, sets, weights |
| Health & Fitness → Health | Yes (judgment) | App Functionality | BodieZ soreness and "can't use arms/legs" answers, and the optional substance-use declaration. Declaring is safer than leaving out. |
| Location → **Precise** Location | **Yes** | App Functionality | opt-in (ProfileZ → Share my approximate location, adults only), stored rounded to about 1 km, used for distance filters in VenueZ, CollabZ, BattleZ and member search. About 1 km is finer than Apple's coarse bar (roughly 3 square km, from memory — verify), so declare Precise, not Coarse. `Info.plist` has the usage text. |
| Financial Info → Other Financial Info | Yes | App Functionality | wallet and payout balances; card details stay with Stripe |
| Purchases → Purchase History | **No** | — | iOS 1.0 sells nothing (`apple-decisions-memo.md`) |
| User Content → Photos or Videos | Yes | App Functionality | avatars, posts, video takes |
| User Content → Audio Data | Yes | App Functionality | takes recorded for scoring, posts, releases. A take is sent to Google (and the written advice to Anthropic) for scoring and is stored only if the member ticks "Keep this take". |
| User Content → Emails or Text Messages | Yes | App Functionality | MessageZ, group messages |
| User Content → Gameplay Content | No | — | |
| User Content → Other User Content | Yes | App Functionality | posts, ratings, comments, bug reports |
| Other Data → **Customer Support** | **Yes** | App Functionality | in-app Contact support (ProfileZ): private tickets, owner-only queue. Linked Yes, tracking No. Not used for marketing. |
| Usage Data → Product Interaction | Yes | App Functionality, Analytics | app opens, the join-funnel events |
| Usage Data → Advertising Data | **No** | — | no ads in the iOS build |
| Diagnostics → Crash / Performance | No, unless you add a crash SDK | | |
| Browsing / Search History, Contacts | No | | |

## Step 3 — Tracking
**"Used for tracking": No for every row.** The iOS build has no ads: the AdMob pod is stripped by `tools/ios-sync.sh`,
`GADApplicationIdentifier` is gone from `Info.plist`, and `src/platform.js` hides AdZ. No tracking prompt is needed.
If ads come back in 1.1, this section changes first (Device ID, Advertising Data, tracking Yes, the prompt).

## Step 4 — Privacy policy
- URL: `https://musicconnectz.net/privacy.html`
- Optional but useful: User Privacy Choices URL → `https://musicconnectz.net/delete-account.html`

## Before you press Publish on the questionnaire
- [ ] Every row matches what the iOS build actually does (hide a feature → remove its row).
- [x] AdMob decision made: no ads on iOS 1.0.
- [ ] Location decision made (usage text added, or answered No).
- [ ] Age rating answers are consistent: sexual orientation and substance fields are adults-only server-side.
