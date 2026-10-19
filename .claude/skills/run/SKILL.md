---
name: run
description: Launch the Music ConnectZ stack (Django API + Vite frontend) and drive it in a real browser. Use when asked to run, start, open, screenshot or click through the app, or to confirm a change works in the app rather than only in the test suite.
---

# Running Music ConnectZ

Two repos, one app. The frontend is useless without the API, so "run the app"
always means both. Everything below was found by doing it from a cold
container; each trap listed is one that cost real time and none of them
announce themselves.

```bash
.claude/skills/run/up.sh          # both halves, migrated, seeded
```

It prints the URLs and the seeded logins. Then drive it:

```bash
node .claude/skills/run/drive.mjs corey venue        # user, tab slug
node .claude/skills/run/drive.mjs corey postz shot.png
```

`drive.mjs` logs in, lands on the tab, screenshots it full-page, prints the
page text and **prints every console error**. Read the screenshot. A blank
frame is a failure to launch, and a clean run with three red console lines is
not a pass.

To drive something the skeleton doesn't do — clicking through a flow — copy it
and edit. The login and the browser wiring are the parts worth not rewriting.

## Traps

**`VITE_API_BASE=""` points your local frontend at PRODUCTION.** `api.js` says
in a comment that empty means "use a same-origin proxy"; the code beneath it
treats `""` exactly like unset and falls through to
`https://admin.musicconnectz.net`. So the documented way to run locally is the
one that has you clicking Delete against the live database. `up.sh` sets it to
the Vite origin explicitly. Never leave it empty and never trust that comment.

**Talking to `:8000` cross-origin fails in a browser even though it is
allow-listed.** `localhost:5173` is in `CORS_ALLOWED_ORIGINS` and a curl
preflight returns the right header, but under a real page load the dev server
drops connections and the reset surfaces as a CORS error, which sends you
debugging the wrong thing entirely. `up.sh` sidesteps it: Vite serves on 5174
and proxies `/api` to Django, so the app is same-origin and there is no
preflight. That is why the port is 5174 and not the default 5173.

**Login answers 500 on a bare container.** The password hasher needs
`_cffi_backend` and the image has not got it. Every login 500s, which reads as
broken auth rather than a missing wheel. `up.sh` installs `cffi` if it is
missing. This is also why the test suite can pass while nobody can log in —
tests use `force_login` and never hash anything.

**The login field is `identifier`, not `username`.** It takes a username, an
email or a phone. Posting `username` gets "This field is required."

**Tab URLs drop the trailing z.** `slugFor()` in `App.jsx` strips it, so
`venuez` lives at `/venue`, `collabz` at `/collab`, `battlez` at `/battle`.
`postz` → `/post`. Getting it wrong redirects to `/` and you land on whatever
tab the account defaults to, which looks like your route is missing.

**`/` is a marketing page when logged out, and OnboardZ when a new account
logs in.** Neither is the app. Go to `/login` directly, then to the tab slug.

**A persona skill's `name` must be the picker's KEY, not a label.** The
picker in `SkillsUsed.jsx` stores keys — `any_daw`, `protools`, `ableton` —
and `post_cost_cents` matches on the stored name. Seed a rate as `"Drums"` and
every price silently comes out zero, so the ⚡ and money you are trying to
check never appear and the screen looks broken. `seed.py` gets this right; copy
it rather than inventing skill names. Keys are in `src/personaSkills.js`.

**`pkill -f "manage.py runserver"` kills the shell that runs it**, because that
shell's own command line contains the pattern. Use the bracket trick:
`pkill -f "[m]anage.py runserver"`.

**Playwright is global and CommonJS.** It is not in either repo's
`node_modules`. `import { chromium } from "playwright"` fails twice over — the
package is not resolvable, and it has no named exports. Import the default from
the absolute path, as `drive.mjs` does. The browser binary is
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; `/opt/pw-browsers/chromium`
is a directory, not the binary, and the version in that path moves.

**`up.sh` runs the system `python`, which may not have Django.** A fresh
container has no Django at all and `pip install -r requirements.txt` dies on
PyJWT ("Cannot uninstall PyJWT 2.7.0, RECORD file not found" — it came from
apt). The migrate step then fails with `ModuleNotFoundError: No module named
'django'`, which reads like a broken repo. Build a venv and put it on PATH for
the call:

```bash
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install -r "$MCZ_BACKEND/requirements.txt" cffi
PATH=/tmp/venv/bin:$PATH .claude/skills/run/up.sh
```

**The trial recorder is HIDDEN locally unless `GEMINI_API_KEY` is set**, and
that is the app being right. `GET /api/<key>/trial/` answers
`configured: false`, so `available` is false, so BossTake renders "No free
take right now — the coach isn't switched on" and hides the controls rather
than letting a visitor perform a take it cannot score. Nothing is broken; you
just cannot reach the recorder. Any non-empty value gets you to it, and the
send then fails at Gemini with a real 502 — which is useful, because that is
the path the failure card exists for:

```bash
pkill -f "[m]anage.py runserver"
cd "$MCZ_BACKEND" && GEMINI_API_KEY=local-fake nohup python manage.py runserver 8000 --noreload &
```

**Driving the recorder needs a fake device AND a permission grant.** Chromium
denies getUserMedia to a headless context otherwise, and you end up testing
the denial branch by accident:

```js
chromium.launch({ executablePath, args: [
  "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
await ctx.grantPermissions(["microphone", "camera"], { origin: "http://localhost:5174" });
```

Leave BOTH off to test the denial branch on purpose — that is how the
"blocked / in use / no device" messages get checked.

**Read the screenshot, not the page text.** A regex over `innerText` for the
take's size matched "up to 100MB" in the help copy and reported a passing
take. The screenshot showed `00:03 · 0.0MB` — a real bug (a 32KB take
rendering as zero) that the text check had just declared fine.

## What the seed gives you

`seed.py` is idempotent — re-run it whenever you want a clean slate. It makes
`corey` and `hostie` (password `pw12345!`), prices their PersonaZ skills, tops
up ⚡, and puts up one room of each kind so all three money directions are on
screen at once:

| Room | Kind | Who pays |
|---|---|---|
| Live set at the loft | performance, 21+ | visitor pays host, host's rates |
| Sunday session | session | host pays visitor, visitor's rates |
| Open jam | free | nobody |
| My own showcase | performance, hosted by `corey` | the host's own view |

The 21+ room refuses an account with no birthday on its profile, which is the
age gate working — set a birthday on the profile if you need to book that one.

To watch a charge actually land, read the wallet before and after rather than
trusting the screen:

```bash
cd "$MCZ_BACKEND" && echo '
from django.contrib.auth import get_user_model
from apps.economy.models import wallet_for
print("energy:", wallet_for(get_user_model().objects.get(username="corey")).energy)
' | python manage.py shell
```

## The API on its own

No frontend needed to exercise an endpoint:

```bash
cd "$MCZ_BACKEND" && python manage.py runserver 8000 --noreload &
TOKEN=$(curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"corey","password":"pw12345!"}' \
  http://localhost:8000/api/auth/login/ | python3 -c 'import json,sys; print(json.load(sys.stdin)["access"])')
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/economy/venuez/ | head -c 400
```
