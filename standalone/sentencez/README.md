# Sentence ConnectZ, as its own app

`SentenceConnectZ.jsx` with sign-in and nothing else, on its own host. Same
account, same API, same rows as Music ConnectZ — a piece written here is in the
member's recent pieces there. This is a second front door, not a second writer.

```
npm run dev:sentencez      # :5176 — pair with MCZ_API=http://localhost:8000
npm run build:sentencez    # → dist-sentencez/ (static; HashRouter, so any static host works)
```

## What is different from the main site, and why

`VITE_STANDALONE="sentencez"` is how the shared screens know. Anything added to
`src/auth/` or to `SentenceConnectZ.jsx` needs an answer for it.

- **No door to a screen that is not there.** No ProfileZ, PostZ, DistributeZ,
  CollabZ, BattleZ or MembershipZ, so: the persona-gated agreements are left out
  (nothing to add the persona in), "Post it in PostZ" and the use-in-a-release
  control are not rendered, and nothing offers an upgrade. A button to a screen
  that does not exist is the dead button this repo has shipped before.
- **Nothing to buy.** Play's billing rules do not allow selling from inside the
  app, so out of free writes the screen says *they renew tomorrow* rather than
  stating a price it has no way to charge. A member who already holds a paid
  balance from Music ConnectZ still sees the price and spends it.
- **Whose voice is said before the button.** The server serves `voice` per kind.
  Lyrics, captions and posts are K-Oth's register; a resume, cover letter, poem
  or bio is plain, and the three that claim a history may not invent one (see the
  backend's CLAUDE.md).
- **The brief has its own limit**, not a post's 400 characters — a resume cannot
  be written from 400 characters. It is `catalog.WRITER_BRIEF_CHARS`, served, and
  the screen states it while someone types.
- **Delete my account is inside the app** (`DeleteAccount.jsx`), as Play
  requires, and says what goes before the button. The privacy policy and
  `delete-account.html` are the main site's and now name this app.
- **AI disclosure and a way to flag output** are on the screen: "Written by AI.
  Check it before you use it", "What you type is sent to Google's Gemini", and
  *Report this output*, which lands in the owner's moderation queue
  (`POST /api/economy/report/`, item `sentence:<id>`). Play asks an app that
  generates content with AI for in-app flagging.

## Hosting

Static files. Point a host at `dist-sentencez/` — `sentencez.musicconnectz.net`
by analogy with BodieZ's own host. Two things nothing in this repo can do:

1. **Add the host to the backend's `CORS_ALLOWED_ORIGINS`** (and CSRF origins if
   the login uses them) or every request from it is refused.
2. **Create the host and the Vercel/Pages project.** A static project with
   `npm run build:sentencez` as the build command and `dist-sentencez` as the
   output directory.

## Not done

- **No Android wrapper.** BodieZ's is a `bodiez` flavor in the backend's
  `android/`; this is a web build only so far. A third flavor needs its own
  package id, its own `assetlinks.json` on its own host, and Play Console
  listing, screenshots, content rating and Data safety form — which for this app
  must declare that text the member types is sent to a third-party AI service.
- **No per-piece delete.** A piece can only be removed by deleting the account,
  and the policy says so. A delete button on a piece is the obvious next thing.
- **No resume-specific layout or file export.** A resume comes out as plain
  text with a *Save as text* button. A formatted PDF/Word export is a feature.
- The app icons are the supplied Sentence ConnectZ sign, scaled from a 500px
  original. Replace `public/icons/*` with a larger master when there is one.
