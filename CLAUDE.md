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

### Getting the quote from the server

Every AI endpoint that charges answers `GET` with what THIS member pays for
THIS run — cost, whether a free daily prompt covers it, what it falls back to,
and whether a failed run is charged. Read it and render it; never compute a
price over here, and never hardcode one (see Conventions).

`BossTake.jsx`'s `Cost` component is the reference. Two fields decide the copy:

- `free_today` — true only where the run actually spends a daily prompt. It is
  **false** on image, video and translate even when `daily_remaining` is high,
  because those don't draw on the allowance. Render `daily_remaining` alongside
  so the member sees "you have prompts left, they don't cover this one" instead
  of assuming the opposite.
- `charged_on_failure` — say it either way, and print
  `charged_on_failure_note`, which is the half that makes it believable. Video
  is `true`: it's billed when Veo accepts the job, and the generation runs long
  after the request returns.

`pays_from` (`free_today` / `promptz` / `mixed` / `balance` / `short`) saves the
client re-deriving which wallet the money leaves. `allowance_ladder` is only
present where a tier up actually buys more of this — absent means don't upsell.

### Known violations, not yet fixed

- **OCC chat** — the prompt is charged with nothing stated first. The `Price`
  component in `OCC.jsx` is the ⚡ cost of *posting* a work, not the prompt the
  chat spends, so the screen looks priced and isn't. Waiting on the backend
  `GET`.
- **CallZ** — the other member's hourly rate must be visible pre-connect.
  Nothing connects a call yet, so this is a rule for whoever builds the screen.

### Fixed

- **BossTake** — `Cost` renders the server's quote beside the send button.
- **Translate / Gemini image / Gemini video** — the endpoints quote themselves
  now. No surface calls them yet; when one does, it renders the quote.

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

## Deploys

**Both repos auto-deploy from `main`, so merging to `main` IS the deploy.**
Develop on a branch; the merge is the deliberate act, not a button afterwards.

The two deploy independently, so a frontend change can still go live before the
API it needs. When a screen depends on a new endpoint, **merge the backend
first** — an endpoint may exist before anything calls it, but never the reverse.

Render runs `migrate` on every backend deploy, so a backend merge migrates
production unattended. Worth knowing when you're waiting on one.
