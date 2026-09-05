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
| Energy | ⚡ | mana; refills hourly at reach ÷ tier, toward a daily ceiling |
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

## ViewZ — 👁️ on every page, drawn like a track in a DAW

Every page here could be looked at by a thousand people and said nothing about
it. `ViewZ.jsx` puts an eye on the header (this app, today, plus who is in it
right now) and a read-only one on every post card, and both open the same
panel: **twenty-four lanes across a day**, bars, floor-aligned.

Why a timeline instead of the number:

- "128 views" is a receipt. A lane shows the spike when it got shared, the flat
  overnight stretch, and whether the attention is still arriving or already
  over — every one of which is something a creator would act on, and none of
  which is in the scalar. It reads as a track because that is the one chart
  this audience already knows how to read.
- **`watching` is the engaging half, not the total.** A total describes
  something that already happened. "3 people are here right now" changes what
  somebody does next.

Three implementation rules that are not decoration:

- **Only the TAB beats.** `useViews` heartbeats for `tab:<key>`; a feed card
  gets `ViewsBadge`, which beats at nothing. Thirty cards each holding a
  heartbeat is thirty requests every half minute, and a card scrolling past is
  an impression, not a view — counting it would inflate the one number a
  creator is going to trust.
- **A hidden tab is not a viewer.** The beat checks `document.hidden`, which is
  the difference between "watching" meaning watching and meaning "left a tab
  open in another window".
- **The client never decides what a view IS.** The server counts one viewer per
  day, refuses the author's own looks, and returns the sentence explaining it;
  this screen prints that sentence rather than inventing a claim of its own.

`recordView(target)` is the one-shot for a deliberate open — the public post
page, which is where a stranger arriving on a shared link gets counted. That
page's own header comment used to say views were left out because "a number
anybody can inflate by reloading is worth less than no number". The objection
is answered now rather than waived: reloading moves nothing.

## A tab switch can carry what to DO when it lands

`goToSpot(tab, target)` scrolls to a `data-tour` anchor and flashes it. That is
the whole of it — it cannot type in a search box, choose a filter or set a sort
order. So "click ⚡ in the header" had nowhere to go: LogZ opens on Everything,
and the member is reading SpinaZ, money and XP rows after asking one question
about one resource.

`openTo.js` is the missing half. `goToView(tab, view)` names the tab AND the
view; `useOpenView(tab, apply)` applies it in the destination. Two details are
what make it survive a lazy route:

- **The view is remembered as well as announced.** The destination chunk is
  still downloading when the event fires, so an event alone would be shouted at
  nobody. `useOpenView` reads the pending value on mount.
- **It is taken exactly once.** A member who then picks a different filter must
  not have their choice undone by a stale intent on the next remount.

`member.js` (`openMember(username)`) is the same idea for the profile card:
`MemberProfile` is mounted once behind `memberKey` in App, so before this only
the two things holding that setter could open anybody — every other screen that
named a member had a username on screen and nothing to do about it.

## Every header stat opens the thing it is about

They were all `<span>`s. A member looking at "⚡ 240 Energy" who wanted to know
where it came from had to know LogZ exists, find it among thirty apps, open it
and then set a filter — for a question they asked by *looking at the number*.
A read-only surface is an unfinished one, and the header is the most-looked-at
surface in the app.

Members → the directory. Online → the directory, most recently active first.
⚡ and 🍥 and 🏷️ → LogZ already filtered. Tier → MembershipZ. Sign → ProfileZ.
`Balance.jsx` is the same control anywhere else a BALANCE is shown (ProfileZ,
AdZ). **Prices are deliberately left alone** — "−1 🏷️ to run this" is a cost
stated up front, and putting a navigation under the thing somebody is about to
press is a different bug.

While fixing this: the prompts tooltip read `free 1 · premium 5 · statZ 10`,
and Free had been **3** for weeks. A tier number retyped into copy, drifting,
exactly as the convention warns. `/api/auth/stats/` publishes
`promptz_daily_ladder` now and the copy reads it.

## Social ConnectZ was showing six people who do not exist

`NovaBeatz`, `SopranoSol` and four more were a hardcoded `SEED` array, and
`/api/economy/members/` — the real directory, with filters, gates, distance and
badges — had **no caller anywhere in the mounted app**. A discovery surface
that discovers nobody is the worst version of the read-only screen: not just a
dead end, a dead end with strangers painted on the wall.

It reads the real endpoint now, and the viewer sets the order. The orders come
off the server WITH the results, for the same reason tier numbers do — a picker
offering a sort the server cannot do is a control that quietly does nothing.

## Swipe is a first-class gesture, and it never wins

`swipe.js` gives the shell left/right between apps, the dock and every sheet a
downward flick to dismiss. Three rules keep a gesture layer from being an
irritation, and all three are in the file:

- **Never the only way.** Every swipe has a visible control that does the same
  thing — the ‹ › chevrons, the ✕, Escape. A gesture nobody discovers is a
  feature nobody has, and a gesture somebody *cannot make* is a wall.
- **It loses to the content.** A swipe starting on a scroller, a slider, a text
  field or an audio scrubber belongs to that thing.
- **Listeners are passive and nothing calls `preventDefault`.** This can never
  be the reason the page stops scrolling.

## Every app has to explain itself, and `npm test` holds it to that

The ⓘ in the header is the closest thing MCZ has to a tutorial, and it is the
first thing somebody presses on an app they have never seen. **Four apps
shipped without one** — RoyaltieZ, CallZ, GameZ, SoundZ — and answered "A Music
ConnectZ app." to the member most in need of an answer. Nothing caught it,
because a missing key in an object literal is not an error in JavaScript; it is
a blank.

`tools/tabs.test.mjs` reads App.jsx and holds `TABS` and `TAB_ABOUT` to each
other: every tab has a description, no description outlives its tab, and none
of them is short enough to be a name and an emoji. It is a text scan rather
than an import on purpose — App.jsx pulls in React, thirty lazy routes and a
stylesheet, none of which a sentence needs.

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
