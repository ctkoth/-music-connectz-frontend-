# Backend Spec — PostZ, NationalitieZ & SpecZ

Implementation-ready endpoint spec for the three social editions currently
running client-side (localStorage `mcz_social_v1`) in the frontend. Written to
match the existing backend conventions in `apps/accounts` and `apps/collabz`:

- Plain DRF `APIView` (no ViewSets), `permission_classes = [IsAuthenticated]`.
- Hand-rolled `_ser()` dict serializers (not `ModelSerializer`).
- Models: `author`/`owner` FK to `settings.AUTH_USER_MODEL`, `JSONField` for lists.
- Author-guards (`if p.author_id == request.user.id: return 400`).
- `get_or_create` for idempotent writes.
- The Energy / SpinaZ economy lives on `accounts.Profile`.

New apps, all mounted in `music_connectz/urls.py`:

| App          | Mount            | Covers                                             |
|--------------|------------------|----------------------------------------------------|
| `apps.postz` | `/api/postz/`    | posts, ratings (30 s window), comments (60 s window)|
| `apps.social`| `/api/social/`   | member discovery + NationalitieZ filter            |
| `apps.specz` | `/api/specz/`    | SpecZ — user metadata/UGC, StatZ-gated purchase     |

**Source of truth is the server.** The frontend's 30 s / 60 s countdowns are UX
only; the API re-checks every window and tier/currency rule and rejects
out-of-window or unauthorized writes.

---

## 0. Shared conventions

- **Auth:** `Authorization: Bearer <access>` (SimpleJWT), same as every other tab.
- **Time:** all timestamps ISO-8601 UTC. Windows are computed server-side from
  `created_at` using `django.utils.timezone.now()`.
- **Errors:** `{"detail": "<message>"}` with the status codes noted per route
  (mirrors `collabz`/`accounts`).
- **Economy helpers:** add to `apps/accounts/models.py` next to `daily_refill`:

```python
from django.db.models import F

def grant_energy(user, amount):
    Profile.objects.filter(user=user).update(energy=F("energy") + amount)

def spend_spinaz(user, amount):
    """Atomic debit; returns True if paid, False if insufficient balance."""
    updated = Profile.objects.filter(user=user, spinaz__gte=amount)\
        .update(spinaz=F("spinaz") - amount)
    return bool(updated)
```

---

## 1. PostZ — `apps/postz` → `/api/postz/`

### Rules (blueprint-derived)
- A post must be **open ≥ 30 s** before another user may rate it. The **poster
  may not rate** their own post.
- A post must be **open ≥ 60 s** before it may be commented on.
- Ratings are on a **1–10** scale, **anonymous** (raters are never exposed in any
  payload), **one per user per post** (re-rating overwrites).
