# Music ConnectZ — Blueprint audit (Sep 4, 2026)

Supersedes the Jul 12 version, which had drifted in **both** directions: it
listed five tabs as "planned" that had already shipped, and it did not mention
nine tabs that were live. A scorecard nobody re-checks is worse than no
scorecard, because decisions get made off it — so this one states how each line
was verified, and every count below came from the code, not from the last copy
of this file.

## How to re-check this

```
# tabs actually registered in the shell
grep -oE 'key: "[a-z0-9]+"' src/App.jsx
# does the live app call an endpoint at all?
grep -r "<endpoint>" --include=*.jsx --include=*.js src/ | grep -v mcz2
```

`grep -v mcz2` is not optional. `src/mcz2/` is 10,631 lines of blueprint that is
**not mounted**, and it mentions nearly every feature name. Counting it is how
the previous audit concluded things were live that were not.

---

## Live — 25 tabs registered in `App.jsx`

    onboardz  postz     playlistz  social    profilez
    specz     membershipz  adz     offerz    mimez
    directz   lessonz   singz      rapz      messagez
    keyconnectz  occ    logz       journalz  habitz
    collabz   battlez   labelz     groupz    funnelz

Five of these were on the July list as *planned*: **BattleZ, CollabZ, LabelZ,
KeyConnectZ, Social ConnectZ**. Nine were live and unmentioned: **PlaylistZ,
SpecZ, AdZ, OfferZ, OCC, LogZ, JournalZ, HabitZ, FunnelZ**.

---

## Built on the server, no front door — the real finding

Three features have working backends and no way in. This is the
cross-pollination rule failing at the largest possible scale: not a screen that
shows a fact and offers nowhere to take it, but a capability with no screen at
all.

| Feature | Backend | Live frontend |
|---|---|---|
| **RoyaltieZ** | 4 endpoints (`royalties/`, `/accrue/`, `/cashout/`), `Wallet.royalties_cents`, full cashout tax table in `catalog.py` | **zero calls** |
| **GameZ** | 10 endpoints, 650 lines (`gamez.py`, `gamez_build.py`) — build *and* play | **an icon** |
| **DistributeZ** | 9 endpoints, 479 lines (`releasez.py`, `distributez.py`) — transcode, lyrics, release detail | partially wired (below) |

### RoyaltieZ is the one that matters

`Wallet.royalties_cents` accrues. `catalog.cashout_rate()` knows the whole
schedule — instant 15%, weekly 10/5/3% by tier, monthly 1%, quarterly 0%. Three
endpoints are mounted and answering.

And **`royalties` is not in `WalletSerializer`** (`money_cents, money, energy,
spinaz, promptz, updated_at`), so every live surface that reads a wallet cannot
see it. The only place the number appears at all is the account export.

So a member can accrue money they cannot see and cannot withdraw. That is worse
than the feature not existing: not existing is honest.

**The UI for it is already written** — `src/mcz2/` references royalties 15
times. It was never ported.

### DistributeZ is half-wired, which is its own trap

The *action* works: `PostZ` and `CollabZ` both POST to
`postz/<id>/distribute/` and `collab/<id>/distribute/`. What is missing is the
other half — `releasez.ReleaseDetailView` has no caller, so there is nowhere to
see or manage a release after you make one. And `tierBenefits.js` **sells**
DistributeZ by tier, so the marketing is ahead of the surface.

---

## Sold in MembershipZ, does not exist

`tierBenefits.js` markets eleven apps. Three of them cannot do what the copy
says. This is the same class of problem in all three cases and it is the most
expensive one in the codebase, because it is charged for.

- **Lilith** — sold at all three tiers ("auto-schedule, PersonaZ automation…,
  AI breakdown of big goals, smart priority scoring, and the analytics
  dashboard"). It exists as **three icons** in `App.jsx`
  (`lilith_today/anytime/logbook`) and a proper-noun entry in the translator's
  do-not-translate glossary. No tab, no component, no endpoint.
  It is **not** HabitZ under a new name — HabitZ is "notice something, tally
  it", not tasks and scheduling. It is not OCC TaskZ either: that is the
  agent's own queue, not a member's task manager.
- **SpecZ** — a mounted tab whose purchases are fake. `persist()` writes
  `localStorage`; no API call, no SpinaZ debited. Sold as the StatZ marketplace.
- **CallZ** — sold as StatZ-only. LessonZ's "CallZ" is a delivery *option* on a
  booking, priced the same as remote or in-person. There is no connect, so
  there is also no per-minute rate to state before one — already recorded as a
  cost/gain violation in `CLAUDE.md`.

**Nothing should be listed in `tierBenefits.js` that a member cannot do after
paying.** The fix for each is either build it or take the row out; the one
option that is not available is leaving the copy up.

Two features are orphaned but *not* mis-sold — RoyaltieZ and GameZ appear
nowhere in the tier copy. That is the better failure of the two.

---

## The blueprint itself

`src/mcz2/` — 10,631 lines in one file, plus 22 modules, ~13,400 lines total.
`CLAUDE.md` says it is "not mounted, so changing it changes nothing."

**That is true of the code and false of the data, and the difference cost a
member their profile.** `Mcz2App.jsx:969` defines

```js
const PERSONA_CHOICES = [
  { name: "Independent Artist", emoji: "🎤", icon: "personaz_indieartist.png" },
```

and that exact shape reached production as
`"{'name': 'Independent Artist', 'emoji': '🎤', 'skills': []}"` — a persona
stored as the printed form of a dict, rendering as machine noise on the owner's
own profile and dropping his priced skills out of everything that counts them.
Fixed today (`apps/economy/personaz.py`), but the lesson is about the blueprint:

> **"Not mounted" is not "inert."** A reference app's data shapes escape into
> real rows. The live app's persona shape is a keyed string
> (`personaSkills.js`: `indieartist: "🎤 Independent Artist"`) and the
> blueprint's is a `{name, emoji, icon}` object — two shapes for one concept,
> and the gap between them is where the corruption lived.

So the blueprint has three jobs it is currently doing at once, and they conflict:

1. **A spec** — the RoyaltieZ UI lives here and nowhere else. Valuable.
2. **A parts bin** — shapes get copied out of it, sometimes into the database.
   Dangerous, and unversioned: nothing tells you whether a shape in here is
   current, superseded, or was never right.
3. **Dead weight** — ~13,400 lines that no test covers and no build ships,
   which every search has to be filtered out of by hand.

**Recommendation, in order of value:**

- **Port RoyaltieZ.** The backend is done and the design exists. Money accruing
  with no door is the single worst thing on this list.
- **Decide about Lilith, SpecZ and CallZ** — build or unlist. Charging for
  three things that do not work is a refund conversation waiting to happen.
- **Mark the blueprint's data shapes as historical.** A header at the top of
  `Mcz2App.jsx` saying which shapes are superseded by what would have prevented
  today's bug outright. Cheaper than porting, and the only item here that
  stops a *recurrence* rather than fixing an instance.
- **GameZ and DistributeZ's second half** — real work, no urgency, nobody is
  being charged for either.

---

## Scorecard

- **25 tabs live** (Jul said 16 of ~27)
- **3 features server-complete with no front door** — RoyaltieZ, GameZ, and
  half of DistributeZ; ~1,130 backend lines and 23 endpoints
- **3 features sold that do not work** — Lilith, SpecZ, CallZ
- **2 paradigm violations still open** from `CLAUDE.md` — `directz_ai_rating`
  (a craft score built from form completeness) and CallZ's missing pre-connect
  rate
