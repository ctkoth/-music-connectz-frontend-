# Data safety — BodieZ listing (checked against the code on 9 October 2026)

BodieZ signs in with a Music ConnectZ account, so registering here creates a full
Music ConnectZ account (profile, wallet, and a username every signed-in Music
ConnectZ member can find). The BodieZ-only shell contains BodieZ, sign-in and
sign-up and nothing else — no profile, orientation, substance or
attractiveness-rating screens — which is what keeps the *screens* out of the two
policy risks `../data-safety.md` flags for the main app. The *account* is still
the main app's, so say so honestly on the form. Re-check if the shell ever grows
more screens.

| Data | Collected | Purpose | Shared | Optional |
|---|---|---|---|---|
| Username, email address, password | yes | account | no | no — all three are required |
| Phone number | yes | account / sign-in | no | yes |
| Birthday | yes | account (works out a star sign and an age band; it gates nothing at sign-up) | no | yes |
| Workouts (date, start and end time, notes), sets (reps, weight, rest between sets, one-arm/one-leg marker), routines, goals, steps typed in, exercises and days you name | yes | app function | no | yes |
| **Health information:** body weight, recovery check-ins (soreness, sleep quality, fatigue, a note), and the five "What I can do" answers (can't stand or walk / can't use arms / only one arm / can't use legs / only one leg) | yes | app function | no | yes |
| Random browser identifier + sign-up/sign-in step events (no name or email) | yes | analytics: where sign-up breaks | no | no |
| IP address — account-creation address kept for the life of the account; up to 12 recent sign-in addresses, older ones dropped after 180 days at the next sign-in | yes | fraud / duplicate-account detection | no | no |
| Crash reports / diagnostics | **no** — no crash or analytics SDK is in the build | — | — | — |

- Encrypted in transit: yes (HTTPS).
- Users can request deletion: yes — in the app (scroll to the bottom of any screen →
  *Delete my account*) and on the web at `https://musicconnectz.net/delete-account.html`.
  Play asks for both. Deleting removes the rows and, since 9 October 2026, the
  uploaded files too.
- Not sold. No ads: the BodieZ-only build loads no ad script and the main app's
  rewarded-ads plugin is not in a TWA. Answer **No** to "contains ads".
- Nothing is shared with a third party by the app. The one place data leaves our
  hands is a workout summary the member chooses to send or post; and the exercise
  demo clips are on GitHub Pages, which sees an IP address when someone taps Demo.
- Not collected by this build: location, contacts, photos, audio, video, camera,
  microphone.
- **The age question is open.** Registration is optional on birthday and enforces
  no minimum age, while the policy says 13+. Health information from a 13–17-year-old
  is a Play question; decide what the target-audience answer is before submitting.
- **Account export does not include BodieZ data** (`AccountExportView` omits it).
  If the form says members can export their data, that is not yet true for these rows.
