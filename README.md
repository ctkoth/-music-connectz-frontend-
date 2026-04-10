# 🎵 Music ConnectZ Monorepo & Frontend

This monorepo contains:
- **web**: The Music ConnectZ web app (React or static)
- **mobile**: The React Native app (Android/iOS)
- **shared**: Shared assets (icons, images) and code (utilities, API logic)

Location-based music collaboration platform with integrated Stripe payments and automatic tax collection.

## 🌟 Features

- **Profile Management** - Create and customize your music professional profile
- **Multi-Persona System** - Set up profiles as indie artist, producer, engineer, designer, or videographer
- **Portfolio System** - Upload and showcase your work examples
- **Location-Based Discovery** - Find collaborators near you using GPS
- **Stripe Payments** - Accept payments with automatic tax calculation
- **💎 Premium Per-Second Earnings** - Enable premium mode to earn money every second viewers watch your content
- **Dark Mode** - Toggle between light and dark themes
- **Customizable Colors** - Choose from 9 color themes

## Structure
```
packages/
  web/           # Web app code
  mobile/
    MusicConnectZ/  # React Native app code
  shared/
    assets/      # Shared images/icons
    ...          # Shared JS/TS code
```

## How to Use
- Install dependencies for all packages:
  ```
  yarn install
  # or
  npm install
  ```
- Run the web app:
  (see packages/web/README.md)
- Run the mobile app:
  (see packages/mobile/MusicConnectZ/README.md)

## Shared Assets
Import images/assets from `packages/shared/assets` in both apps.

## 📁 Files

- `index.html` - Main application (single-page HTML app)
- `app-config.js` - Runtime backend API URL configuration
- `stripe-config.js` - Stripe payment integration configuration

---

For any questions or to add new shared code, just ask Corey! 😏🎤✨

**Live Site:** https://music-connectz-backend-2.onrender.com/

## 💻 Run Locally

1. Clone this repository
2. Open `index.html` in any modern web browser
3. No build process or server required!

## 💳 Payment Integration

This frontend connects to the Music ConnectZ Stripe backend for payment processing:

**Backend:** https://music-connectz-backend-2.onrender.com

### Test Payments
Use Stripe test card:
- **Card:** 4242 4242 4242 4242
- **Expiry:** Any future date (e.g., 12/25)
- **CVC:** Any 3 digits (e.g., 123)

## 🔧 Configuration

The backend URL is configured in `public/app-config.js`:
```javascript
window.MCZ_CONFIG.backendUrl = 'https://music-connectz-backend-2.onrender.com';
```

To use a different backend, update this URL.

## ✅ Operability Checklist

To make the frontend fully operational in production:

1. Set `public/app-config.js` to the correct backend origin.
2. Configure backend CORS to allow your frontend origins.
3. Ensure backend responds to `OPTIONS` preflight for auth routes.
4. Allow headers: `Content-Type`, `Authorization`.
5. Allow methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
6. If using cookies/session auth, enable credentials and avoid wildcard origin.

## 💎 Premium Per-Second Earnings

Enable premium mode to monetize your content by earning money for every second viewers watch your work.

### How It Works

1. **Enable Premium**: Go to Settings → Premium Features and toggle "Premium Earnings Enabled"
2. **Set Your Rate**: Configure how much you want to earn per second (default: $0.01/sec = $0.60/min = $36/hr)
3. **Upload Content**: Your work examples will now track viewing time and earnings
4. **Earn Automatically**: When viewers play your content, you earn per second of watch time
5. **Track Earnings**: View detailed analytics including views, watch time, and earnings per example

### Premium Features

- ⏱️ **Real-time Tracking**: Earnings update every second while content is being viewed
- 📊 **Analytics Dashboard**: View stats per example (views, watch time, total earnings)
- 💰 **Automatic Payments**: Earnings automatically added to your wallet
- 🎯 **Customizable Rates**: Set your own per-second rate ($0.0001 - $1.00)
- 📈 **Total Earnings Display**: Track cumulative premium earnings across all content
