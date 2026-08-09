# Content rating (IARC) questionnaire — answers

Answer honestly. A rating obtained by understating content is grounds for
removal later, and the questionnaire is re-run on every content change.

**Category:** Social Networking / Communication (not Music & Audio — the app's
defining feature is people interacting, and picking the softer category is the
kind of thing that gets re-rated).

| Question | Answer | Why |
|---|---|---|
| Violence | No | |
| Sexuality — nudity or sexual content | No | |
| Sexuality — collects/displays orientation | **Yes** | `attracted_to` / `asexual` |
| Profanity | **Yes, mild** | Corey GPT uses mild profanity "when it lands"; member lyrics and posts are uncensored |
| Controlled substances — reference to drugs/alcohol/tobacco | **Yes** | `SubstanceZ` records substance preferences; MerchZ bans paraphernalia but profiles reference use |
| Gambling — simulated or real | No | SpinaZ and Energy are earned and spent, never wagered on chance |
| Users interact | **Yes** | MessageZ, CallZ, GroupZ, CollabZ, comments |
| Users can share their location | **Yes** | Opt-in, for nearby collabs and VenueZ |
| Shares personal info with third parties | **Yes** | AI processors and Stripe — see `data-safety.md` |
| User-generated content, unmoderated | **Yes** | Posts, comments, takes. Declare the moderation you have (`moderation.py`) |
| Digital purchases | **Yes** | Subscriptions, PromptZ, SpecZ |

**Expected rating:** Teen / 12+ on the strength of user interaction, UGC and
mild profanity — **unless** you keep the orientation and attractiveness surfaces
open to minors, which pushes it to Mature 17+ and puts you under the Families
policy at the same time. See the decision in `data-safety.md`.

**Ads:** the app has AdZ and OfferZ. If those serve third-party ads, say so in
the Play Console "Contains ads" declaration — it shows as a badge on the
listing, and omitting it is a common enforcement trigger.
