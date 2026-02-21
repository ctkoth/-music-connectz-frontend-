# 🎵 Music ConnectZ Frontend

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

## 📁 Files

- `index.html` - Main application (single-page HTML app)
- `stripe-config.js` - Stripe payment integration configuration

## 🚀 Live Demo

**Live Site:** https://music-connectz-backend.vercel.app/

## 💻 Run Locally

1. Clone this repository
2. Open `index.html` in any modern web browser
3. No build process or server required!

## 💳 Payment Integration

This frontend connects to the Music ConnectZ Stripe backend for payment processing:

**Backend:** https://music-connectz-backend.vercel.app

### Test Payments
Use Stripe test card:
- **Card:** 4242 4242 4242 4242
- **Expiry:** Any future date (e.g., 12/25)
- **CVC:** Any 3 digits (e.g., 123)

## 🔧 Configuration

The backend URL is configured in `stripe-config.js`:
```javascript
let backendUrl = 'https://music-connectz-backend.vercel.app';
```

To use a different backend, update this URL.

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

### Rate Examples

- **$0.01/sec** = $0.60/min = $36/hr
- **$0.05/sec** = $3.00/min = $180/hr
- **$0.10/sec** = $6.00/min = $360/hr

## 📦 Deployment

### Vercel (Current)

1. Deployed on Vercel at https://music-connectz-backend.vercel.app/
2. Automatic deployments on push to main
3. No build settings needed

### Alternative: GitHub Pages

1. Enable GitHub Pages in repo Settings → Pages
2. Source: Deploy from branch
3. Branch: main / (root)
4. Site will be live at: `https://[username].github.io/[repo-name]/`

### Alternative: Netlify

1. Drag & drop the files to Netlify
2. Or connect the GitHub repo
3. Deploy

## 🛠️ Tech Stack

- **Frontend:** Pure HTML, CSS, JavaScript (no frameworks)
- **Payments:** Stripe Checkout API
- **Maps:** Leaflet.js + OpenStreetMap
- **Hosting:** Vercel
- **Backend:** Node.js/Express on Vercel

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers supported

## 🔐 Security

- All sensitive API keys are on the backend
- Only publishable Stripe key is in frontend
- Payment processing handled server-side
- No sensitive data stored in localStorage

## 📄 License

MIT

## 👤 Author

Created by ctkoth

## 🔗 Related

- **Backend Repo:** https://github.com/ctkoth/music-connectz-backend
- **Stripe Dashboard:** https://dashboard.stripe.com/
