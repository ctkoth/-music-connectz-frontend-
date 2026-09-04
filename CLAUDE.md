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

- **CallZ** — no live 1:1 calling surface is mounted yet (LessonZ's "CallZ"
  option is just a delivery method on a booking, priced the same as remote/
  in-person). When a real call feature ships, the other member's rate has to
  be visible pre-connect, same as everywhere else.

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


## KeyConnectZ voice: what a tier may be sold

The keyboard already had the rule written down — **the wallpaper is Premium
because it is decoration, and translate is free because being understood is not
a luxury.** Voice lands on the capability side of that line twice over, so
neither half is gated by tier:

- **Read aloud** is the second half of translate. Giving a Free member the
  Portuguese and charging them to hear how to *say* it sells half a capability
  and teaches them the free half was bait.
- **Speech input** is how you type when typing is the hard part. The members
  who need it most are the least likely to be on the top tier.

What a tier buys is **how many** — clips a day for listening, characters a day
for the server voice — laddered like BossTake's, published by `GET
/api/economy/keyz/` before either button is pressed.

**Read-aloud goes to the device first, always.** `speechSynthesis` costs
nothing, works offline and is unlimited, so `keyVoice.js` asks whether the
handset has a voice for that language and only falls back to the server when
it does not — named apart from `voice.js` (the member's slang/emoji/explicit
tone switches) since the two are unrelated and happened to want the same
filename. That gap is Yorùbá, Igbo, Hausa and Amharic before it is anything
else — which is why the server voice is not sold by tier either. A gate there
would mean English speakers hear their translation free while Yorùbá speakers
pay.

`voicesReady()` exists because `getVoices()` is empty on the first call in
Chrome and fills in later — without the wait, "your phone can't speak Spanish"
gets said about a phone that can.

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
