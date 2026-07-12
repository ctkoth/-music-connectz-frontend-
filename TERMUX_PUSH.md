# TERMUX_PUSH — Frontend (Vercel)

## Read first — the 405 on /api/auth/login/

Your console showed `POST /api/auth/login/ 405` and the Vercel log tagged that
request `"source":"static"`. Translation: the login POST was served by the SPA
static fallback (index.html) instead of being proxied to Render — and POST to a
static file returns 405. The `/api/* -> Render` proxy in vercel.json was NOT active
on the live production deploy (it predates this config).

FIX = make the proxy live:
1. Make sure THIS vercel.json is at the repo root (it is, in this zip):
       { "source": "/api/:path*", "destination": "https://admin.musicconnectz.net/api/:path*" }
   is listed BEFORE the SPA catch-all.
2. In Vercel -> Settings -> Environment Variables, leave VITE_API_BASE EMPTY
   (so the app calls "/api" on its own origin and the proxy forwards it). Same-origin
   means no CORS. If you instead set VITE_API_BASE=https://admin.musicconnectz.net,
   the app calls Render directly and you MUST have django-cors-headers configured.
3. Redeploy PRODUCTION (not just a preview):
       bash push_frontend.sh vercel     # npx vercel --prod
   Confirm the production deployment is the one on your primary domain.

Verify after redeploy (should NOT be 405 anymore):
    curl -i -X POST https://musicconnectz.net/api/auth/login/ \
      -H "Content-Type: application/json" -d '{"identifier":"x","password":"y"}'
A 400 ("No account matches that login") is the GOOD result — it proves the proxy
reached Django. 405 = proxy still not live (recheck steps 1-3).

NOTE: even with the proxy fixed, login only works once the BACKEND tables exist —
see the backend zip's TERMUX_PUSH (accounts/mimez/directz migrations + INSTALLED_APPS).

## What's in this zip
- src/auth/ — AuthContext, Register (username/email/phone), Login (single identifier),
  OAuthButtons (Google/GitHub/Apple)
- src/skillz/SkillZPanel.jsx — XP/level/streak/drills/badges/leaderboard
- src/apps/MimeZ.jsx, src/apps/DirectZ.jsx  (directorZ fully removed)
- src/App.jsx — CUSTOM_ICONS registry + tabs
- public/icons/ — mimez.png, directz.png, personaz_mime.png, personaz_director.webp
- public/ — favicon.webp/.png/.ico + apple-touch-icon.png (NEW favicon wired in index.html)
- vercel.json, .env.example

If you already have App.jsx/main.jsx, merge the CUSTOM_ICONS entries + the two tabs
instead of overwriting.

## Deploy
    bash push_frontend.sh            # npm build + git push (auto-deploys linked repo)
    bash push_frontend.sh vercel     # npx vercel --prod (use this to force prod)

## Env vars (Vercel -> Settings -> Environment Variables)
    VITE_API_BASE=                       # EMPTY = use the proxy (recommended)
    VITE_GOOGLE_CLIENT_ID=...
    VITE_GITHUB_CLIENT_ID=...
    VITE_APPLE_CLIENT_ID=...
    VITE_OAUTH_REDIRECT=https://musicconnectz.net/oauth/callback
