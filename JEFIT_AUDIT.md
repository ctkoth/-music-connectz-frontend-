# Jefit → BodieZ: what to add, and why

Written 2026-10-08. **BodieZ's side was checked in the code this session; Jefit's side is from its
store listing and blog, not from using the app** — supersets and chart types in particular are
unconfirmed (see Sources). Treat the Jefit column as "reported", and check the app before building
anything that depends on it.

## Where BodieZ is already ahead

| | BodieZ | Jefit (reported) |
|---|---|---|
| Training around a disability | Access filter: can't stand / no arms / one arm / no legs / one leg, per-exercise tags, 29 of 90 exercises work with no arms | None reported |
| One-sided sets | A set done with one arm/leg is marked, and records, ratings and "last time" compare like with like | Not reported |
| Honest scoring | Muscle ratings compare you with your own earlier best only, with the caveat on screen | Elite "rankings / community points" |
| Planning | Stated time estimate while building, custom days, 1–6 exercises per muscle | — |
| Logging after the fact | Past workouts from a routine, copy-last-time, repeat set | Elite: "copy a routine, workout, day or exercise" |
| Cost | No ads, nothing paywalled | Elite ≈ $69.99/yr (ads removed, analytics, swaps, programs) |

## What BodieZ is missing, in the order to build it

**1. Edit and delete a logged set — build first.** `BodieZSetsView` only POSTs. A typo (`800` for `80`)
is permanent, it feeds records and the Coach, and the only fix today is not to trust the numbers.
Also no workout **history screen**: Progress shows three totals (sessions, sets, volume). A member
cannot see what they did on a given day, let alone correct it. *Why first:* every other number in the
app is only as good as the sets under it. Small–medium.

**2. Per-exercise progress chart + estimated 1RM.** The data exists (the Coach already computes
est. 1RM per session for ratings) and nothing draws it; BodieZ has no chart anywhere. A line of "your
best set each session" per exercise, with the one-arm/one-leg lanes kept separate, is the single most
visible thing Jefit's analytics give and the cheapest to add. Medium.

**3. Warm-up sets + exercise notes.** A warm-up flagged as one must **not** count toward records or
volume — otherwise a member beats a record by warming up (the substance rule). Notes per exercise
("seat at 4", "left shoulder pinches"). Small. No notes field exists on a set or exercise today.

**4. Quick swap (accessibility-aware).** Jefit gates "Quick Swap Exercise" behind Elite. For BodieZ it
is more valuable than for Jefit: "this machine is taken / I can't do this one today" → the same muscle,
filtered by the member's access settings, their own history first. The picker's ranking already does
the hard part. Small–medium. Never paywall it (ladder rule: tiers limit how much, not whether).

**5. Copy a routine / copy a day.** Duplicate a routine into another bucket or day tag, and "copy last
workout" from a session. Copying sets is done; copying whole routines is not. Small.

**6. Body measurements and progress photos.** Only body weight is tracked. Waist, chest, arms, thighs,
body-fat % (member-entered, never estimated), and photos through the existing upload path. Medium. Photos
are the sensitive part: private by default, and a Play data-safety line.

**7. Supersets / circuits.** Reported by users of Jefit but unconfirmed above; needs a grouping field on
sets and a logger that alternates. Medium–large. Do after 1–3.

**8. Routine sharing.** Post a routine, import somebody else's. Cross-pollination fits (a routine
travels as a post, like a Boss Take does), and it replaces Jefit's community routine library without
building a library. Medium. Moderation applies.

**9. Reminders.** The Scheduler stores a date and tells nobody. The push service worker already exists
for the main site; the standalone app and the Play TWA need their own subscription. Medium.

**10. Library depth and demo clips.** 90 exercises against Jefit's reported 1,400–3,300, and 37 of 90 have
a clip. Custom exercises close the "my gym's machine" gap; the clips (and widening the arm- and
leg-free set) are the real work, and the adaptive-fitness positioning makes them the right work.

## Deliberately not copied

- **Rankings / community points / leaderboards by volume.** A volume rank is a number a member can
  raise without getting stronger (add junk sets), and it shames the people the Play listing is for.
  If anything ranks, it ranks progress against your own history.
- **Paywalled analytics as a wall.** Depth can ladder (longer history, more charts); whether you can see
  your own progress cannot.
- **Streak and badge pressure.** XP may reward turning up; it must not be called "progress".

## Not buildable from here

- **Apple Health / Health Connect / watch sync.** Steps are typed in today. Real sync needs a native
  wrapper (a Trusted Web Activity cannot read Health Connect) and a Play Health-apps declaration.
  Decide on a native build first.
- **A Jefit importer.** Worth having for switching members, but only if Jefit offers an export; not
  confirmed.

## Sources

- [JEFIT on the App Store](https://apps.apple.com/us/app/jefit-%E5%81%A5%E8%BA%AB%E8%A8%98%E9%8C%84-%E8%88%89%E9%87%8D%E5%A2%9E%E8%82%8C%E8%A8%93%E7%B7%B4-%E5%81%A5%E8%BA%AB%E6%95%B8%E6%93%9A%E5%88%86%E6%9E%90/id449810000?l=ar) — 1400+ exercises, HD video, routine database, Health sync, smartwatch
- [Six Unique Features Found on Jefit Elite App](https://www.jefit.com/blog/six-unique-features-found-on-jefit-elite-app) — Quick Swap, analytics, 1RM, copy routine/day/exercise, Elite list
- [Take Advantage of Jefit's 11-Year Anniversary Sale](https://www.jefit.com/blog/take-advantage-of-jefits-11-year-anniversary-sale) — Elite feature list (older)
