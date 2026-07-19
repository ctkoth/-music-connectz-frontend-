# 🔐 Music ConnectZ — OAuth & Keys Setup Guide

Every provider is **verified server-side** (Google id-token, GitHub code exchange,
Apple JWT against Apple's keys) and each **fails closed** when its client id isn't
configured — so nothing works until you set the env vars below on the backend
(Render → your service → **Environment**).

Backend base URL below is written as `https://api.musicconnectz.net` — replace with
your real API domain. Frontend/app is `https://musicconnectz.net`.

---

## 1. 🟦 Google Sign-In
**Console:** https://console.cloud.google.com/apis/credentials
1. Create/select a project → **OAuth consent screen** → External → fill app name, support email, logo, and the authorized domain `musicconnectz.net`.
2. **Credentials → Create Credentials → OAuth client ID → Web application.**
3. **Authorized JavaScript origins:**
   - `https://musicconnectz.net`
   - `http://localhost:5173` (dev)
4. **Authorized redirect URIs:** (Google Identity Services returns a credential to your page, but add these for the code flow)
   - `https://musicconnectz.net`
   - `https://api.musicconnectz.net/api/auth/oauth/google/`
5. Copy the **Client ID**.

**Env var (backend):**
```
GOOGLE_OAUTH_CLIENT_ID=<xxxx>.apps.googleusercontent.com
```
> For the iOS/Android native builds, also create **Android** and **iOS** OAuth client
> IDs in the same console (Android needs your signing SHA-1; iOS needs the bundle id
> `net.musicconnectz.app`).

---

## 2. ⬛ GitHub Sign-In
**Console:** https://github.com/settings/developers → **OAuth Apps → New OAuth App**
1. **Homepage URL:** `https://musicconnectz.net`
2. **Authorization callback URL:** `https://api.musicconnectz.net/api/auth/oauth/github/`
3. Register → copy **Client ID**, then **Generate a new client secret**.

**Env vars (backend):**
```
GITHUB_OAUTH_CLIENT_ID=<client id>
GITHUB_OAUTH_CLIENT_SECRET=<client secret>
```

---

## 3.  Apple Sign In  (required by Apple if you offer any other social login)
**Console:** https://developer.apple.com/account/resources
1. **Identifiers → +** → **App IDs** → App → bundle id `net.musicconnectz.app`, enable **Sign In with Apple**.
2. **Identifiers → +** → **Services IDs** → e.g. `net.musicconnectz.web` → enable **Sign In with Apple → Configure**:
   - **Domains:** `musicconnectz.net`
   - **Return URLs:** `https://api.musicconnectz.net/api/auth/oauth/apple/`
3. **Keys → +** → enable **Sign In with Apple**, download the `.p8` key (store it safely).
4. The **audience** the backend verifies is the **Services ID** (for web) / **App ID** (for native).

**Env var (backend):**
```
APPLE_OAUTH_CLIENT_ID=net.musicconnectz.web   # the Services ID (web) / App ID (native)
```
> The current backend verifies the Apple **identity token** (audience + issuer). Full
> server-to-server token exchange additionally needs the Team ID, Key ID, and `.p8`
> contents — add `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` if/when you wire
> the code-exchange flow.

---

## 4. 💳 Payment keys (from the payment audit)
**Stripe** — https://dashboard.stripe.com/apikeys and .../webhooks
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...        # from the webhook endpoint you register
```
Webhook endpoint to add in Stripe → **Developers → Webhooks**:
`https://api.musicconnectz.net/api/economy/webhooks/stripe/`
Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`.
> No Stripe Product/Price IDs needed — charges use inline `price_data`.

**PayPal** — https://developer.paypal.com/dashboard/applications
```
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
PAYPAL_MODE=live                       # or "sandbox"
PAYPAL_WEBHOOK_ID=...                  # from the webhook you create
```
Webhook endpoint to add in PayPal → **Apps → your app → Webhooks**:
`https://api.musicconnectz.net/api/economy/webhooks/paypal/`
Events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`.

---

## 5. 🛠️ Platform + owner
```
SECRET_KEY=<random 50+ chars>          # 🔴 REQUIRED — sessions/tokens are forgeable without it
FRONTEND_URL=https://musicconnectz.net
ALLOWED_HOSTS=api.musicconnectz.net,musicconnectz.net
OWNER_EMAILS=ctkoth@gmail.com          # auto-promotes this account to owner + StatZ
```

---

## 6. ✅ Full backend env checklist (copy/paste into Render)
```
SECRET_KEY=
FRONTEND_URL=https://musicconnectz.net
ALLOWED_HOSTS=api.musicconnectz.net,musicconnectz.net
OWNER_EMAILS=ctkoth@gmail.com

GOOGLE_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
APPLE_OAUTH_CLIENT_ID=

STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_MODE=live
PAYPAL_WEBHOOK_ID=
```
Leave any provider blank to keep it disabled — its button reports "unavailable"
instead of breaking the app.
