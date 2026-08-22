# Google OAuth — exact setup

Google is the cheapest provider to enable: **one environment variable, on the
backend only.** No client secret, and no frontend redeploy. If you are following
an older copy of this file that said otherwise, see "What changed" at the bottom.

---

## 1. Google Auth Platform → Branding

console.cloud.google.com → project **Music ConnectZ** → **Google Auth Platform →
Branding**.

| Field | Value |
|---|---|
| App name | `Music ConnectZ` — this is the string members read on the consent screen ("… wants access to your Google Account"), so it should be the brand, spelled the way the brand is spelled |
| User support email | one you actually read |
| App logo | the ConnectZ mark |
| Application home page | `https://musicconnectz.net` |
| Application privacy policy link | `https://musicconnectz.net/privacy.html` |
| Application terms of service link | `https://musicconnectz.net/terms.html` |
| Authorized domain | `musicconnectz.net` — **one entry, lowercase** |
| Developer contact | your email |

**One authorized domain, not two.** Domains are case-insensitive, so
`musicconnectz.net` and `Musicconnectz.net` are the same domain typed twice.
Google will either reject the save or silently keep one; either way the second
row does nothing except make the first look like it wasn't enough.

Uploading a logo means the app needs verification before it can leave "Testing".
That is a review queue, not a switch — start it before you need it, not the week
of a launch.

## 2. Clients → create the OAuth client

**Google Auth Platform → Clients → + Create client** → Application type **Web
application** → name `MCZ Web`.

**Authorized JavaScript origins** — every origin the login page is ever served
from. This is a different list from the authorized domain above, and it is the
one that decides whether the button renders:

- `https://musicconnectz.net`
- `https://www.musicconnectz.net`
- the Vercel preview origin, if you sign in on previews

No redirect URI. The Google button uses Identity Services (GSI), which hands the
page an ID token directly — there is no round trip to redirect back from. The
Android TWA runs on the `musicconnectz.net` origin, so it is covered by the
first entry.

Copy the **Client ID**. It ends in `.apps.googleusercontent.com`.

## 3. The environment variable

**Render → Environment → `GOOGLE_OAUTH_CLIENT_ID`** = that client ID. Save; the
service restarts and picks it up.

That is the whole requirement. `apps/accounts/oauth.py` verifies the ID token
against Google's `tokeninfo` endpoint and checks the audience matches this ID —
there is nothing to sign, so **Google needs no client secret.**
`provider_requirements()` lists exactly one variable for `google`, and that
function is what the login screen reads its state from.

### Why the frontend doesn't need one

`VITE_GOOGLE_CLIENT_ID` still exists in `.env.example` and still works, but it is
a **fallback, not the source**. `OAuthButtons.jsx` fetches
`/api/auth/oauth-config/` and uses the served ID when there is one:

```js
const clientId = (key) => (!cfg ? "" : served ? cfg[key] || "" : VITE_ID(key));
```

So the ID travels at runtime from the backend. Setting it on Render is enough,
and **no Vercel redeploy is required** — which also means the ID can be rotated
without rebuilding the frontend. Set `VITE_GOOGLE_CLIENT_ID` only if you want the
button to survive the backend being unreachable.

## 4. Check it worked

`GET https://<backend>/api/auth/oauth-config/` — open, no auth, because the login
screen is signed-out and client IDs are public by definition.

- `google` holds your ID → configured.
- `google` is empty and `needs.google` names the variable → not set, or set blank.
- `warnings` names a problem → read it. It catches the failure that has no other
  symptom: **a client ID that is really the client secret.** Google's button does
  not error on a bad ID — it renders nothing at all, and every screen stays
  silent about why.

Then load the login page. A real Google button should appear. If it doesn't, and
oauth-config says the ID is fine, the origin is missing from step 2 —
`renderButton` leaves the container empty on a refused origin rather than
throwing, which is why the app checks for a rendered child and says "failed"
instead of spinning forever.

---

## What changed

This file used to say to set the ID in **both** Vercel (`VITE_GOOGLE_CLIENT_ID`)
and Render, and to redeploy the frontend because `VITE_` vars bake at build time.
Both were true when the buttons read only build-time vars. `/api/auth/oauth-config/`
now serves the IDs at runtime, so the Render variable alone is enough and the
redeploy step is gone.

---

# Other providers

See `OAUTH_PROVIDERS.md` for console links and env names (Apple, GitHub, Spotify,
Microsoft, X, SoundCloud, Instagram, Facebook, TikTok). Every one except Google
and Apple needs a **secret** as well as an ID — a provider with an ID and no
secret keeps its button hidden rather than sending members out and failing them
on the way back, and `oauth-config` warns about it.

All code-flow providers use callback URL `https://musicconnectz.net/oauth/callback`.

# Password-reset email (Render env)

Until these are set, reset links print to the Render log instead of sending —
which never crashes, and never reaches anybody either:

    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_HOST_USER=you@gmail.com
    EMAIL_HOST_PASSWORD=<Gmail App Password — Google Account → Security → 2-Step → App passwords>
    DEFAULT_FROM_EMAIL=Music ConnectZ <you@gmail.com>
    FRONTEND_URL=https://musicconnectz.net
