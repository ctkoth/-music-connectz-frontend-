# OAuth providers — env vars (Render) + redirect URL

Endpoint for all: POST /api/auth/oauth/<provider>/
Redirect/callback URL to register at EVERY provider console:
    https://musicconnectz.net/oauth/callback

| Provider   | Render env vars                                                | Console |
|------------|----------------------------------------------------------------|---------|
| Google     | GOOGLE_OAUTH_CLIENT_ID                                         | console.cloud.google.com → Credentials |
| Apple      | APPLE_OAUTH_CLIENT_ID (Services ID)                            | developer.apple.com (see APPLE_OAUTH.md) |
| GitHub     | GITHUB_OAUTH_CLIENT_ID / _SECRET                               | github.com/settings/developers |
| Spotify    | SPOTIFY_OAUTH_CLIENT_ID / _SECRET                              | developer.spotify.com/dashboard |
| Microsoft  | MICROSOFT_OAUTH_CLIENT_ID / _SECRET                            | portal.azure.com → App registrations |
| Twitter/X  | TWITTER_OAUTH_CLIENT_ID / _SECRET (PKCE; secret optional)      | developer.x.com |
| SoundCloud | SOUNDCLOUD_OAUTH_CLIENT_ID / _SECRET                           | soundcloud.com/you/apps |
| Instagram  | INSTAGRAM_OAUTH_CLIENT_ID / _SECRET (Basic Display)            | developers.facebook.com |
| Facebook   | FACEBOOK_OAUTH_CLIENT_ID / _SECRET                             | developers.facebook.com |
| TikTok     | TIKTOK_OAUTH_CLIENT_ID (client_key) / _SECRET                  | developers.tiktok.com |

Matching frontend (Vercel) vars: VITE_<PROVIDER>_CLIENT_ID (IDs only — secrets stay on Render).
Providers without verified emails (Instagram, SoundCloud, TikTok, X) create accounts keyed
to the provider identity; users can add email/phone later.
