# Music ConnectZ frontend — working notes

## The cost/gain paradigm (Corey's rule — applies to every surface)

**Every action that moves a resource states its cost and its gain UP FRONT,
before the member commits to it.** Never after, never only in the result.

Format: a red minus for what leaves, a green plus for what arrives, each with
its resource emoji.

```
−1 🏷️   +8 ⚡
```

- **Red / minus** — what it costs you → `text-mcz-ember`
- **Green / plus** — what you get → `text-emerald-300`
- Always the **resource emoji**, never a bare number
- **Up front.** A price discovered by paying it is not a price, it's a bill.

### Resource emoji — import from `src/resources.js`, never retype the character

| Resource | Emoji | Notes |
|---|---|---|
| Energy | ⚡ | mana; regenerates hourly at reach ÷ tier |
| SpinaZ | 🍥 | coin; earned by rating, referring, AdZ/OfferZ |
| PromptZ | 🏷️ | prepaid AI credits; the daily free allowance is separate |
| Money | 💵 | real cash balance |
| XP | ⭐ | SkillZ progression |

### In practice

- The cost goes **on the button or immediately beside it**, not in the result
  panel. If the member has to press it to learn the price, it's wrong.
- Free actions that *earn* still show the gain — `+1 ⚡` on a rating is the
  whole reason anyone rates.
- Say whether a **failed** attempt is charged. Usually it should not be.
- Two-sided rewards show both sides (a referral is `+300 🍥` / `+100 🍥`).

### Known violations, not yet fixed

- *(none open on this list.)* CallZ was here for the whole life of this file —
  no live 1:1 surface existed, LessonZ's "CallZ" was a delivery method on a
  booking priced the same as remote or in-person, so there was no per-minute
  rate to state because there was no call. It ships now: `apps/economy/callz.py`
  publishes the callee's rate, the caller's balance and the minutes they can
  afford BEFORE anything rings, the running cost is on screen during the call,
  and the receipt matches the quote. The rate is snapshot at ring so it cannot
  move under a call in progress.

Previously listed here and since fixed — BossTake's "Send it to the coach"
(`Cost` component, price beside the button), OCC chat, DirectZ craft, and
KeyConnectZ translate all state cost before the control that spends it now.
Don't take this list as exhaustive — a surface not named here was never
audited, not cleared. Check the actual button before assuming.

---

---

## Cross-pollination (Corey's crux — applies to everything)

**Nothing is a dead end.** Something created, recorded or noticed in one app
opens in another to edit or analyse. A member should never hit a screen that
shows them a fact and gives them nowhere to take it.

In practice, anything that stores a thing also stores WHERE it came from:

```python
Observation(kind=..., key=..., app_key="singz", target="singz:coach")
```

and every row it serves carries `open_in` so the client can offer the jump.
`goto.js` (`goToSpot(tab, target)`) already lands on the exact control, so the
handoff is one call — not a tab switch that dumps you at the top of an app.

Existing examples to follow:

- OnboardZ steps link to the control that completes them, not just the tab.
- A Boss Take is scored in SingZ and its dimensions come from that app's
  profile, so the same recorder serves RapZ without inventing scores.
- LogZ rows carry the reason a resource moved, so a balance leads back to
  the action that changed it.
- A post carries `destinations` — every app that can do something with it, what
  each still needs, and what it costs before it is spent. `apps/economy/crosspost.py`
  is the one list; SingZ and RapZ take the post itself as a Boss Take, so a
  finished track can be coached without being uploaded a second time.

When adding a screen, ask what a member would want to DO with each row, and
give them the link. A read-only surface is usually an unfinished one.


## WidgetZ: a link opens ON the screen, and the tier buys where, not whether

`<a target="_blank">` on a member's links was the dead end the cross-pollination
rule exists to close — the member leaves, the screen they were reading is behind
a tab, and comparing three of somebody's links meant three trips out of the app.
`WidgetBoard.jsx` tiles them instead, as many as the screen holds.

The server decides how each one opens (`apps/economy/widgetz.py`), and the
difference is **who wrote the URL being framed**:

