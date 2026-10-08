# Accessibility — standalone BodieZ

The listing is for people who train around a disability, so this app is held to
a higher bar than the main site. Two checks, and **only the first can be run
from this repo**.

## 1. Automated — `tools/a11y-bodiez.mjs`

```sh
# terminal 1 (API on :8000, e.g. .claude/skills/run/up.sh)
MCZ_API=http://localhost:8000 VITE_API_BASE=http://localhost:5175 npm run dev:bodiez
# terminal 2
node tools/a11y-bodiez.mjs            # exits 1 on any blocking finding
```

It signs in on a 390×844 touch screen and runs axe-core (WCAG 2.1 A/AA + best
practice) on the sign-in screen and every BodieZ tab, plus three checks axe does
not make: tap targets under 44px, controls a screen reader would read out with no
name, and images with no `alt`. Run it before every Play submission.

It found, and `standalone/bodiez/a11y.css` + the labels now fix: 194 findings
→ 0 (no page landmark or heading, ~15 selects/inputs with only a placeholder,
tap targets 16–26px tall, secondary text at 1.6–4.4:1 contrast).

**Limits, stated so a green run is not over-read:** axe cannot judge reading
order, whether a label is *meaningful*, focus order after a dialog, or how
anything sounds. It also cannot see colour over the app's background gradient,
so the script swaps in the gradient's base colour while it measures.

## 2. TalkBack on a real phone — NOT done, and required

Nobody has run this app with TalkBack. Do it on an Android phone before
submitting (Settings → Accessibility → TalkBack; swipe right/left to move,
double-tap to activate). Pass = you can finish each task without looking.

- [ ] Sign in: fields announce "Username, email, or phone" / "Password"; the
      show-password button announces its state.
- [ ] Today → start an ad-hoc session → pick an exercise → set "Done with" →
      log a set. Each chip announces pressed/not pressed; the logged set is
      reachable and reads weight, reps and "one arm" aloud.
- [ ] "What I can do": every checkbox reads its label *and* hint; ticking
      "can't use my arms" visibly disables "one arm" and TalkBack says so.
- [ ] Log a past workout: pick a routine, edit one set's weight and reps, save.
- [ ] Scheduler: create a custom day, tag a routine with it, delete the day.
- [ ] Coach: choose 4 exercises per muscle, read the time estimate aloud.
- [ ] Nothing important is only a colour (the status chips on BodyMap carry text).
- [ ] No focus trap: after any dialog or confirm, focus returns somewhere sensible.
- [ ] Switch Access / keyboard: every control reachable with Tab and Enter.
- [ ] Font size at 200% and Display size at Largest: nothing clipped or overlapping.

Record what failed in the PR, fix it, and re-run section 1.
