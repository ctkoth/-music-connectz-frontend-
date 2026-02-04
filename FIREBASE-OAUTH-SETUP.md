# 🔐 Firebase OAuth Setup for MusicConnectZ

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click **Add project**
3. Name it: `MusicConnectZ`
4. Disable Google Analytics (optional)
5. Click **Create project**

## Step 2: Enable Authentication

1. In Firebase Console, click **Authentication** in left sidebar
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable these providers:

### Google
- Click **Google** → **Enable** → **Save**

### Facebook
- Click **Facebook** → **Enable**
- Get App ID & Secret from https://developers.facebook.com/
- Click **Create App** → **Consumer** → Name it `MusicConnectZ`
- Go to Settings → Basic → copy **App ID** and **App Secret**
- Paste into Firebase
- Copy the **OAuth redirect URI** from Firebase
- In Facebook App, go to Facebook Login → Settings → paste the redirect URI
- Click **Save**

### Apple
- Click **Apple** → **Enable**
- Requires Apple Developer account ($99/year)
- Follow Firebase instructions to set up Service ID

### GitHub
- Click **GitHub** → **Enable**
- Go to https://github.com/settings/developers
- Click **New OAuth App**
  - Name: `MusicConnectZ`
  - Homepage URL: `https://musicconnectz.net`
  - Authorization callback URL: (copy from Firebase)
- Click **Register application**
- Copy **Client ID** and generate a **Client Secret**
- Paste into Firebase → **Save**

## Step 3: Add Web App to Firebase

1. In Firebase Console, click the **Settings gear** → **Project settings**
2. Scroll down to **Your apps** → click **</>** (Web icon)
3. Register app: `MusicConnectZ Web`
4. **Firebase Hosting**: Skip for now (we're using Vercel)
5. Click **Continue to console**

## Step 4: Get Firebase Config

1. In **Project settings** → **Your apps** → **Web app**
2. Copy the config object:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "musicconnectz.firebaseapp.com",
  projectId: "musicconnectz-xxxxx",
  storageBucket: "musicconnectz-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 5: Update Your Code

1. Open `firebase-config.js`
2. Replace the placeholder config with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. Save the file

## Step 6: Add Authorized Domains

1. In Firebase Console → **Authentication** → **Settings** tab
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. Add: `musicconnectz.net`
5. Add: `music-connectz-frontend-1giy.vercel.app` (for testing)

## Step 7: Deploy & Test

```powershell
cd "C:\Users\ctkot\OneDrive\Documents\music connectz"
git add .
git commit -m "Add Firebase OAuth authentication"
git push
```

Wait 30 seconds for Vercel to deploy, then test:
- Go to https://musicconnectz.net
- Click **🔐 Login**
- Click any OAuth button (Google, Facebook, etc.)
- Sign in with your account
- You should be authenticated!

## ✅ What You Get

- **Google Sign-In**: Instant, works out of the box
- **Facebook**: Requires Facebook App setup
- **Apple**: Requires Apple Developer account
- **GitHub**: Quick to set up, no fees

## 🔧 Troubleshooting

**"Firebase not loaded"**: Clear cache and reload page

**"Popup blocked"**: Allow popups for musicconnectz.net in browser

**"Domain not authorized"**: Add your domain in Firebase Console → Authentication → Settings → Authorized domains

**"Invalid API key"**: Double-check your firebaseConfig in firebase-config.js

## 💡 Next Steps

Once working, you can:
- Store user data in Firestore (Firebase database)
- Add email/password authentication
- Add phone authentication (SMS)
- Customize OAuth provider scopes
- Add multi-factor authentication

## 📝 Notes

- Google OAuth works immediately after enabling
- Facebook requires app review for public use
- Apple requires paid developer account
- GitHub is free and easy to set up
