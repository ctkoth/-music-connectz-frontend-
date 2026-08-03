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

### Resource emoji — already established, do not invent new ones

| Resource | Emoji | Notes |
|---|---|---|
| Energy | ⚡ | mana; regenerates hourly at reach ÷ tier |
| SpinaZ | ✦ | coin; earned by rating, referring, AdZ/OfferZ |
| PromptZ | 🏷️ | prepaid AI credits; the daily free allowance is separate |
| Money | 💵 | real cash balance |
| XP | ⭐ | SkillZ progression |

### In practice

- The cost goes **on the button or immediately beside it**, not in the result
  panel. If the member has to press it to learn the price, it's wrong.
- Free actions that *earn* still show the gain — `+1 ⚡` on a rating is the
  whole reason anyone rates.
- Say whether a **failed** attempt is charged. Usually it should not be.
- Two-sided rewards show both sides (a referral is `+300 ✦` / `+100 ✦`).

### Known violations, not yet fixed

- **BossTake** — "Send it to the coach" spends a prompt with no warning; the
  cost only appears in the response as `cost_cents`.
- **AI surfaces generally** (translate, OCC chat, Gemini image/video).
- **CallZ** — the other member's hourly rate must be visible pre-connect.

---

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

This repo auto-deploys; the backend does **not** (Render, manual). A frontend
change can therefore go live before the API it needs — sequence accordingly so
the UI never promises what the backend can't yet do.
