# App Store age rating — answers (draft)

Derived from `content-rating.md` (the Play questionnaire). Apple's wording changes; where a question here does
not match what App Store Connect shows, answer the closest one **honestly toward the higher answer** — an
understated rating is grounds for removal. Apple computes the rating (4+, 9+, 13+, 16+ or 18+) from these.

## Capabilities
| Question | Answer | Why |
|---|---|---|
| Unrestricted web access | **Yes** | Members post links that open in the in-app browser |
| User-generated content | **Yes** | Posts, comments, takes, battles |
| Messaging and chat | **Yes** | MessageZ, group messages, calls |
| Advertising | **Yes if AdMob/AdZ ships in the iOS build, else No** | see `apple-app-privacy.md` |
| Parental controls | No | none exist |
| Age assurance | **Yes** | stated-age grouping on the server and optional ID check for 18+ features |

## Content descriptions
| Question | Answer | Why |
|---|---|---|
| Medical or treatment information | No | BodieZ is a workout log; no treatment claims |
| Health or wellness topics | **Infrequent** | BodieZ workouts, soreness, accessibility settings |
| Mature or suggestive themes | **Infrequent** | member posts and lyrics are uncensored |
| Sexual content or nudity | **None** | none provided by the app; members' content is moderated by reporting |
| Graphic sexual content | None | |
| Cartoon or fantasy violence | None | |
| Realistic violence | None | |
| Prolonged graphic or sadistic violence | None | |
| Guns or other weapons | None | |
| Profanity or crude humor | **Infrequent** (consider Frequent) | lyrics and posts are uncensored; the AI writer uses mild profanity |
| Alcohol, tobacco, or drug use or references | **Infrequent** (consider Frequent) | the optional substance-use declaration and member lyrics |
| Horror or fear themes | None | |
| Simulated gambling | None | SpinaZ and Energy are earned and spent, never wagered on chance |
| Contests | None | |
| Loot boxes | **No** | |

## Expected result
**13+ to 16+** — user-generated content, messaging, web access and uncensored lyrics drive it. Pick the rating Apple
computes; do not lower it with a manual override.

## Decision worth making: age rating of the whole app
- The orientation field, substance field and looks-related features are walled to adults **on the server**
  (`data-safety.md`), but they still exist in the app. A reviewer who finds them may question a 13+ rating.
- **Safer choice: set the rating to 17+/18+ via the "Age Rating override" if it is offered**, or remove those
  features from the iOS build. The cost is the teen audience, which the Play side already treats as a deliberate
  policy decision (see `data-safety.md`).

## Other App Information answers
- **Primary category:** Social Networking. **Secondary:** Music.
- **Content rights:** Yes, you hold or are licensed for the content (members own their uploads under the terms).
- **Made for Kids:** No.
