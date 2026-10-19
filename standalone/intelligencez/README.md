# IntelligenceZ, as its own app

Sign-in, a hub, and the four IntelligenceZ screens that can stand on their own, on
their own host. Same account, same API, same rows as Music ConnectZ — a piece made here
is in the member's recent pieces there. This is a second front door, not a second writer.

```
npm run dev:intelligencez      # :5177 — pair with MCZ_API=http://localhost:8000
npm run build:intelligencez    # → dist-intelligencez/ (static; HashRouter, so any static host works)
```

| Tab | Route | Screen | Where the AI runs |
|---|---|---|---|
| Home | `#/` | `src/apps/IntelligenceZ.jsx` — the hub (also the `intelligencez` tab on the main site) | — |
| Write | `#/write` | `SentenceConnectZ.jsx` | Google Gemini |
| Chat | `#/chat` | `OCC.jsx` (the chat and WorkZ) | Anthropic Claude |
| Compose | `#/compose` | `InstrumentalConnectZ.jsx` | Google Gemini |
| Master | `#/master` | `MixConnectZ.jsx` | none — measured signal processing, on the device |

Not here: Video ConnectZ (a fixed price, no free tier — the app cannot sell), FaceZ (it feeds
Video) and Image ConnectZ (not built). The hub lists only what the server marks `in_app`.

## What is different from the main site, and why

`VITE_STANDALONE="intelligencez"` is how the shared screens know (`src/standalone.js`:
`IN_SHELL` is true in any shell, `IN_INTELLIGENCEZ` in this one). Anything added to
`src/auth/` or to one of the five screens needs an answer for it.

- **No door to a screen that is not there.** A child's `goToSpot("occ", …)` to another child
  switches tabs, because the shell answers the same `mcz-goto-tab` event `App.jsx` answers. A
  key the shell does not have does nothing, and the children do not render a door to one.
- **Every screen stays mounted** once opened (`Screens` in `Shell.jsx`) and is only hidden
  when the member leaves it, so checking Chat does not empty a half-written brief or throw
  away a master that took a minute to make. The shell tells a leaving screen with a
  `mcz-shell-leave` event, which Mix ConnectZ uses to stop its A/B preview.
- **Nothing to buy.** Play's billing rules do not allow selling from an app that is not using
  Play Billing, so out of free prompts the screens say they renew tomorrow, and the hub states
  a price only as what a run would cost from a balance the member already holds.
- **The cost is on the screen before the control**, from the server: the hub reads every
  app's price from `GET /api/economy/intelligencez/` and types no number.
- **Delete my account is inside the app** (`DeleteAccount.jsx`), as Play requires, listing
  what goes — pieces, loops, kept replies, saved masters with their audio — before the button.
- **Every screen says what it is.** The line under it (`DISCLOSURE` in `Shell.jsx`) says
  "written by AI" under the three that are, and that no model is involved under Master. The
  hub has a *What leaves your device* panel. *Report this output* is on Write and Chat.
- **Signup says it is one account** with Music ConnectZ, and offers no OAuth, no tier ladder,
  no welcome-🍥 line and no music-habit onboarding.

## Hosting

Static files. Point a host at `dist-intelligencez/` — `intelligencez.musicconnectz.net`, by
analogy with BodieZ. `npm run build:intelligencez` refuses to finish if
`.well-known/assetlinks.json` does not name `net.musicconnectz.intelligencez`. Everything the
host, the Play listing, the Android flavor and the forms need is in
[`play/intelligencez/README.md`](../../play/intelligencez/README.md).

## The screenshots

`seed_screenshots.py` (rows), `make_demo_song.py` (a synthesized 40-second stereo song,
measured at -22.0 LUFS) and `take_screenshots.mjs` (the run) make `play/intelligencez/screenshots/`.
They are reproducible from this folder; what is seeded and what is real is stated in the
Play README.

## Not done

- **No per-piece delete** for Write pieces or Compose loops: they go only with the account,
  and the policy says so.
- **The Chat tab's WorkZ composer still offers a recorder and file attachments** in the
  shell (`OCC.jsx`). See the Play README's BLOCKING note before submitting.
- **The hub's *Recent pieces* door for Write and Compose** switches tabs but cannot ring the
  control: `sentencez-recent` and `instrumental-recent` (the anchors the server names) are not
  on those screens yet. Mix and Chat have theirs.
- **The app icons are the supplied IntelligenceZ sign**, scaled from a 2000px original.
