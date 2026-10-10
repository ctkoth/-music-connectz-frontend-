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


## The escrow window was never on the screen, and PartnerZ is what put it there

`auto_release_days` has been in every deal `CollabZ.jsx` renders since the tab
was written, and **no screen ever read it.** So a member funded a deal — the
most expensive button in the app — told the amount and not the days: not how
long their money sits, and not when their own last chance to dispute it shuts.
The cost of funding is the amount AND the window, and only half of it was on
the control.

`EscrowWindow` states both, before the Fund button rather than after.

It is also the only place being somebody's **PartnerZ** is visible.
`auto_release_partnerz` says whether the window was shortened because the
payers and payees have finished work together before; without the sentence, a
deal releasing four days sooner than the card beside it reads as a bug rather
than a reward. The backend's CLAUDE.md has the rule and why it is a benefit
rather than a payout — the short version is that a 🍥 stipend for holding a
status is farmable and a faster escrow between two people is not, because a
faker owns both wallets.


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

## ZodiacZ bonuses: the gain, before the thing that earns it

`SignBonus.jsx` sits under the birthday field in ProfileZ, because the sign is
set there and that is where somebody finds out what it's worth. It is the
**gain** half of the cost/gain rule, and the half that gets forgotten: a price
found out by paying it is a bill, and a reward found out by accident is a
coincidence — and a coincidence changes nobody's behaviour, which is the entire
point of a nudge.

It computes nothing. The sign, both amounts, what each half asks for and WHICH
TAB you go to are all `/api/economy/signbonus/`. A client that knew Leo was
worth 20 🍥 would be the second place that number lives, and the "20 free
prompts" paragraph above says how that ends.

Three deliberate choices:

- **All twelve are shown**, behind one toggle. A member can only check their
  birthday isn't earning them less than somebody else's by seeing the rest, and
  "trust us, it's fair" is not an answer to that.
- **No birthday renders a door, not an error.** No sign means no bonus, and the
  panel says so with the control that fixes it — `spotlight("birthday")` lands
  on the field one line up.
- **A failed fetch renders nothing at all.** An empty bonus panel reads as a
  broken feature; absent, it reads as one that isn't switched on — which is
  what a 500 on that endpoint actually means.

### Two zodiacs, one card component

A birthday gives a member **two** bonuses — a star sign (the month) and a
Chinese animal (the year) — so `MineCard` and `AllGrid` each render either,
and the two cards sit in an equal two-column grid. That is a design decision
rather than a shortcut: the whole claim this feature makes is that all
twenty-four are worth the same, and a layout that made one the headline would
be arguing the opposite underneath copy that says otherwise. Two renderers
would also be two places the design can drift.

`EMOJI` holds all twenty-four marks in one map, which works for the same
reason the server's single `sign` column does: the two zodiacs share no name.

`mine_animal` is a key the server grew AFTER this screen shipped, so an older
API answers `undefined` and the panel renders one card instead of two. That is
the correct degradation and it is why the animal half is read defensively
while the star-sign half is not.


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

## FunnelZ offers: the panel decides nothing

`OfferPanel.jsx` sits above the feed in PostZ — where every member lands after
signing in, because an offer nobody scrolls to is an offer nobody got. It
renders **nothing** when the server has nothing true to say, so on most visits
it costs zero pixels.

It is small because it decides nothing. Who sees which offer is entirely
`/api/economy/offerz/funnel/`. A client that knew a free member should be
shown the Premium ladder would be the second place that targeting rule lives,
and the two would disagree within a year — the same reason a tier number is
never typed into a screen, applied to WHO rather than HOW MUCH.

Three things it does do, each one of the server's rules made visible:

- **The price sits on the button**, in ember, beside the CTA, before it is
  pressed. A promotion is where it is most tempting to lead with the gain.
- **The X is real.** Dismissing posts to the server and the offer never comes
  back. It is optimistic locally, because the alternative is an X that appears
  not to work for as long as the round trip takes, on the one control whose
  whole job is making the thing go away — and a failed write leaves it hidden
  for the session rather than punishing the member for our outage.
- **The CTA lands on the CONTROL** via `goToSpot(tab, target)`, never a plain
  tab switch.

A failed fetch renders nothing and says nothing. An offers panel is the one
surface where a visible error is strictly worse than silence: the member did
not ask for it, so telling them it failed is an interruption about an
interruption.

An amount of `0` in a gain line means "there is a gain but it is not a number"
— a streak kept, a price that is a percentage. The emoji still renders so the
member can see which resource is involved; inventing a figure to fill the slot
would be the substance rule's failure case with a promotion attached.

### The owner's half lives in FunnelZ, and a failure there IS worth saying

`OfferCatalog.jsx` is the other end of the same feature, mounted under the
join funnel in `FunnelZ.jsx`. The member panel is capped at three and shows
only what is true for the person looking; this shows **every** offer including
the ones that never fire, each with the `why` the server now sends.

The two sit on one screen on purpose. Measurement says where people stop; the
catalogue says what the platform does about it — and split across two tabs
nobody ever looks at both, which is the only way either number means anything.

One deliberate inversion of the member panel's rule: **a failed fetch here
says so out loud.** The owner went looking for this, so silence would read as
"there are no offers" rather than "the request failed". The member never asked
for their panel, which is why that one stays quiet.

This also closed a gap worth remembering: the offer engine shipped with its
only surface inside PostZ, so the feature had no tab of its own and there was
nothing for the owner to pin.

### The icon registry can name a file that was never drawn

`soundcloudengagementz.png` was registered in `ICONS` pointing at a neon SVG
that **did not exist**, so it 404'd and fell back to the MCZ logo — silently,
which is by design (`IconImg` falls back rather than showing a broken image)
and is therefore the kind of thing nobody reports. If a tile looks like the
logo, check `public/icons/` before assuming the registry is wrong.