- **player** — the id is read out of the link and the PROVIDER'S own embed URL
  is built server-side. Nothing a member puts in a link reaches the frame, which
  is why players need no tier gate.
- **internal** — one of our own addresses. Never framed; the real screen opens.
- **page** — an arbitrary site framed whole. **StatZ, and only for a URL the
  malware scan cleared** (Corey's call, both halves). A framed page borrows this
  app's chrome, which is what makes a framed login form worth building for
  somebody who wants one.
- **outside** — everything else, in a new tab, which is what every link does
  today. **This is the part that keeps the ladder rule intact:** no member loses
  a link, the tier decides where it opens.

Two things not to soften:

- **An unscanned link cleared nothing.** With no `SAFE_BROWSING_API_KEY` a page
  widget is refused for everyone, StatZ included, and says why.
- **A refused frame and a slow one look identical from JavaScript.** There is no
  detecting `X-Frame-Options`, so the widget never pretends: `may_refuse` puts
  "if this stays blank, open it in a tab" under the frame rather than leaving
  somebody staring at white.

`widgetz.js` classifies by host and by nothing else — it exists so a button can
say what it will do before it is pressed, and must never grow past labelling.
If it drifts from the server list the worst case is an honest "opens in a tab"
tile, which is what the member would have got anyway.

### The screen decides the layout, not a breakpoint

`useScreenShape.js` measures width, height, orientation and `pointer: coarse`
— never the user agent, which lies by design. An 844px landscape phone and an
844px laptop window are the same width and different screens: the phone gets
shorter tiles (it has 390px of height to spend) and one fewer lane than it
technically fits, because a widget a thumb has to aim at needs to be bigger
than one a mouse does. One lane is a stack, so only the focused widget expands
there and the rest collapse to their title bars.

### The +5 ⚡ link reward finally has an honest signal

`/api/economy/link/click/` has paid **+5 ⚡** for a genuine 30-second visit to
another member's link since it was written, and **no live screen ever called
it** — `src/mcz2/` did, and `src/mcz2/` is not mounted. A `target="_blank"`
hands the member to a tab we learn nothing about, so there was nothing honest
to send. A widget is on our screen, so the seconds are counted here (only while
the tab is visible), and the gain is stated on the control **before** it is
pressed. The line afterwards reports what the server ACTUALLY paid, never what
the client hoped — the daily cap and the once-per-link-per-day rule are still
the server's.

## One person, one account, and the rule is read not retyped

**Every member gets one account. Duplicate accounts are not accepted.**

`rulez.js` reads the rule from `/api/economy/rulez/` and `RuleNote.jsx` renders
it — on the signup form, which is the one screen where somebody is about to
make a second one, and above DupeZ, which is the thing that enforces it. The
copy is never typed into a screen, for the same reason a tier number never is:
one stated in three places reads three ways within a year, and a rule people
are held to has to be one they were actually told. **If the rule can't be
loaded, nothing renders** — a half-stated rule is worse than an unmentioned
one, because the half somebody read is the half they'll hold you to.

`DupeZ.jsx` is one file for two views because they are two views of one thing.
A member sees only accounts strongly tied to theirs and can close one; the
owner sees every group and decides. The server draws that line — the client
renders whichever answer it was given, and never decides who is an owner.

**Every account shows what a delete would destroy before the button that
destroys it** — posts, uploads, journal entries, 🍥, ⚡ and, in ember when it
isn't zero, 💵. That is the cost/gain rule applied to the most expensive action
in the app: the price of pressing it is that whole list. Money is the one thing
a delete may never destroy, and the server refuses rather than trusting the
screen to have shown it.

The signals are rendered as words — "Same email on a linked sign-in", strong or
weak — never folded into a percentage. A number nobody can check, behind an
action nobody can undo, is the substance rule's failure case at its worst.

## Conventions

- Tier numbers (char limits, prompts, storage) come from the server via
  `limits.js` → `/api/economy/limits/`. **Never hardcode one in copy** — that
  is how the "20 free prompts" figure ended up in nine places and drifted.
- `data-tour="…"` anchors are shared by the guided tour (`Tour.jsx`) and the
  OnboardZ step links (`goto.js`). One anchor serves both so they can't drift.
- Save handlers must report the **real** error. A `catch` that answers "saved"
  on failure is the worst bug class in this app and has shipped twice.
- `src/mcz2/` is the 2.2 reference app and is **not mounted** — changing it
  changes nothing.

## Profile JSON arrives repaired — don't re-implement the repair

`personas` and `links` come off the server already normalized
(`apps/economy/personaz.py` cleans them on write AND on read), so a component
renders `persona.name` and `link.url` without defending against a shape.

One exception, deliberately: `socialData.js`'s `personaName` also recovers a
persona stored as the **printed form of a dict** —
`"{'name': 'Independent Artist', 'emoji': '🎤', 'skills': []}"` — because that
one ran against whatever a browser had cached and whatever is in localStorage,
which no server deploy can reach. It is the same "repair on read" the file
already does for the object form, and for the same reason.

If a persona ever renders as machine noise again, it is a caching or a
localStorage row, not a live API response.

## A deploy breaks every tab that is already open, and lazy loading is why

Every route is `lazy(() => import(...))` and Vite hashes each chunk by its
contents (`InstrumentZ-B8NXpgMc.js`). **A deploy rewrites every one of those
hashes.** A tab opened before the deploy is still holding the old `index.js`,
which names chunks the server no longer has — so the next tab the member opens
requests a file that is gone.

It does not arrive as a 404. `vercel.json` ends with
`{ "source": "/(.*)", "destination": "/index.html" }` (and `public/_redirects`
does the same for the Pages host), so an unmatched path answers **200 with
`index.html`**, and the browser refuses it:

    Failed to load module script: Expected a JavaScript-or-Wasm module script
    but the server responded with a MIME type of "text/html"

surfacing as `TypeError: Failed to fetch dynamically imported module`.

**Code-splitting is what made this reachable.** One bundle could be stale, but
never *partially* stale — everything the session would ever need was already in
memory. Now every tab switch is a fresh request against a server that may have
moved on, and the failure lands on whichever app was opened next. It reads as
"SingZ is broken" when nothing is wrong with SingZ.

`src/chunkError.js` handles it:

- **`lazyRoute(loader)`** wraps every `lazy()` in `App.jsx`. It retries the
  import once — the identical error is what a dropped connection produces, and
  a blip deserves a second attempt — then reloads, returning a promise that
  deliberately never settles so nothing renders in the half-second before the
  page goes.
- **Reload at most once per 30s**, recorded in `sessionStorage`. A permanent
  failure must not spin; a member still here for the *next* deploy still gets
  recovered from that one.
- **Never reload when `navigator.onLine === false`.** Offline produces this
  exact error, and reloading there lands the member on the browser's own error
  page — strictly worse than the app saying the connection dropped.
- **Unreadable storage counts as "already tried."** A browser with site data
  blocked gets the message, not a loop.

And in `ErrorBoundary`: **`setState({ error: null })` can never fix a stale
chunk.** React caches the rejected `lazy()` promise, so "Try again" re-threw
the identical error instantly, forever — the button was a dead end for the one
failure a member is most likely to hit. It reloads for a chunk error now, and
the copy says *"A new version shipped"* rather than blaming the app.

Still worth doing host-side, untested from here so not shipped: make a missing
`/assets/*` **404 instead of falling through to the SPA shell**. A 200
`text/html` for a `.js` URL is also something a CDN can cache, which turns one
member's stale tab into everybody's.

## Deploys

**Both repos auto-deploy from `main`, so merging to `main` IS the deploy.**
Develop on a branch; the merge is the deliberate act, not a button afterwards.

The two deploy independently, so a frontend change can still go live before the
API it needs. When a screen depends on a new endpoint, **merge the backend
first** — an endpoint may exist before anything calls it, but never the reverse.

Render runs `migrate` on every backend deploy, so a backend merge migrates
production unattended. Worth knowing when you're waiting on one.

**Corey's standing instruction: merge without asking.** Don't stop at a green
branch to request permission — verify it (the repo's own checks, and for the
backend the full suite plus a column-width check on any new migration), then
merge and push. The merge is still the deliberate act; the deliberation is the
verification, not a question. Backend first whenever a screen needs a new
endpoint.
