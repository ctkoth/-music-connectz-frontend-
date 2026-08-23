# Music ConnectZ — Play release kit

Everything the Console asks for, written out, plus the screenshots. Copy the
blocks, upload the PNGs, answer the questionnaires from §6.

The store copy is in my voice, which means it says what the thing does and what
it costs. No "revolutionise your workflow." Nobody has ever revolutionised a
workflow.

---

## 1. The screenshots

Shot on a Pixel-sized viewport (360×640 CSS at 3×) against the real app with a
real account — not mockups, not a designer's idea of the app. Every number in
them came out of the database.

`store/screenshots/` — **1080×1920 PNG, 9:16.** Play takes 2–8; these are 8, in
the order they should be uploaded. The first two are what most people ever see,
so they are the two that have to do the work.

| # | File | What it shows | Why it's in this order |
|---|---|---|---|
| 1 | `1-open-in.png` | A post with its "Open this post in" panel — Coach it in SingZ, free today, 10 left | This is the whole product in one picture. A track that isn't a dead end. |
| 2 | `2-feed.png` | The feed: real posts, real ratings out of 10 | Proves there's something here and people are rating it |
| 3 | `3-coach.png` | SingZ Boss Take — record, send, get scored | The reason a singer downloads this |
| 4 | `4-membership.png` | Founding StatZ, 50% off forever, $7.50/mo | The money screen, and the offer is genuinely time-limited |
| 5 | `5-profile.png` | ProfileZ — personas, skills, rates | You are a catalogue of what you can do, priced |
| 6 | `6-social.png` | Social ConnectZ — find people by what they play | The connect half of Connect Through Music |
| 7 | `7-collab.png` | CollabZ — escrowed deals with stated terms | The part that separates this from a feed |
| 8 | `8-battlez.png` | BattleZ — a challenge and its leaderboard | The hook that brings people back |

`store/screenshots/alternates/` — login, LessonZ, OnboardZ. Swap them in if a
reviewer wants a different emphasis. **Don't lead with the login shot**: the
first thing in a listing should never be a wall.

Already in `store/`: `play-icon-512.png` (512×512) and
`play-feature-1024x500.png` (1024×500). Those two are required and done.

**Still missing, and only you can make them:** tablet screenshots (7" and 10")
if you tick tablet support. If you don't tick it, Play shows your phone shots on
tablets with a warning on the listing. Ticking it without the assets is worse.

---

## 2. Store listing text

**App name** (30 max)

```
Music ConnectZ
```

**Short description** (80 max)

```
Post a track. Get it rated, coached, collabed on. Nothing you make dead-ends.
```

**Full description** (4000 max)

```
Music ConnectZ is where a track stops being a file on your phone.

You post it. Thirty seconds later the community can rate it 1–10 — real people,
not a like button. Then you take it somewhere: the vocal coach scores it on
pitch, tone and breath and hands you one drill to run. A producer opens it as a
collab with the terms written down and the money held until the work lands. It
goes in a playlist, into a battle, into a release.

That's the whole idea. Nothing you make is a dead end.

WHAT'S IN IT

PostZ — drop the track. Rating opens after 30 seconds so nobody rates a title.
Every rating you give earns you Energy, which is why people actually rate.

SingZ and RapZ — record one take and have it scored out of 10 on pitch, tone,
breath, flow and delivery, with what worked, what to fix, and a drill for next
time. Or send a track you already posted — no uploading it twice.

CollabZ — deals with the worth of each side stated up front and the money held
until it's released. Nobody hands cash to a stranger on trust.

Social ConnectZ — find people by what they actually play, not by follower count.

LessonZ — book a lesson, or teach and get paid for it.

BattleZ — put your work against somebody else's and let the room judge.

ProfileZ — your personas and your skills, each with a price you set.

LabelZ, GroupZ, PlaylistZ, ChartZ, OCC and more, all reading from the same work.

HOW THE ECONOMY WORKS

Energy ⚡ regenerates every hour and pays for posting. SpinaZ 🍥 is earned —
rating, referring, watching a rewarded ad, reporting a bug. PromptZ 🏷️ buys AI
work, and every tier gets free ones daily.

Every button that spends something says what it costs before you press it. A
price you find out by paying it isn't a price, it's a bill. We don't send bills.

MEMBERSHIP

Free works. Premium and StatZ raise your limits, cut your fees and open the
SpecZ marketplace. The first 50 members lock in half price for life.

Sign in with Google, GitHub or Apple. Look around without an account. Delete
your account whenever you like, from inside the app or from the web.
```

---

## 3. Screenshot captions

Play doesn't take captions on screenshots, so these belong burned into the
images if you ever make graphic versions. Keeping them here so the story stays
straight if somebody else does that work:

1. **Nothing dead-ends.** One post, every app that can do something with it.
2. **Rated by people, not a like button.**
3. **Scored on pitch, tone and breath — and told what to fix.**
4. **Founding member: half price, forever.**
5. **Your skills, priced by you.**
6. **Find people by what they play.**
7. **Deals with the money held until it lands.**
8. **Put it up against somebody. Let the room decide.**

