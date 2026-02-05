# Google Maps JavaScript API — Setup & Deployment

This guide shows how to obtain a Google Maps JavaScript API key, restrict it, and add it to the Music ConnectZ frontend.

## 1) Create an API key

- Open Google Cloud Console: https://console.cloud.google.com/
- Select or create a Project.
- Enable billing for the project (required for Maps usage).
- Enable the Maps JavaScript API: https://console.cloud.google.com/apis/library/maps.googleapis.com
- Create credentials → **API key** on the Credentials page: https://console.cloud.google.com/apis/credentials

## 2) Restrict the key (strongly recommended)

1. In the Credentials list click your API key → `Application restrictions` → choose **HTTP referrers (web sites)**.
2. Add the allowed referrers, for example:

   - `https://musicconnectz.net/*`
   - `https://*.vercel.app/*` (optional while testing)

3. Under `API restrictions` select **Restrict key** and add **Maps JavaScript API** only.
4. Save changes.

Notes:
- Restricting by HTTP referrers prevents others from using your key elsewhere. Allowlist only the domains you control.

## 3) Add the key to the frontend (two options)

Option A — Quick local / repo method (git-ignored runtime file):

1. Copy the example `config.js.example` to `config.js` in the repo root:

```bash
cp config.js.example config.js
# (Windows PowerShell)
copy config.js.example config.js
```

2. Edit `config.js` and set:

```javascript
window.GOOGLE_MAPS_API_KEY = 'YOUR_REAL_KEY_HERE';
```

3. Commit only safe files; `config.js` is listed in `.gitignore` so it will not be committed.

4. Deploy to Vercel (from repo root):

```bash
npx vercel --prod --yes
```

Option B — Recommended: Use Vercel Environment Variable (safer for CI/CD):

1. In Vercel Dashboard → Project → Settings → Environment Variables, create `GOOGLE_MAPS_API_KEY` and paste the key. Set for `Production` (and `Preview` if needed).

2. Add a small build/time injection (we already added `loadConfigThenMaps()` that prefers `window.GOOGLE_MAPS_API_KEY`). To generate `config.js` at build time from the env var, you can add a simple build script that writes a `config.js` file using `process.env.GOOGLE_MAPS_API_KEY`.

Example (optional) `package.json` script and script file:

1) Add a script to `package.json`:

```json
"scripts": {
  "build:config": "node scripts/generate-config.js",
  "deploy": "npm run build:config && npx vercel --prod --yes"
}
```

2) `scripts/generate-config.js` (create this file):

```javascript
const fs = require('fs');
const key = process.env.GOOGLE_MAPS_API_KEY || '';
const content = `window.GOOGLE_MAPS_API_KEY = '${key.replace(/'/g, "\\'")}';\n`;
fs.writeFileSync('config.js', content, 'utf8');
console.log('Generated config.js');
```

3) When Vercel builds, ensure the `GOOGLE_MAPS_API_KEY` env var is present in the Project Settings so `npm run deploy` (or your pipeline) writes `config.js` before deployment.

Security note: Any key exposed to client-side JavaScript is discoverable by users — rely on HTTP-referrer restrictions and API restrictions.

## 4) Verify in browser

- Open the site in an Incognito window (to avoid extension injection noise).
- Confirm the Map loads in the `Collab` tab and no network errors related to Maps appear in Console.

## 5) Troubleshooting

- `Map unavailable (Google Maps failed to load)`: check key restrictions, billing, or that `config.js` is served.
- If you see `API key not valid` or `RefererNotAllowedMapError` — adjust HTTP referrers in Cloud Console.

If you want, I can:
- Add the `scripts/generate-config.js` and `package.json` `build:config` script and deploy using Vercel env (I will implement and run the deploy), OR
- Create `config.js` here if you paste the Maps key.

Choose which action you prefer and I'll proceed.
