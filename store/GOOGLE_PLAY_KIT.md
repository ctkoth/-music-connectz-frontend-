# Google Play listing kit — Music ConnectZ

Copy-paste answers for the Play Console "Set up your app" flow and the store
listing. Tweak wording to taste; the structure matches what Play asks for.

---

## Store listing — text

**App name** (max 30): `Music ConnectZ`

**Short description** (max 80):
`Gamified music platform: post, rate, collab, learn, and earn as you create.`

**Full description** (max 4000):
```
Music ConnectZ is a gamified home for music creators. Share your work, get rated
by the community, collaborate, learn instruments, and earn as you go.

• PostZ — drop a track or take; after 30s the community rates it 1–10, and every
  rating you give earns Energy.
• Social ConnectZ — find creators by style and heritage, message, and team up.
• CollabZ & LabelZ — run collaborations and label-style projects with clear terms.
• LessonZ — book lessons or teach your skills (6★+ verified teachers).
• BattleZ — put one post against another; verified 18+ can wager.
• Learn — RapZ, SingZ, and InstrumentZ training with quests and progress.
• An in-app economy of Energy, SpinaZ, and PromptZ rewards your activity, with
  free daily AI prompts on every tier.
• Membership tiers (Premium, StatZ) unlock lower fees, more energy, and the
  SpecZ marketplace. Founding members lock in 50% off.
• Earn SpinaZ by watching rewarded ads (AdZ) or completing offers (OfferZ).

Create an account or sign in with Google, GitHub, or Apple. You can view content
without an account, and delete your account anytime.
```

**App icon**: `store/play-icon-512.png` — 512×512 PNG (wordless neon handshake mark; text-free so it stays legible at launcher size).
**Feature graphic**: `store/play-feature-1024x500.png` — 1024×500 PNG (mark + "Music ConnectZ" wordmark on the neon backdrop).
**Phone screenshots**: 2–8, PNG/JPG, 16:9 or 9:16, min 320px side (e.g. PostZ, ProfileZ, MembershipZ, a training screen).
(Optional but nice: 7-inch and 10-inch tablet screenshots.)

**Category**: `Music & Audio` (Application). **Tags**: music, creators, collaboration.
**Contact email**: `support@musicconnectz.net`  ·  **Website**: `https://musicconnectz.net`
**Privacy policy URL**: `https://musicconnectz.net/privacy.html`

---

## Data safety form
Declare that the app **collects and shares** data, encrypted in transit, with an
account-deletion path (`https://musicconnectz.net` → ProfileZ).

| Data type | Collected | Shared | Purpose |
|---|---|---|---|
| Name / username | Yes | No | Account, app functionality |
| Email address | Yes | No | Account, comms |
| Phone number (optional) | Yes | No | Account security |
| User content (posts, media, messages) | Yes | No | App functionality |
| Purchase history | Yes | No | Payments, app functionality |
| App activity / in-app actions | Yes | No | Analytics, fraud prevention, functionality |
| Device or other IDs | Yes | Yes | Advertising (AdMob), fraud prevention |
| Approx. / precise location | Only if you enable it | No | Functionality (discovery) |

- **Payments**: handled by Stripe/PayPal — card data is not collected by the app.
- **Ads**: AdMob + ayeT-Studios collect device identifiers for ads/offers.
- Answer "Yes" to **encryption in transit** and **users can request deletion**.

---

## Content rating questionnaire (IARC)
- Category: **Social / Communication** (has user-generated content + messaging).
- Violence/sexual/drugs: **None** as app-provided content.
- **Users interact / share content**: **Yes** (community posts + messaging).
- **User-generated content shared**: **Yes** — note moderation + reporting.
- **Digital purchases**: **Yes** (memberships, top-ups).
- **Gambling**: real-money betting is **gated behind verified 18+**; if you keep
  it, answer the gambling/contests questions honestly — this likely yields a
  **Teen/Mature** rating. (If you'd rather target a lower age, disable money
  betting for the store build.)

## Target audience & content
- Target age group: **18+** (given wagering + ads) or **13+** if you disable
  money betting. Pick one and be consistent with the content rating.
- **Ads**: answer **Yes, contains ads** (AdMob/OfferZ).

## App access
If any area needs login for review, provide reviewers a **test account**
(username + password) in *App access → All functionality → Add instructions*.

---

## Pre-submission checklist
- [ ] `https://musicconnectz.net/privacy.html` is live (deploy this repo).
- [ ] Signed `.aab` built (see `RELEASE_ANDROID.md`).
- [ ] Icon 512×512, feature graphic 1024×500, 2+ screenshots uploaded.
- [ ] Data safety, content rating, target audience, ads declaration completed.
- [ ] Test account provided under App access.
- [ ] At least one native feature wired (AdMob) to avoid "webview-only" rejection.
- [ ] Internal testing release installed + smoke-tested on a real device.