- **Every rating grants the rater +1 Energy** (blueprint: "every rating gives 1
  energy"). First rating from a given user only — overwrites don't re-pay.
- Deferred: "every comment on another user's post gives energy equal to the
  post's median rating 1 hour after it's posted." Modeled as a scheduled job
  (§1.6), not an inline reward.

### 1.1 Models — `apps/postz/models.py`

```python
from django.conf import settings
from django.db import models

RATE_WINDOW_SEC = 30
COMMENT_WINDOW_SEC = 60

class Post(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="postz")
    content = models.TextField()
    genre = models.CharField(max_length=40, blank=True, default="")
    skills = models.JSONField(default=list, blank=True)
    media_url = models.URLField(blank=True, default="")     # optional track/art
    is_active = models.BooleanField(default=True)
    comment_reward_settled = models.BooleanField(default=False)  # §1.6 guard
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["-created_at"])]

class Rating(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="ratings")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="postz_ratings")
    stars = models.PositiveSmallIntegerField()              # 1..10
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "user")                 # one rating per user

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="postz_comments")
    text = models.CharField(max_length=1000)               # matches UI 1000 cap
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
```

### 1.2 Serializer shape (`_ser(post, me)`)
Matches the fields `PostZ.jsx` renders. **No rater identities are ever included.**

```json
{
  "id": 123,
  "author": "NovaBeatz",
  "content": "Fresh 140bpm drill loop…",
  "genre": "Drill",
  "skills": ["FL Studio", "Beat Making"],
  "created_at": "2026-07-16T11:15:00Z",
  "age_sec": 92,
  "avg_rating": 8.5,          // median/avg out of 10, rounded to .1; 0 if none
  "rating_count": 2,
  "comment_count": 0,
  "my_rating": 0,             // this user's stars, 0 if none
  "is_mine": false,
  "can_rate": true,           // age>=30 AND not mine AND active
  "can_comment": false,       // age>=60 AND active
  "rate_opens_in_sec": 0,     // max(0, 30 - age)
  "comment_opens_in_sec": 0,  // max(0, 60 - age)
  "comments": [               // included on detail; omit on list if large
    {"id": 9, "user": "dre", "text": "hard", "created_at": "…"}
  ]
}
```

> Returning `age_sec` + `*_opens_in_sec` lets the client seed its countdowns
> from server time instead of trusting the device clock.

### 1.3 `GET /api/postz/` · `POST /api/postz/`
- **GET** → list active posts, newest first (`[:100]`). Query params:
  `?author=<username>`, `?genre=<g>`, `?mine=1`. Returns `[_ser(...)]` (comments
  omitted or capped to latest 3 per post for payload size).
- **POST** body `{content, genre?, skills?, media_url?}` → 201 `_ser(post)`.
  - 400 if `content` blank.

### 1.4 `POST /api/postz/<id>/rate/`
Body `{stars: 1..10}`.
- 404 if post missing/inactive.
- **400** `"stars must be 1–10."` if out of range.
- **403** `"You can't rate your own PostZ."` if `post.author_id == user.id`.
- **409** `"Rating opens in {n}s."` if `age < 30 s` (include `Retry-After`).
- Upsert via `Rating.objects.update_or_create(post, user, defaults={"stars"})`.
  - On **create** (first time this user rates): `grant_energy(user, 1)`.
  - On **update**: no additional Energy.
- 200 `_ser(post, user)` (fresh `avg_rating`, `rating_count`, `my_rating`).

### 1.5 `POST /api/postz/<id>/comment/`
Body `{text}` (≤ 1000 chars).
- 404 if missing/inactive; 400 if `text` blank or > 1000.
- **409** `"Comments open in {n}s."` if `age < 60 s`.
- Creates `Comment`; 201 `_ser(post, user)`.
- (Poster may comment on their own post; only *rating* excludes the poster.)

### 1.6 Deferred reward job (management command / cron)
`python manage.py settle_comment_rewards` — for each `Post` where
`created_at <= now-1h` and `comment_reward_settled=False`:
- Compute the post's **median rating** at the 1-hour mark.
- For each distinct commenter who is **not the author**, `grant_energy(commenter,
  median)`.
- Set `comment_reward_settled=True` (idempotent; the guard prevents double pay).
Run hourly (Render cron / `django-cron`). Purely additive — safe to ship after §1.1–1.5.

### 1.7 URLs — `apps/postz/urls.py`
```python
path("",                 PostListCreateView.as_view()),
path("<int:pk>/rate/",   PostRateView.as_view()),
path("<int:pk>/comment/",PostCommentView.as_view()),
```

---

## 2. NationalitieZ — Profile field + `apps/social` → `/api/social/`

Heritage/ancestry lives on the existing `Profile`; discovery + filtering is a new
thin app so Social ConnectZ can query other members.

### 2.1 Profile change — `apps/accounts/models.py`
```python
nationalities = models.JSONField(default=list, blank=True)  # ["Nigerian","Jamaican"]
```
Migration: `0005_profile_nationalities`.

### 2.2 Extend `MeView` (accounts/views.py)
- `_payload()` adds `"nationalities": prof.nationalities`.
- `patch()` accepts `nationalities`: validate each entry against a server-side
  `ALLOWED_NATIONALITIES` set (mirror the 50-entry list in
  `src/apps/socialData.js`), cap length (e.g. `[:10]`).
  - This makes the frontend's existing `PATCH /api/auth/me/ {personas, birthday,
    nationalities}` call authoritative (it already sends `nationalities`).

### 2.3 `GET /api/social/members/`
Public directory for Social ConnectZ. Query params:
- `?nationality=<name>` — exact match against `Profile.nationalities` (JSON
  contains); the filterable heritage metric.
- `?q=<text>` — case-insensitive match on username / persona / city.
- `?looking=collab|romance` — optional (VibeZ/Inferno intent, future).
- Pagination: `?limit=` (default 30, max 100), `?offset=`.

Response `[{...}]`:
```json
{
  "user": "NovaBeatz",
  "persona": "producer",         // first of Profile.personas
  "icon": "personaz_producer.png",
  "nationalities": ["Nigerian", "Jamaican"],
  "tier": "premium",
  "online": true,                // last_seen within 5 min
  "is_self": false
}
```
- Excludes blocked users (reuse GroupZ block policy when available).
- `nationalities` is returned so the client can render the clickable heritage
  chips it already has.

Postgres filter: `Profile.objects.filter(nationalities__contains=[name])`
(JSONField `__contains` on psycopg2 — already the DB in `requirements.txt`).

### 2.4 URLs — `apps/social/urls.py`
```python
path("members/", MemberDirectoryView.as_view()),
```

---

## 3. SpecZ — `apps/specz` → `/api/specz/`

User metadata/UGC attached to a target app, **purchasable by StatZ users only**.
Price is charged in **SpinaZ** and debited atomically.

### 3.1 Model — `apps/specz/models.py`
```python
class SpecEntry(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="specz")
    app = models.CharField(max_length=40)        # "PostZ", "BattleZ", … (SPEC_APPS)
    label = models.CharField(max_length=80)
    value = models.CharField(max_length=280)     # the UGC
    price_spinaz = models.PositiveIntegerField(default=250)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