---

## 4. Before you touch the Console

`GOOGLE_PLAY.md` in the backend repo has the full walkthrough — account setup,
signing, the TWA build, the 12-tester closed test. This kit is the listing half.
Two things from that doc that block a submission and take real time:

- **Account deletion needs a WEB page**, not only the API. `POST
  /api/economy/account/delete/` exists; a reachable URL for it does not.
- **12 testers for 14 days** if the developer account is Personal rather than
  Organization. Start that clock early — it's the longest pole.

---

## 5. Paying people to use it — read this before you do it

You asked. The honest version:

### What already pays people, today, with no new code

| What | Pays | Where |
|---|---|---|
| Referral | +300 🍥 referrer, +100 🍥 joinee | `models.REFERRAL_REWARD_*` |
| Rating a post | +1 ⚡ each | `social.py` |
| Finishing onboarding | SpinaZ | `ONBOARD_REWARD_SPINAZ` |
| Watching a rewarded ad | SpinaZ, pegged 1:1 to cents | `adz.py`, `rewards.py` |
| Reporting a bug that lands | Bounty in SpinaZ | `BUG_BOUNTY_SPINAZ` |
| Somebody joining your restricted post | +300 🍥 to you | `postz.py` |

So the machinery for rewarding people is built and running. Turn the numbers up
and you have a campaign this afternoon.

### What is NOT built: any way to get money OUT

`money_cents` moves between wallets — collab payments, purchases, the owner's
cut. Stripe is wired for `checkout.Session` (money in), refunds, and
subscription cancels. **There is no `stripe.Transfer`, no `Payout`, no withdraw
endpoint anywhere in the codebase.** SpinaZ is "pegged to cents" in the AdZ
comments, which makes it *look* redeemable. It isn't. Nothing converts it.

That gap matters more than it sounds: a member who earns 1,850 SpinaZ and reads
"pegged to cents" will eventually ask for $18.50, and right now the answer is a
shrug. Either build the exit or stop implying the peg.

### Your three real options

**A — Pay in SpinaZ. Free, works now, zero legal weight.** It's a closed-loop
token. Your only cost is inflation: mint too much and it buys nothing, which is
its own kind of broken promise.

**B — Pay real money. Needs building, and changes what you are.** The standard
path is Stripe Connect: members onboard as connected accounts, you send
`stripe.Transfer`. Roughly a week of work. What comes with it: identity
verification on every payee, US 1099-NEC reporting past $600/yr, and you are now
operating a marketplace that moves other people's money. Talk to an accountant
before the first transfer, not after.

**C — Pay outside the app.** Gift cards, direct transfers, a spreadsheet. No
code, no platform risk, and completely legal today. Unglamorous and genuinely
the right answer for a first 100 members.

### The three that get apps removed

1. **Never pay for ratings or reviews.** Not with cash, not with SpinaZ, not
   with "rate us for 100 🍥". Play bans incentivised reviews outright and it is
   one of the few things they enforce fast and permanently. This is the single
   biggest risk in the whole idea and it is easy to do by accident — a quest
   that says "rate the app" is enough.
2. **Digital goods may have to sell through Play Billing, not Stripe.** You sell
   PromptZ, SpinaZ and memberships. Inside an Android app, digital content
   normally has to go through Google Play Billing and its cut. A TWA pointing at
   your website sits in a genuinely grey area and Google has moved the line more
   than once. **Verify this against the current Payments policy before you
   submit** — if it applies and you ignore it, it's a removal, not a warning.
3. **BattleZ wagering must stay in SpinaZ.** The moment SpinaZ converts to cash,
   wagering on it is real-money gambling: licensing, geo-restrictions, an
   entirely different Play category. `battlez.py` already knows this — the
   money-vote poll measures demand instead of shipping it. Keep it that way
   until somebody with a licence says otherwise.

None of this says don't. It says the in-app currency route is free and ready,
and the cash route is a business decision with paperwork rather than a feature.

---

## 6. Console questionnaires

Answer from these files, already in the repo:

- **Data safety** → `play/data-safety.md`
- **Content rating** → `play/content-rating.md`
- **Checklist** → `play/checklist.md`
- **TWA config** → `play/twa-manifest.json`, `play/assetlinks.template.json`

Flag honestly on the rating questionnaire: user-generated content, user
communication, and — if AdZ ships — advertising. BattleZ wagering is in-app
currency only; say so plainly if asked about simulated gambling.

---

## 7. Test account for the reviewer

A reviewer who can't get past the login screen rejects the app. Give them:

```
Username: (make a real account and put it here)
Password: (and this)
Note: Sign-in is required to post. Content is viewable without an account
      at musicconnectz.net. Account deletion: (your deletion page URL)
```

Do not give them yours. Make one, use it once yourself to confirm it works, and
leave it alone.
