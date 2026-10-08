# Data safety — BodieZ listing (draft, check against the live app before submitting)

BodieZ signs in with a Music ConnectZ account, so the account fields below are
the same ones the main app collects. This listing does **not** expose the
profile, orientation, substance or attractiveness-rating screens — the
standalone shell contains BodieZ only — which is what keeps it out of the two
policy risks `../data-safety.md` flags for the main app. Re-check that if the
shell ever grows more screens.

| Data | Collected | Purpose | Shared | Optional |
|---|---|---|---|---|
| Username, email, (phone), password | yes | account | no | email or phone, one required |
| Birthday | yes (age gate) | account / safety | no | no |
| Workouts, sets, routines, goals, body weight, steps, recovery notes | yes | app function | no | yes |
| Movement access answers (can stand / use arms / use legs) | yes | app function | no | yes — **health information** |
| Crash / diagnostics | check what the main app sends | analytics | no | — |

- Encrypted in transit: yes (HTTPS).
- Users can request deletion: yes — **provide the web URL** Play asks for.
- Not sold. Not used for ads in this listing (the main app's rewarded-ads
  plugin is not in a TWA, but confirm no ad SDK is loaded by the web build).
