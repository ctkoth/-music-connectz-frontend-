# Google Play listing kit — Music ConnectZ

Everything Play asks for on the **Main store listing** page, written to its
character limits. Copy each block straight in.

App ID: `net.musicconnectz.app` · already set in `capacitor.config.json`.

Assets in this folder:

| File | Play field | Size |
|---|---|---|
| `app-icon-512.png` | App icon | 512×512 |
| `feature-graphic.png` | Feature graphic | 1024×500 |
| `screenshots/01…07.png` | Phone screenshots | 1080×1920 |

Play needs **2–8 phone screenshots**; there are 7. Order them as numbered —
the feed first, because it's the screen that explains the app fastest.

---

## App name (30 characters max)

```
Music ConnectZ
```

*14 characters. Room to spare if you ever want a tagline in it.*

## Short description (80 characters max)

```
Post your music, collab with escrow, and get rated by people who make music.
```

*75 characters.*

## Full description (4000 characters max)

```
Music ConnectZ is where music gets made together — posted, rated, collaborated
on, and released.

POST THE WORK, NOT A LINK
A post carries the whole thing: the song, the music video, the cover art and
the lyrics, all in one. Record straight into the app or attach what you've
already got.

RATED BY PEOPLE WHO ACTUALLY MAKE MUSIC
Ratings open 30 seconds after a post goes up and comments after 60, so nobody
scores a track they haven't heard. Every rating you give earns you Energy.

COLLABZ — THE MONEY IS HELD UNTIL THE WORK LANDS
Start a deal from any post. Each payer's share sits in escrow until they
release it, so a stranger can take the first collab without either side
gambling. Send the file back and forth, version by version — v1 down, v2 up,
and nothing overwrites what came before.

SPLIT BY WHAT PEOPLE THOUGHT YOU DID
A deal can pay out on the agreed worth or on contribution ratings from people
outside the deal. Under three raters it falls back to the agreed split,
because two opinions aren't a mandate to move somebody's money.

BATTLEZ
Open challenges or 1v1, with SpinaZ wagers and community judging. The pot and
the entry are stated before you enter, never after.

DISTRIBUTE WITHOUT RETYPING
A post or a collab already holds the four things a distributor asks for, so a
release fills itself in from them — and tells you what it still needs before
you send it, not after a store rejects it.

OCC — OCULAR CODE CONNECTZ
A coding and creative workspace with tasks, version control and a per-member
sandbox for running code. Everything you make in it can be posted, rated and
commented on like anything else.

KEYCONNECTZ
Translate between 40 languages as you type, and put your own wallpaper behind
the keyboard.

EVERY PRICE UP FRONT
Every action that costs you something says what it costs before you press it —
never after. A price you discover by paying it is a bill, not a price.

FREE, PREMIUM AND STATZ
Free gets you posting, rating, collabs, battles and translation. Premium and
StatZ raise the limits: longer text, bigger uploads, more storage, more daily
submissions, and the AI and sandbox features.

Music ConnectZ is built by musicians for musicians. No label, no gatekeeper —
just the work, the people who can hear it, and a way to get paid for it.
```

*≈2,050 characters — comfortably inside the 4,000 limit.*

## What's new (500 characters max)

```
• A post now carries one of each: song, music video, cover art and lyrics
• Record or upload straight into a post, a collab or a battle
• CollabZ file exchange — download a version, send the next one back
• Distribution fills itself in from a post or a collab
• OCC WorkZ: everything OCC makes can be posted, rated and commented on
```

*≈340 characters.*

---

## The rest of the Play Console

### Store settings
- **App category:** Music & Audio
- **Tags:** Music creation, Social, Collaboration
- **Contact email:** your support address
- **Website:** https://musicconnectz.net
- **Privacy policy:** required — must be a live URL before you can publish

### Content rating questionnaire
Answer honestly; these are the ones that matter for this app:
- **User-generated content: YES.** Members post audio, video, images and text.
- **Users can interact / share content: YES** (comments, messages, collabs).
- **Content moderation:** the app has reporting and blocking — say so.
- **Digital purchases: YES** (memberships, SpinaZ, wallet top-ups).
- **Gambling:** BattleZ wagers use **SpinaZ**, an in-app currency earned in the
  app. Read the wagering question carefully and answer it accurately — if
  SpinaZ can be bought with money, treat that as a paid contest and say so.
  Getting this wrong is a suspension, not a warning.

### Data safety
Declare what the backend actually collects: email, username, profile details,
approximate location **only if the member turns on location sharing**, uploaded
media, and payment data handled by Stripe/PayPal. Say that data is encrypted in
transit and that members can request deletion — the app has an account delete
and export endpoint, so that answer is true.

### Target audience
13+. AdZ is age-gated from the profile birthday, so a 13+ declaration matches
what the code does.

---

## Before you upload

1. `npm run build && npx cap sync android`
2. Build the signed `.aab` — see **RELEASE_ANDROID.md** in this repo for the
   keystore and Gradle steps. **Back up the keystore.**
3. Play Console → Create app → fill the fields above.
4. Upload the `.aab` to **Internal testing** first. Install it on your own
   phone and open every tab before you promote it.
5. Promote to Production when it looks right.

## Re-shooting the screenshots

They're taken from the real built app, so they go stale when the UI changes:

```bash
npm run build
node playkit/shoot.mjs
```

The API is stubbed inside `shoot.mjs` with fixture data, so no server and no
account are needed — but every pixel of UI is the actual app at a 1080×1920
phone viewport.