```

### 3.2 `GET /api/specz/`
List the caller's SpecZ (`owner=request.user`), newest first. Returns
`[{id, app, label, value, price, bought_at}]` — matches `SpecZ.jsx`'s fields
(`bought_at` → the card's date line).

### 3.3 `POST /api/specz/`  (StatZ-gated purchase)
Body `{app, label, value}`.
- **403** `"SpecZ is a StatZ perk."` if `profile.tier != "statz"`.
- **400** if `app` not in the allowed `SPEC_APPS` names, or `label`/`value` blank.
- Price = `SPEC_PRICE = 250` (server constant — never trust a client price).
- `if not spend_spinaz(user, 250): return 402 "Not enough SpinaZ."`
- On success create `SpecEntry`; 201 `_ser(entry)` **plus** the new balance so the
  UI can update: `{"spec": {...}, "spinaz": <new_balance>}`.

### 3.4 `DELETE /api/specz/<id>/`
- 404 if not owner's; else soft/hard delete → 204. (No refund by default;
  note this in the UI. Refund policy is a product decision.)

### 3.5 URLs — `apps/specz/urls.py`
```python
path("",          SpecListCreateView.as_view()),
path("<int:pk>/", SpecDetailView.as_view()),   # DELETE
```

---

## 4. Wiring & rollout

### 4.1 `music_connectz/urls.py`
```python
path("api/postz/",  include("apps.postz.urls")),
path("api/social/", include("apps.social.urls")),
path("api/specz/",  include("apps.specz.urls")),
```
Add the three apps to `INSTALLED_APPS`, then:
`makemigrations postz social specz accounts && migrate`.

### 4.2 Frontend changes (replace the localStorage layer)
`src/apps/socialData.js` is today's client store. Swap each write/read for `api()`:

| UI action (current localStorage)      | New call                                            |
|---------------------------------------|-----------------------------------------------------|
| PostZ load / create                   | `GET /api/postz/` · `POST /api/postz/`              |
| PostZ rate (1–10)                     | `POST /api/postz/<id>/rate/ {stars}`                |
| PostZ comment                         | `POST /api/postz/<id>/comment/ {text}`             |
| ProfileZ save NationalitieZ           | already `PATCH /api/auth/me/ {nationalities}` (§2.2)|
| Social ConnectZ directory + filter    | `GET /api/social/members/?nationality=&q=`          |
| SpecZ list / buy / remove             | `GET`·`POST`·`DELETE /api/specz/`                    |

Keep the client countdowns, but seed them from `age_sec` / `*_opens_in_sec` and
let a `409` re-sync them. Remove the seed data once the feed is live.

### 4.3 Suggested build order
1. **PostZ** (§1.1–1.5) — highest-value, self-contained.
2. **NationalitieZ** (§2) — one Profile field + `MeView` patch + directory route.
3. **SpecZ** (§3) — depends only on the `spend_spinaz` helper.
4. **Comment reward job** (§1.6) — additive, ship last.

### 4.4 Tests to include (match repo style — DRF `APITestCase`)
- Rate before 30 s → 409; rate own post → 403; rate 0/11 → 400; valid rate → +1
  Energy; re-rate → no extra Energy, avg updates.
- Comment before 60 s → 409; comment at 61 s → 201.
- `members/?nationality=Nigerian` returns only matching profiles.
- SpecZ POST as free/premium → 403; as StatZ with < 250 SpinaZ → 402; as StatZ
  with funds → 201 and SpinaZ debited by exactly 250.
