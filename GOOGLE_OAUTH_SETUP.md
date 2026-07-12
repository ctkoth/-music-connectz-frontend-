# Google OAuth — exact setup (10 minutes)

1. console.cloud.google.com → top bar project picker → **New Project** → name
   "Music ConnectZ" → Create → select it.
2. Left menu **APIs & Services → OAuth consent screen** → External → Create.
   App name "Music ConnectZ", support email = yours, Authorized domain
   `musicconnectz.net`, developer email = yours → Save through the steps →
   **Publish app** (leaves "testing" mode so anyone can sign in).
3. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
   → Application type **Web application** → name "MCZ Web".
   **Authorized JavaScript origins** (all three):
   - https://musicconnectz.net
   - https://www.musicconnectz.net
   - https://ctkoth-music-connectz-frontend-wy3x.vercel.app
   (No redirect URI needed — the Google button uses Identity Services.)
   → Create → copy the **Client ID** (ends in .apps.googleusercontent.com).
4. Set it in BOTH places:
   - Vercel → Settings → Environment Variables → `VITE_GOOGLE_CLIENT_ID` = the ID
   - Render → Environment → `GOOGLE_OAUTH_CLIENT_ID` = the same ID
5. **Redeploy the frontend** — VITE_ vars are baked at BUILD time, so the button
   only appears after a fresh Vercel deploy. (Backend picks its env up on restart.)
6. Test: login page now shows the official Google button → sign in → lands on Home.

Other providers: see OAUTH_PROVIDERS.md (console links + env names for Apple,
GitHub, Spotify, Microsoft, X, SoundCloud, Instagram, Facebook, TikTok — all use
callback URL https://musicconnectz.net/oauth/callback).

# Password-reset email (Render env)
Until these are set, reset links print to Render logs instead of sending (never crashes):
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_HOST_USER=you@gmail.com
    EMAIL_HOST_PASSWORD=<Gmail App Password — google account → Security → 2-Step → App passwords>
    DEFAULT_FROM_EMAIL=Music ConnectZ <you@gmail.com>
    FRONTEND_URL=https://musicconnectz.net
