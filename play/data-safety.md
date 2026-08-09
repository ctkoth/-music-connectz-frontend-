# Data safety form — answers

Play's Data safety section is a **declaration you are held to**, not a
description. If the form says you don't collect location and the app asks for
it, that is a policy violation regardless of what the privacy policy says. What
follows is drawn from the actual model fields, not from memory of the feature
list.

---

## ⚠️ Decide these two before you submit

### 1. Sexual orientation is collected

`Profile.attracted_to` and `Profile.asexual` are stored on every member who
fills them in. Under Play's User Data policy this is a **sensitive category**.
It is legal to collect and legal to declare — but it raises review scrutiny, it
must be disclosed, and it must be genuinely optional.

**Options, best first:**

- **(a) Keep it, declare it, make it visibly optional.** Nothing to build if the
  field is already skippable — confirm the UI never requires it, and that a
  member can clear it later. Declare under *Personal info → Sexual orientation*.
- **(b) Drop the field.** If it exists for partner-matching you aren't shipping
  yet, removing it now removes a whole category from the form and a whole class
  of review question.

### 2. Teen-safe mode and attractiveness ratings are in the same app

The RapZ screen shows a **"Teen-safe · SkillZ training"** badge, so under-18s are
an intended audience. The app also has **attractiveness ratings**
(`AttractivenessRating`, and the Sexy badge keyed to a rating median above 8),
plus the orientation fields above.

Minors being rated on looks by adults, or having orientation collected, is a
**Families policy** problem. It is not fixed by disclosing it.

**Options, best first:**

- **(a) Gate the whole app 18+.** Set the target age to 18+ in Play Console and
  make sure signup enforces it. Simplest, and it costs you the teen market.
- **(b) Hard-wall the adult surfaces for teen accounts.** Attractiveness rating
  and orientation are unreachable — server-side, not just hidden — for any
  account under 18. Then teen-safe means something enforceable and you keep both
  audiences.
- **(c) Remove attractiveness ratings.** Also removes the Sexy badge and its
  ⚡×2, which you specifically asked for, so probably not.

**(b) is the one I'd build**, because the app already has a tier/age concept and
because "teen-safe" is currently a label rather than a boundary. Say the word
and I'll wire it.

---

## Data collected — declare all of these

Everything below is **collected** (leaves the device) and **linked to the
member's identity**, since it hangs off their account. None of it is sold. No
data is shared with third parties for advertising.

| Category | Type | Collected | Purpose | Optional? |
|---|---|---|---|---|
| Personal info | Name / username | Yes | App functionality, account management | Required |
| Personal info | Email address | Yes | Account management | Required |
| Personal info | User IDs | Yes | App functionality | Required |
| **Personal info** | **Sexual orientation** | **Yes** | App functionality (PersonaZ / matching) | **Optional** |
| Personal info | Other info (substances, zodiac, traits, languages) | Yes | App functionality (profile) | Optional |
| Location | Approximate location | Yes | App functionality (nearby collabs, VenueZ) | **Optional — opt-in** |
| Location | Precise location | Yes | App functionality (distance filtering) | **Optional — opt-in** |
| Financial info | Purchase history | Yes | App functionality, payments | Required for purchases |
| Photos and videos | Photos | Yes | App functionality (avatar, posts, cover art) | Optional |
| Photos and videos | Videos | Yes | App functionality (posts, takes) | Optional |
| Audio | Voice or sound recordings | Yes | App functionality (Boss Take scoring, posts) | Optional |
| Audio | Music files | Yes | App functionality (posts, releases) | Optional |
| Messages | Other in-app messages | Yes | App functionality (MessageZ, DirectZ, GroupZ) | Optional |
| App activity | App interactions | Yes | Analytics, app functionality | Required |
| App activity | Other user-generated content | Yes | App functionality (posts, ratings, bug reports) | Optional |

### Security practices — answer Yes to all three

- **Data is encrypted in transit** — Yes. HTTPS end to end.
- **Users can request data deletion** — Yes. See below.
- **Committed to the Play Families Policy** — only if you take option (b) above.

### Deletion

Play requires **two** routes and most people only build one:

1. **In app** — `POST /api/economy/account/delete/` exists. Make sure it's
   reachable from a settings screen, not just the API.
2. **On the web, without installing** — a page anyone can reach to request
   deletion. This does **not** exist yet; see `checklist.md`.

---

## Third parties to declare

| Service | What reaches it | Why |
|---|---|---|
| Anthropic (Claude) | Prompt text, OCC conversation content | AI features |
| Google (Gemini) | Boss Take audio/video, image prompts | Take scoring, image/video generation |
| Stripe | Payment details | Subscriptions and cash-out |
| Render | All backend data (hosting) | Infrastructure |
| Modal | Code executed in OCC Run | Sandboxed execution |

None of these receive data for advertising. All are processors acting on
instruction — say so if the form asks.

**Worth naming in the privacy policy:** a Boss Take is audio or video of the
member's voice or face, sent to Google for scoring. That's the disclosure most
likely to be checked, and `privacy.html` should say it plainly.
