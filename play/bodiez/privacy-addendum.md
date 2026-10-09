# The paragraph `public/privacy.html` is missing

Play checks the privacy policy against the Data safety form, and the policy as it
stands (27 July 2026) never mentions workouts, body weight, the movement answers
or the BodieZ app. Health information left out of the policy is a standard
rejection reason. It also says account deletion is "in ProfileZ", which the
BodieZ app does not have — it has its own control now.

This is a legal statement by Music ConnectZ LLC, so it is drafted here rather than
published for you. Paste it into `public/privacy.html` under "Information we
collect", change the first sentence of the policy to name BodieZ, and update the
"Last updated" date.

```html
<li><strong>BodieZ (fitness) information</strong> you choose to log: workouts, sets, weights and
reps, routines, goals, body-weight check-ins, recovery check-ins (sleep quality, fatigue), steps you
type in, and your answers about what your body can do (whether you can stand or walk, use your arms,
use your legs). The last group is health information. We use it only to run BodieZ: to filter the
exercise list and to compare your progress with your own earlier sessions. We do not use it for
advertising, we do not sell it, and we do not show it to other members. It is deleted with your account.</li>
```

And in "Your choices & rights", replace the delete-account line with:

```html
<li><strong>Delete your account</strong> at any time: in BodieZ under Today → Delete my account, or in
Music ConnectZ under ProfileZ. Or follow <a href="/delete-account.html">these steps</a>, or email us.
One account covers both apps, so it is deleted from both.</li>
```

Checked against the code: the movement answers (`BodieZAccess`) are written by the member
about themselves and read only through their own `GET /bodiez/access/`, so "we do not show it to
other members" is true today. If that ever changes, this sentence has to change first.