Its glyph is in `tools/make-neon-icons.mjs` like every other one — **edit the
glyph there, never the generated SVG.** SoundCloud's own identity is a cloud
made of waveform bars, so the bars trace the cloud silhouette rather than a
cloud being drawn around them. Deliberately NOT a copy of their trademark:
using a service's mark to say which service a tab talks to is ordinary
nominative use, but a pixel-accurate logo implies a partnership we do not
have. The accent is `C.ember` (#ff5500), which the palette already held and
which happens to be SoundCloud's own orange.


## A call to a helper nobody imported is a dead button, and nothing here caught it

`src/apps/BossTake.jsx` called `track(...)` in four places and imported it in
none. `startRec` fires it BEFORE `getUserMedia`, so pressing **Record** threw
`ReferenceError: track is not defined` and stopped — no mic prompt, no message,
nothing moved. `submit` fires it one line after `setBusy(true)`, so **Send it
to the coach** was a spinner that never ended. That is the whole trial: a
visitor could neither record nor send, on the one screen a stranger ever sees.

It shipped in the commit added to *measure* why that screen wasn't converting,
and it stood for four days. The funnel read 13 people opening the trial and 1
getting a score, and the missing line is a large part of the answer.

**Nothing in this repo could have caught it.** There is no ESLint config, and
Vite builds with esbuild, which does not resolve free identifiers — an
undefined global is a runtime error by design, so the bundle is valid and the
button is not. `npm run build` was green the entire time.

`src/imports.test.mjs` is the check that would have. It is deliberately not a
linter: it takes the names each shared helper module EXPORTS, and for every
source file that CALLS one of those names, asserts the file imports it or
declares it. Comments are stripped first — half the comments in this codebase
name the helper they explain, and a test that cries wolf is a test somebody
deletes. It runs in `npm test`.

It found a second one immediately: **`BattleZ.jsx` called `uploadWork()`,
`hasBlobs()` and `primaryMedia()` and imported none of them**, so entering a
battle threw at the same point. Both are fixed. If you add a helper module
whose exports move between files, add it to `HELPERS` there.

Two things worth taking from it beyond the fix:

- **A tracking call is not free.** These four sat outside the `try` blocks
  around them, so an analytics line took the feature down with it. Measurement
  goes inside the guard, or after the thing it measures.
- **A silent dead button is the worst failure this app can ship.** No error, no
  console message a member would report, and a screen that looks fine. It is
  found by somebody trying the product, or by a test, and nobody was trying the
  product.

## Eleven funnel kinds were being fired at a closed set that rejects them

The recorder story above ("a client typo measures zero instead of measuring
wrong") happened again, and the audit that found it found **eleven** at once.

`track()` POSTs to `/api/auth/funnel/`, which checks the kind against the
server's `FUNNEL_KINDS` and answers **400** to anything else. That is the right
design. But `track()` is fire-and-forget with a `.catch(() => {})`, so from
inside this app a rejected kind is indistinguishable from a recorded one:
nothing red, nothing in the console, and the number the owner reads is a
confident zero.

The eleven, and what happened to each:

- **Five were wanted and were added to `FUNNEL_KINDS`** — `onboard_habit`,
  `onboard_skip`, `onboard_prefs`, `oauth_linked`, `oauth_link_fail`. The
  funnel ended at "account created", and an account that never finishes
  onboarding is a row rather than a member; the OAuth pair is the only way
  anybody would learn the "I already have one" link had broken *again*, since
  the client deliberately swallows that failure so a member is never blocked
  by it.
- **Six were deleted at the call site** — three in `NotificationsPanel.jsx`,
  three in `SoundzPanel.jsx`. Engagement telemetry from a signed-in member on
  a table whose whole promise is that it is a browser with no account and is
  never joined against Users. They cost a 400 per press and measured nothing.

Three things came out of it that are worth more than the fix:

- **`src/funnelkinds.test.mjs` mirrors the server's list** and scans `src/` for
  `track("x")` / `step("x")`. It also mirrors the `why` slug lists — a `why`
  outside `_WHY` / `_MIC` / `_BLOCKED` is dropped the same silent way, leaving
  a row that says a take failed and cannot say why.
- **`npm test` named each test file, so a new one did not run.** `funnelkinds`
  passed locally and was absent from the suite; the count stayed at 34 while a
  third test was added. It is a glob now (`"src/**/*.test.mjs"`), because the
  list was the same trap one level up — and a test that does not run is not a
  test, which is the exact subject of the section above it.
- **`FunnelEvent.kind` is `varchar(20)`.** Four of the five new names arrived
  longer (`onboarding_preferences_confirmed` is 32), so they are terse now to
  match the rest of the list. Django's system check refuses the model outright,
  which means that one would have failed the build rather than shipped quietly
  — the loud failure, for once.

A closed set catches a typo and **cannot catch an omission**: a kind the server
has never heard of and a kind it simply has not been told about look identical
from the client. That is what the mirror test is for.

## The trial door: five coaches nobody could find, and a recorder that led with a permission prompt

`TrialTake.jsx` hardcoded `{ singz: "SingZ", rapz: "RapZ" }`. The backend
mounts **seven** — GuitarZ, BassZ, KeyZ, DrumZ and ViolinZ each had a working,
scored, no-account coach that nothing linked to. Five doors, built, that no
visitor could find and that the funnel could not show as a drop-off, because a
step nobody can reach never appears as one. The list comes from
`GET /api/economy/trialdoorz/` now, which reads it off the mounted routes; the
two-door `FALLBACK` is for a failed fetch, not a second list.

On the trial only, **Upload a clip is the primary control and the mic sits
beside it.** A visitor's first move was a browser permission prompt, from a
site they had never heard of, usually on a phone, before being given anything
— and a file they already have skips the one step nobody has to say yes to. A
member's recorder keeps the order it had; they are already past that.

A failed take renders a **card with the next move**, not only a red line. It
never invents a partial score: a made-up number at the exact moment somebody is
deciding whether any of this is real is the substance rule's worst case.

`BossTake`'s `step()` fires the funnel's own kinds (`try_record`,
`try_mic_denied`, `try_attach`, `try_send`, `try_failed`, `try_scored`) and
**only on the trial** — a member's recorder is not a step on the way to having
an account, and counting both would put K-Oth's own takes in the number that
says whether strangers get a score.

## A number that only goes up is not progress

A member sent a 3:05 take and watched **"Scoring your take… 853s"** on a
spinner that could not end. The backend's CLAUDE.md has the full arithmetic —
the short version is that one request could legally run for 39 minutes, and
853s is the ACTIVE-poll loop one tick from the end of its own worst case.

The client's share of that was two things:

**`api.js` had no timeout of any kind.** No `AbortController`, no `signal`.
`fetch` with no signal waits exactly as long as the other end is willing to,
which was forever. It is bounded now, and deliberately bounded LONGER than the
server's own `COACH_BUDGET_SECONDS`, so a server that answers in time is
always the one that decides and this only fires when nothing answered at all.

**The panel showed a rising second count**, which cannot distinguish "working"
from "hung" — the single thing the person watching needs to know. It is two
phases now, told apart because they fail differently and only one of them can
honestly show a percentage.

### Uploading is measurable, so it gets a bar, a percent and an ETA

`fetch` **cannot report upload progress.** It has no equivalent of
`xhr.upload.onprogress`, and a streaming request body needs HTTP/2 plus duplex
support that is not dependable — so a screen built on `fetch` can show a
spinner and literally nothing else while 40MB goes up. That is most of what
853 seconds felt like from the member's side: the thing they were watching had
no idea whether anything was moving.

So the multipart path is XHR. It is the older API and it is the one that can
answer *how far, how fast, how much longer*. Pass `onProgress` to `api()` and
the request switches transport.

Three things in that meter are load-bearing:

- **The rate is measured over a trailing window**, not since the start. A link
  that begins fast and dies would otherwise keep reporting its opening average
  and count down to an arrival that is not coming. There is a test that stalls
  a connection and asserts the estimate gets WORSE.
- **`etaSeconds` is null until there is a real sample.** A number computed
  from the first 200ms is wrong by an order of magnitude, and **a wrong ETA is
  worse than none, because people plan around it.**
- **The bound is STALL, not total.** Getting this wrong would have replaced
  one bug with another: the free tier allows a 100MB take, and 100MB on a
  2 Mbps phone link is **six and a half minutes of entirely healthy
  transfer**. Any total generous enough for that cannot catch a dead
  connection; any total tight enough to catch one kills real uploads from
  exactly the members most likely to be on a phone. So while bytes move it has
  all the time it needs, and it gives up when nothing has moved for 45s —
  which is also the only thing the member can tell apart from outside.

### Scoring is NOT measurable, so it gets no fake bar

The model takes as long as it takes and reports nothing on the way. Inventing
a percentage there would be the substance rule with a progress bar attached.
It shows the **ceiling** instead — `coach_budget_seconds`, from the server —
so the line reads `01:02 of up to 01:40`. A wait with a stated end is one
somebody sits through; an open-ended one is one they abandon, which is exactly
what 853 seconds was.

A timed-out request carries `timedOut`, which `failReason` maps to the
`timeout` funnel slug — counted apart from `network`, because a dropped
connection is the member's link and an unanswered request is ours, and those
need opposite fixes.

## The trial door said no to the wrong people, and boasted about the wrong number

A second audit, asking what stops a stranger getting a score rather than what
stops us measuring one. Three things, and all three cost real visitors.

**1. The free take was counted per IP ADDRESS, not per person.** Mobile
carriers run CGNAT — thousands of subscribers behind one address — so the
first person on that carrier spent the take for all of them, and the rest were
told *"You've already had a free take"* about one they never had. Most
visitors arrive on a phone. It is counted per BROWSER now, so `BossTake` sends
`anonId()` on the trial GET **and** the POST — the same id `track.js` already
keeps, because a second id generated here would be a second visitor. The GET
matters as much as the POST: a door that reports availability it will not
honour a moment later is worse than one that says no up front.

**2. `address_busy` is a fourth "no", and it gets its own sentence.** The copy
never phrases it as something the visitor did, because they did not do it and
cannot fix it — it names the connection, says it is common on mobile data, and
offers the account, which genuinely is the answer. It is also its own
`try_blocked` slug, so the funnel can stop counting it as `already_used`.

**3. An unscorable take used to burn the free take.** Silence, the wrong file,
room noise — the coach listens, finds no performance, and that still spent the
one take they came for. Server-side fix (`TrialTake.scored`), but worth knowing
here: the retry a member makes after "no performance here" is now a retry that
works.

### The stats panel was showing strangers our conversion rate

`TrialTake.jsx` rendered `/api/trial/public/stats/` under the heading **"What
members do"** as three percentages. Those percentages were the JOIN FUNNEL'S —
landing → trial → scored → account. At the numbers that produced it, a visitor
deciding whether to try would have read *"Tried → Scored 5%"* and *"Scored →
Registered 0%"*, presented as a reason to sign up.

It never actually rendered, which is the only reason that never shipped in
front of anybody: the path is `/api/economy/trial/public/stats/`, so the call
404'd, and the `.catch(() => {})` meant nothing said so. The endpoint behind it
was a 500 anyway.

Both are fixed, and what it renders changed: **counts, never rates** — takes
scored, and how many instruments have a coach. A conversion rate is a fact
about our door, and it belongs in FunnelZ where the owner reads it. `enough` is
the SERVER's call, and below it the panel renders nothing at all, because "3
takes scored" is worse than silence — the same rule `pct: null` follows one
section down.

## FunnelZ shows the three rates first, and who was on the other end

The server has computed a per-channel breakdown since `?src=` shipped and
**FunnelZ never rendered it** — the data existed and the screen did not. It
does now, beside three more things:

- **The headline.** Landing → trial, trial → scored, scored → account, pinned
  above the eleven step rows. Which of the three doors is shut is the whole
  decision; reading it off the rows means arithmetic every time, which is how a
  funnel gets looked at once and never again. Each carries BOTH counts — 100%
  of two people is not a working funnel, and a bare percentage cannot say so.
  A `pct` of `null` renders as `—`: nobody reached the top of that step, which
  is an empty measurement and not a 0%.
- **The screen.** Phone, tablet or desktop, from `deviceShape()` in
  `useScreenShape.js` — measured from width and `pointer: coarse`, never the
  user agent, same as everything else in that file. The trial opens with a mic
  dialog, and a permission cliff on a handset is not one on a laptop.
- **Who joined.** Genders and age bands off `Profile`, deliberately NOT part of
  the funnel rows: a funnel row is a browser with no account, so it has no age
  and no gender, and attaching either would break the promise that nothing
  there is joined back to a person. `unset` is a row rather than a rounding
  error, and the account total travels with the split.

## The signup form found out the username was taken by submitting

`check-username/` has existed the whole time, behind `IsAuthenticated`, and
therefore unreachable from the only screen that needs it — so the way you
learned a handle was taken was to fill in the entire form and press the
button. It is open logged-out now, for the same reason `rulez` and
`trialdoorz` are, and `Register.jsx` asks **on blur**: one request when they
move to the next field, no debounce to get wrong.

Two things it renders, and both are the server's:

- **The rule, before a handle is picked.** The response carries `rule` whether
  the answer is yes or no, so the field states "3-20 characters: letters,
  numbers, and underscores only" up front rather than only after somebody
  breaks it. It is seeded by one blank check on mount.
- **The refusal, unreworded.** It is the same `username_problem` the register
  endpoint refuses with, so the inline note and the submit can never disagree
  about why.

A failed check renders nothing and blocks nothing — they press the button and
the server decides, exactly as before this existed.

## Every number on the signup screen was typed into it

`Register.jsx` had **"3 scored takes/day"**, **"5 scored takes/day"**, **"2x
faster Energy"** and both referral amounts in its copy: the tenth place a tier
number lived, on the screen where being wrong costs the most. They come from
`/api/economy/tiers/` now, which grew `daily_prompts`, `energy_per_hour` and a
`join` block because it served upload and storage limits and not the allowance
the screen was actually selling on.

Three things worth keeping:

- **The "2x" was already wrong.** Energy is `reach ÷ divisor` with a floor,
  and reach is 0 until an external account is verified — so everybody reading
  a SIGNUP page is on the floor, where it is 2 and 6 ⚡/hour. 3x. The copy
  understated the thing it was selling, to the one audience that is by
  definition on the other number.
- **"Advanced analytics" and "Priority support" were on the Premium card and
  neither exists anywhere in the codebase.** A signup page selling two
  features that were never built. Gone, replaced by what the ladder actually
  ladders.
- **The welcome bonus is finally stated.** `SIGNUP_WELCOME_SPINAZ` is paid on
  every registration and was named on no screen — the gain half of the
  cost/gain rule, which is the half that gets forgotten. A reward found out by
  accident is a coincidence, and a coincidence changes nobody's behaviour.

The cards render **only** when the fetch succeeded. No tiers means no card,
never an invented figure — same rule the offers panel follows.

## VybeZ searched on every keystroke, and wore another tab's icon

Two things, and the first is the expensive one.

**`useEffect(() => search(), [search])` with `search` a `useCallback` over the
filter values** — and three of those filters are TEXT INPUTS. So typing "25"
into age-min fired two full member searches, and filling age-min, age-max and
max-km fired seven or eight. That search is the heaviest read on the platform,
and it was measured at **8.3 queries per member** (322 for a 39-member search)
before the backend fix, so a single number typed into a box was ~650 queries.

Debounced at 300ms, with ONE delay for every filter rather than a special case
for the text ones: a toggle answering 300ms later is imperceptible, and two
code paths into one search is how the two come to disagree about what was
asked.

**And it rendered `social_connectz.png`** — the identical heart the Social
ConnectZ tab four rows above it carries — in the tab strip AND in its own
header. Two tabs wearing one mark, neither saying which was which.

They are different things and the glyph has to say so: Social ConnectZ is the
ROOM (who is here), VybeZ is LOOKING (regions, genders, both zodiacs, sober,
substances, five range gates and distance). So `vybez` is a lens with a heart
inside it, cyan-to-pink against Social ConnectZ's pink-to-cyan — a pair that
belongs together and can never be confused. At tab-strip size the
circle-and-handle silhouette is unmistakable against a plain heart, which is
the only test a 24px icon has to pass. Verified in a browser at 150px and
32px, not reasoned about.

Glyph in `tools/make-neon-icons.mjs` like every other one — **edit it there,
never the generated SVG.**

## LogicZ told members four live features did not exist

The modal renders `built: false` as a gold **"not built yet"**. So a stale
flag does not merely fail to advertise something — it actively tells people
not to go looking for a feature that is right there. That is the
five-trial-coaches failure with a label on it.

Four were wrong: **VybeZ** (listed as "VibeZ", and a mounted tab with its own
route), **PersonalitieZ** (live in ProfileZ, with its own `/test` route), and
**Freestyle** and **Battle Cypher** (the server accepts all three battle
kinds, BattleZ offers them in a picker, and both have drawn icons).

**`tab` had been in the payload since `_app` was written and this screen never
read it.** So the modal listed apps and gave a member nowhere to go — the
cross-pollination rule broken on the one screen whose entire job is telling
somebody what this app has. A built row with a tab is a button now. An unbuilt
one never gets a link, because a door to a tab that cannot do the thing is
worse than no door.

## VybeZ gives the member search its first caller, and PersonalitieZ is one filter

`GET /api/economy/members/` — regions, genders, both zodiacs, sober,
substances, five range gates and distance — **had no caller anywhere in this
app.** Implemented, working, reachable only by typing a URL. Same shape as the
five trial coaches nothing linked to: built, and invisible.

`VybeZ.jsx` is its surface. It is a screen before it is a feature.

`PersonalitieZ.jsx` is four declared axes (I/E, N/S, T/F, J/P), set in ProfileZ
and filtered from that one search — which is why it is a shared component and
not part of VybeZ. `MembersView` is THE member search, so a filter added there
is one CollabZ, BattleZ, VenueZ and MessageZ get for free; a personality field
that only worked in the dating screen would be the fourth copy of a profile
filter within a year.

Four things not to soften:

- **Every axis is a THREE-state control.** Pressing the side you are already
  on clears it. "Hasn't said" has to be reachable, and a member who taps the
  wrong one and cannot get back to blank has been given a personality by the
  interface.
- **The axes, labels and slot order come from `/api/economy/personalityz/`.**
  Nothing about them is typed into a screen — a client splitting the letters
  itself would be the second place the slot order lives.
- **Neither side is better, and the copy says so.** It is a declaration, not a
  score, and it never moves a rating or a skill level. No type nicknames and
  no personality descriptions: Myers-Briggs is somebody's trademark, and this
  stores what a member told us rather than publishing a theory about them.
- **The "nobody matched" line is the SERVER'S**, rendered unreworded. An empty
  grid means either nobody matches or nobody has said, and only the server
  knows which — on a field this new it is nearly always the second.

Cards hand off through `MemberName`, which already opens the profile modal and
prefills a MessageZ compose. A second implementation of "open this member" is
the one that drifts.

## The recorder audit: five ways a take dies, and what each one used to say

The trial recorder was audited end to end after a camera take and a mic take
both failed on the same screen. Five separate defects, and the common thread
is that every one of them reported a cause that was not the cause.

**1. Every `getUserMedia` failure was "access was refused."** The catch
discarded the error. `mediaError()` names them now, because they need
opposite answers:

| `err.name` | What is actually wrong |
|---|---|
| `NotAllowedError` / `SecurityError` | genuinely blocked |
| `NotFoundError` | there is no mic/camera on this device |
| `NotReadableError` / `TrackStartError` | **another app is holding it** — Zoom, Teams, OBS, another tab |
| `OverconstrainedError` | OUR constraints are impossible here |
| — | no `mediaDevices` at all → usually a non-https origin, not the browser |

The two that mattered most were `NotReadableError` and `NotFoundError`: both
sent somebody off to re-grant a permission they had already granted, forever,
while the real cause went unmentioned. `OverconstrainedError` is ours to fix
rather than report, so it retries once with plain settings before saying
anything.

**2. A recording that captured nothing became a take.** `onstop` attached
whatever it had, including an empty Blob, and the send then uploaded zero
bytes — which on the trial door cost the visitor the one free take they came
for, to learn nothing. Empty is refused at the recorder now, and `submit`
refuses a zero-byte blob from the file picker too.

**3. The player said `0:00 / 0:00` on a good take.** A MediaRecorder WebM
carries no Duration in its header — it was written as a live stream — so the
element has nothing to read. Somebody staring at 0:00 cannot tell that from a
recording that genuinely captured nothing, which is the difference between
"send it" and "this is broken". The real length and size, which the recorder
already counts, are printed under the player with a line saying the 0:00 is
the file's header rather than their take.

**4. Chromium changed what it records, and nobody noticed.** `bestMime` put
`audio/mp4` second, from a time when no Chromium build could record it and
the entry existed for Safari. Chromium can now, so it won the list — and
asking for bare `audio/mp4` lets the browser choose the codec, which it does:
`audio/mp4;codecs=opus`. Opus inside MP4 is legal, unusual, and not a pairing
this pipeline had ever been fed. The order now puts `audio/webm;codecs=opus`
first and names Safari's codec explicitly instead of leaving it open.

**5. No `onerror` on the MediaRecorder at all**, so a recorder that died
mid-take said nothing.

### It was verified in a browser, not reasoned about

Headless Chromium with `--use-fake-device-for-media-stream` records real
audio and video through the exact `bestMime` order that ships. That is how
the `audio/mp4;codecs=opus` switch was found — it is not visible in the
source. The takes it produced are committed in the backend as
`apps/economy/testdata_takes/` and its `RealBrowserRecordingTests` posts all
three at the live trial endpoint, so a future browser change fails a test
instead of a member.

That run also corrected a belief: Django's multipart parser strips
`;codecs=…` into `content_type_extra` before a view sees it, which
`gemini_mime`'s docstring had claimed it did not.

## The trial says NO before you perform, not after

`available`, `already_used`, `configured` and `cap_reached` have been in
`GET /api/<key>/trial/` from the start and **nothing ever read them**. So the
door showed a stranger a recorder, let them do a take, and refused it on Send.
That is the cost/gain rule broken in the most expensive way available, because
the thing they spent was a performance.

`blocked` renders the specific reason above the recorder and hides the
controls. A null `price` is a failed fetch, not a refusal, and blocks nothing.

The failure card underneath leads with the **server's** sentence now. Its
first version mapped every 5xx to "the coach is down at our end, send the same
take again" — wrong advice for a 502 "the audio was silent" and a flat
contradiction of a 503 "free takes are all spoken for today", while a 429 got
"try a shorter clip" when the real answer was that an account lifts the cap.
The server already knows which it is; the card's job is the next move, not a
second opinion about the cause.

## BodieZ on Play: the BodieZ-only shell is the product, so keep the music platform out of it

`standalone/bodiez/` is BodieZ with sign-in and nothing else, on its own host, wrapped
by the `bodiez` Android flavor in the backend. The listing says "a workout log", and
the shell has to be one — that is the whole reason it is not `/bodie` on the main site.
Everything in `src/auth/` is SHARED with the main site, which is how this went wrong:
the BodieZ build's signup screen still said "post your work... and get paid for it",
promised +15 🍥, showed a Free/Premium ladder for an app with nothing to buy, and then
asked a new member how often they practise singing. `VITE_STANDALONE` turns each of
those off (`Register.jsx`). **Anything added to a shared auth screen needs a `STANDALONE`
answer**, or it ships inside a fitness app.

- **Deleting an account has to be possible from inside the app.** Play requires it for
  anything that lets you sign up. The main site does it in ProfileZ; this shell has no
  ProfileZ, so `DeleteAccount.jsx` is its own control (same `DELETE /api/auth/me/`),
  with what goes stated before the button. It says the awkward part first: ONE account,
  so it deletes the Music ConnectZ account behind it. `public/delete-account.html` is the
  web page Play also asks for.
- **The privacy policy now names BodieZ and its health information**, and every sentence
  in it about BodieZ was checked against the code by independent agents trying to refute
  it before it was published. The first draft did not survive: it said "three" movement
  answers (the screen asks five), omitted soreness and free-text notes, said "we do not
  show it to other members" with no exception for the workout summary a member posts or
  sends themselves (and a PostZ post is public by default), and — worst — promised
  "limited records (for example, transaction records)" were kept after deletion, when
  every money table cascades with the member. **A privacy sentence is a claim about the
  code; check it like one.** The checks that earned their keep: grep every reader of the
  data, grep every `on_delete`, and ask what the delete path leaves behind.
- **Deleting an account has to take the files, and has to say what it does NOT do.**
  The rows cascaded and the bytes did not (`apps/accounts/erasure.py` now removes them
  after the delete commits), and `apps/economy/stripe_cancel.py` cancels Premium, StatZ and
  auto top-up billing at Stripe FIRST, refusing the delete if it can't (the account is
  not deleted, the member is told, and the BodieZ screen shows the server's sentence).
  The screen, `delete-account.html` and the policy all state that, and that the rest of a
  paid period is not refunded — change one and change all three. The main site says it too:
  ProfileZ's danger zone and confirm, and every DupeZ control that deletes an account
  (`BILLING_NOTE`, beside the owner's Approve and in both confirms). It is stated
  unconditionally rather than read from the account, because the cancel is a no-op when
  there is nothing to cancel and a per-card field would be one more query on a screen
  that lists every duplicate.
- **Listing numbers are quoted, not read.** `play/bodiez/listing/full-description.txt`
  carries "60 of 90" and "37 of 90 have a demo clip". They are right today. The backend's
  `tools/count_adaptive_exercises.py` recounts them.
- **The same `/login` serves both** the main site and, through `VITE_STANDALONE`, the
  BodieZ build. On the MAIN site, a logged-out `/login` still shows "Download for Android
  (.apk) — sideload build" inside the Play-installed Music ConnectZ app. That is a
  separate Play-review risk for the main listing (an app promoting an off-Play install of
  itself) and is not fixed here.

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


### Corey's fixed numbers — do not change without him saying so

- **StatZ character limit: UNLIMITED.** Never a number. It was set to 5,000
  for a day and Corey reversed it with "never change statz char limit from
  unlimited". `test_limits.test_statz_is_unlimited` and the two
  `test_bio` no-ceiling tests pin it.
- **Premium: $7/mo, $60/yr.** "dont change premiums price from 7/60".
  `test_pricing.test_the_published_numbers` pins it.

A tidier ladder, a margin argument or a "consistency" pass is not a reason
to move either. Ask him first.

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

**Corey's second standing instruction: apply your recommendation, don't ask.**
When you have weighed something and have a view, take it — the recommendation
IS the decision. It does not license skipping the weighing, and it does not
cover a choice that is genuinely not the code's to make (a price, a name,
whether a real credential gets stored). Decide, ship, and say plainly what you
decided and what it cost, so somebody who disagrees can reverse it.

---

## RapZ renders what the backend sends; it doesn't invent dimensions

RapZ is a rapper's coach, and the five dimensions it scores are **Flow 🌊, Timing ⏱️, Breath 🫁, Clarity 🔍, and Delivery 🔥**. A rapper can opt in to lyricism scoring too. All of these dimensions come from `apps/economy/instruments.py` on the backend, served by the coach endpoint.

**The labels come FROM THE BACKEND.** `src/apps/BossTake.jsx` and the coach display do not know what "Flow" means — they ask the endpoint. The endpoint sends back: `{ flow: "Flow 🌊", timing: "Timing ⏱️", ... }`. If a new dimension is added to the coach without updating that dictionary, the frontend renders a blank label and a number with no meaning. That is a silent failure, which is why `test_instrument_routes` on the backend guards both directions: every key the coach produces, the dictionary declares.

**The caveat is also from the backend.** `GET /api/rapz/coach/` or whichever instrument returns a `caveat` field that says what one take can show and what it cannot. RapZ's caveat is: "Flow, timing, breath, clarity and delivery are what one take can show. Consistency, health and goal match come from your history, not a single clip — they're on your progress screen."

A take score without that caveat is misleading. A member seeing "Consistency — 7/10" after their first verse believes they are inconsistent, which is false — consistency is a week's worth of takes, not one clip. The caveat is what stops that misreading.

### Style Match rides alongside the five dimensions

The model scores Style Match at the same time it scores Flow and Timing — it is what the model already hears when it listens, not an extra call. The response includes both a **number** (0-100, so it can trend and be recommended) and **prose** ("your delivery is methodical, which is closer to old-school than Trap").

Neither alone is enough. The number without prose is decoration; the prose without a number cannot be trended or recommended on. Both together answer what the take does *right now* rather than inventing a fixed rating.

### Register is finally on the screen

A rap take arrives with a detected register: Bass, Baritone, Tenor, etc. RapZ's profile in `instruments.py` now declares `range_label: "Your register"` and `ranges: VOCAL_RANGES`, the same eight-class system SingZ uses. A member who took both apps gets told the same range by the same model — because pitch is pitch — and can see whether their singing register and rapping register match.

This was always detected. It was just invisible because the screen had nowhere to show it. Now it goes somewhere.

---

## Every score must have a description served alongside it — this is a frontend rule too

The backend sends dimension labels and a caveat. The frontend's job is simple: **render them visibly, not in a distant help page or a tooltip that appears on hover.** A number with no description beside it is a number with no meaning.

When rendering scores:

- **The label is beside or above the number.** "Flow 🌊 — 7/10" is complete; "7/10" alone is noise.
- **The caveat is visible on the same screen.** A member should not have to search to find out whether a score is from one take or many. The cost/gain rule applies: the description is part of the score's price, and it must be up front.
- **Prose explanations (like Style Match's insight) stay with the number.** A score that says "good" with no reason why teaches nothing. A score that says "good because you're hitting the beat tight" teaches the member what to keep doing.
- **If a dimension goes missing (blank label from the backend), render nothing or render an error.** Don't invent a label, don't show a bare number. A blank label means the frontend and backend disagree about what dimensions exist, which is a test failure, not something to hide.

The substance rule applies to the screen too: *could a member improve their performance without seeing these descriptions?* No. They would not know what improved. So the descriptions are not optional, not tucked away, not a nice-to-have. They are the other half of the score.

### Why the score response stays keyed, never free-form prose

A coach endpoint that returns free-form text — "Your flow is great, your timing is tight, your breath control needs work" — looks good on the surface. But that prose cannot be:
- **Trended** — no way to compare "great" to last week's "improving"
- **Recommended** — no way to say "members with high Delivery get 50% more plays"
- **Stored in history** — no way to show a member's Delivery progression
- **Surfaced at a glance** — no way to sort or filter by dimension

The keyed response with one number per dimension is what makes scores useful. The prose rides alongside (Style Match includes it), but it never *replaces* the number.

When building a new coach or scorer:

1. **Define the dimensions in `instruments.py`** — `_RAP`, `_DRUMS`, whatever. One dictionary, one source of truth.
2. **Return a keyed response** — one key per dimension, always a number, always present.
3. **Include prose explanations** as a separate field if they add insight (Style Match), but never as the dimension itself.
4. **Serve a caveat** that says what one clip can and cannot show.
5. **Test that every key in the dictionary is scored and every key scored is declared** — `test_instrument_routes` does this on the backend.

A score with no description is a broken feature. A description with no number is a broken feature. Both together are the feature.

## Sign-in works differently on every build, and `appShell()` is where that starts

`src/externalAuth.js` names the build: `web`, `inapp` (Instagram / TikTok /
Facebook / Snapchat / LinkedIn browsers), `android` / `android-old` (APK with
or without the Browser+App plugins) and `desktop` / `desktop-old` (the .exe,
told apart by the `MCZDesktop/2` UA marker `desktop/main.cjs` adds).

- **Google and Apple never run as popups inside an app.** Google refuses
  embedded browsers (`disallowed_useragent`, Electron included) and Apple's
  popup has nothing to return to. In `android`/`desktop` they go to the
  device's real browser with `ID_TOKEN_AUTH` (identity token in the URL
  fragment — no client secret), and come back through the app's deep link:
  `intent://…` for Android, `net.musicconnectz.app://` for Windows, chosen by
  the `app.` / `desk.` state prefix. `callbackParams()` reads the fragment so
  the token survives the handoff.
- **On the Windows app every provider goes out to the system browser** — one
  path is easier to keep right than a list.
- **`inapp` and the `-old` builds get a sentence, not a dead button**: open in
  Chrome/Safari (with a copy-link), or update the app.
- Setup this needs: Google's OAuth client must list
  `https://musicconnectz.net/oauth/callback` under **Authorized redirect URIs**
  (the popup only needed the JavaScript origin), and Apple's Services ID needs
  the same URL as a return URL.

## RetakeRemind: the trial's way back

`components/RetakeRemind.jsx` sits under the trial score: "email me this",
with the server's schedule sentence (score now, day 3, day 7, then nothing)
on the control before it is pressed. It renders nothing unless the trial
response carried `remind.ready` — no mail configured server-side means no
field, never a fake "sent". Fires `try_email`; returns from the emails arrive
as `?src=retake_d3` / `retake_d7`. Backend CLAUDE.md has the rules.

The "Already happening here" stats panel on the trial waited for a `headline`
key the server never sends, so it could not render even past the threshold.
It reads `enough` now.

## Focus mode: the coach is the product, for now

`src/focus.js` is one list — the seven coaches plus what surrounds them
(PostZ, ProfileZ, MessageZ, BattleZ, the practice tools, MembershipZ,
OnboardZ, LogZ, and BodieZ because Corey uses it). The ToolZ home leads with
those and puts the thirteen categories behind "More apps"; the ⊞ drawer does
the same. **Hidden, never removed:** every tab still routes, search in the
drawer looks through all of them, and a member's own pins and most-used apps
still land in their dock. Most of what is hidden is a two-sided room that is
empty until there are people in it, and an empty room tells a newcomer
nobody's here. `FOCUS_MODE = false` restores the old menus exactly.
`focus.test.mjs` fails if a focus key is not a real tab.

## Big media lives in `ctkoth/mcz-media`, not here

The 30 BodieZ demo clips made this repo a 130MB checkout that a slow
connection could not finish cloning. They are served from
https://ctkoth.github.io/mcz-media/ now (re-encoded to ~20MB total), and
`src/media.js` is the one place that maps the backend's stored
`/exercise-demos/<file>.mp4` onto that host. `vercel.json` and
`public/_redirects` send the old path there too, for tabs on an older bundle.
**A new video goes in mcz-media, never in `public/`** — `media.test.mjs`
fails if `public/exercise-demos/` comes back.

## BodieZ: weight before reps, no spinner on the digits, and the server says what is possible

- Weight comes first, then reps (and sets), on the logger and the routine
  designer. A number box here is typed into: `.neon-input[type=number]` hides
  the browser spinner, which was drawn on top of the digits ("17" read as "1").
- `AccessPanel` asks three things (can't stand/walk, can't use arms, can't use
  legs). It **decides nothing**: every exercise arrives flagged `accessible`,
  pickers get the filtered list, and names for old sessions use the full one.
  Never re-derive the rule client-side.
- BodyMap shows the backend's `coach_rating` (progress against the member's own
  earlier best) with its `coach_why`, the per-lift numbers and `rating_caveat`
  on the same card. `null` renders "not rated yet", never a 0.

## SubstanceZ: pick how often for every substance, and read the list rather than retype it

ProfileZ used to carry its own substance list and a hidden tap-cycle (once =
sometimes, twice = often, again to clear — nothing said so, and "daily" could not
be said at all). Each substance is now a row with an explicit Rarely / Sometimes /
Often / Daily choice and the scale's meaning printed once above it. The
substances and the scale come from `/api/economy/substancez/` via
`src/substancez.js`; a failed fetch says so and leaves what the member already
declared untouched (it is held in state, not derived from the list).

- A `yes` (picked before frequency existed) shows an amber "choose how often"
  and is never rounded to a frequency. On a member card it reads "frequency not
  said", not the raw word.
- The SubstanceZ app shows the split per substance ("1 rarely · 2 daily · …"),
  a frequency filter on the member list, and each card's frequency for the
  searched substance only.
- VybeZ's "steer clear of people who use…" sends `substances=` and
  `substance_max=`; the server decides who that hides. Members who haven't said
  how often can't be counted under a limit, and the screen says so.
- **Reset dependent state in the handler that changes the thing it depends on,
  never in an effect that follows it.** `MetricZ` reset its frequency filter in an
  effect, which fired every member search twice (the first with the previous
  substance's filter) and let a stale reply overwrite the right list.

- **Open to members by default, and said before anything is declared.** The
  SubstanceZ block in ProfileZ states who can see it (the server's own level for
  that member, from `me.visibility`, with a link to change it) above the picker.
  A default that is not stated is a disclosure by accident. Never assume the
  level here; read it.
- **Sober by choice is a tile in the SubstanceZ app** (`key: "sober"`, served in
  `options`), with a count and a member list like any substance. It has no
  frequency, so the per-substance split, the frequency chips and "how often not
  set" must be skipped for it — keyed off `"my_frequency" in o` and
  `by_frequency`, never off the key name alone.

## BodieZ supersets: link by hand for free, the Coach's choosing is StatZ's

`src/supersets.js` is the whole client-side model: a superset is a `group` label
on two ADJACENT routine rows, and `linkWithNext`, `unlink`, `normalize` and
`blocks` are the only code that makes or reads one. `valid_groups` on the server
is the rule; this mirrors it, so a pair the screen draws is a pair the server
keeps. Any edit that could pull two rows apart (reorder, delete, add in between)
goes through `normalize`, which drops a label that no longer has its partner —
never guess at a pairing.

- **Linking by hand is in the designer's own rows and gated by nothing.**
  `PairWithCoach.jsx` is what is gated, and it says so on the control before
  anything is pressed, with the free way beside it. The modes, what each means
  and the example all come from `/api/economy/bodiez/pair/`; the screen decides
  nothing about who is paired with whom. Nothing is saved until Save routine, and
  Undo restores the rows from before.
- **In a session, a pair is one block.** The rest clock holds while the first half
  of a pair has been done and the second has not ("go straight to the Fly") so it
  never says rest in the middle of a superset. The "next" marker only appears in a
  pair that is under way: three untouched pairs would each say it, and a marker on
  three rows at once marks nothing.
- **Rest alerts (`useRestAlertPrefs`) are the sample's or StatZ's.** The
  preference is the member's and survives the sample ending; `allowed` gates the
  effect, so a lapse locks the control without erasing what they chose. The
  notification only fires while the page is hidden — on screen, the beep is
  enough. **A locked phone pauses a page, and the copy says that**; "keep my screen
  on" is the one thing here that keeps the clock running.

### A countdown reaching 0:00 is not the sample being over

`useStatzTrial` floors the seconds left, so the display reads 0:00 for the last
second while the server still has it. The first version refetched the moment the
display reached zero, was told the sample was still active, and — with nothing to
ask again — left the banner up and every feature unlocked until somebody navigated
away. Found by expiring a real sample in a browser, not by reading the code. The
sample is OVER when the clock passes the server's end time; the screen locks on
that moment without waiting for a fetch to agree, then asks the server to confirm
and asks again (a few times, two seconds apart) if its clock has not caught up. A
lock that depends on a response arriving at the right millisecond is a lock that
sometimes does not lock.

## RoutineZ: every routine is editable, and so is every logged workout

The RoutineZ tab in `BodieZ.jsx` holds the Coach builders (moved out of the
Coach tab so a built routine lands, open to edit, right under them), every
routine with its server `source` label, and the logged workouts. The designer
renames and re-notes too, so a Coach-built routine becomes fully the member's.
`PastWorkout` doubles as the editor of a logged workout (`editing` prop); a
repeated set drops its `id`, or an edit reads it as the same row twice. The
muscle builder's "Fit in N min" trims round-robin across muscles and says how
many it left out — never a silently shorter routine.
