# Music ConnectZ Documentation

## Classic Frontend (v5.5d)

A production-ready platform for music industry professionals featuring Google Maps integration, Stripe payment processing, and comprehensive accessibility features.

### Core Features
- 🎵 User profile management with GPS location support
- 👥 Multiple personas (Indie Artist, Beat Producer, Mix Engineer, Designer, Videographer)
- 🎨 Skills management and work examples upload
- 🤝 Collaboration board with advanced filtering
- 💰 Wallet management and income tracking
- 🌓 Dark/Light theme toggle
- 📱 Fully responsive mobile design

### New Integrations
- 🗺️ **Google Maps API**: Address autocomplete, reverse geocoding, collaboration map view
- 💳 **Stripe Payments**: Secure payment processing, transaction history, webhook handling
- ♿ **WCAG 2.1 AA Accessibility**: Full keyboard navigation, screen reader support, high contrast mode
- ✅ **Enhanced Validation**: Real-time form validation with user-friendly error messages
- 🔒 **Security**: Input sanitization, rate limiting, HTTPS enforcement, secure API key management

### Monorepo & Modern Structure

This monorepo contains:
- **web**: The Music ConnectZ web app (React or static)
- **mobile**: The React Native app (Android/iOS)
- **shared**: Shared assets (icons, images) and code (utilities, API logic)

Location-based music collaboration platform with integrated Stripe payments and automatic tax collection.

#### Features (Monorepo)
- **Profile Management** - Create and customize your music professional profile
- **Multi-Persona System** - Set up profiles as indie artist, producer, engineer, designer, or videographer
- **Portfolio System** - Upload and showcase your work examples
- **Location-Based Discovery** - Find collaborators near you using GPS
- **Stripe Payments** - Accept payments with automatic tax calculation
- 💎 Premium Per-Second Earnings - Enable premium mode to earn money every second viewers watch your content
- **Dark Mode** - Toggle between light and dark themes
- **Customizable Colors** - Choose from 9 color themes

#### Project Structure
```
music-connectz-frontend/
├── public/
│   ├── css/
│   │   ├── style.css              # Main styles
│   │   └── accessibility.css      # Accessibility-specific styles
│   ├── js/
│   │   ├── maps.js               # Google Maps utilities
│   │   ├── payments.js           # Stripe payment handling
│   │   └── validation.js         # Form validation utilities
│   └── uploads/                  # User uploaded files (gitignored)
├── server.js                     # Express backend
├── index.html                    # Main application
├── package.json                  # Dependencies
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── README.md                     # This file
├── packages/                     # Monorepo structure (web, mobile, shared)
```

#### How to Use
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

#### Shared Assets
Import images/assets from `packages/shared/assets` in both apps.

#### Files
- `index.html` - Main application (single-page HTML app)
- `app-config.js` - Runtime backend API URL configuration
- `stripe-config.js` - Stripe payment integration configuration

#### Live Site
**Live Site:** https://music-connectz-backend-2.onrender.com/

#### Run Locally
1. Clone this repository
2. Open `index.html` in any modern web browser
3. No build process or server required!

#### Payment Integration
This frontend connects to the Music ConnectZ Stripe backend for payment processing:
**Backend:** https://music-connectz-backend-2.onrender.com

##### Test Payments
Use Stripe test card:
- **Card:** 4242 4242 4242 4242
- **Expiry:** Any future date (e.g., 12/25)
- **CVC:** Any 3 digits (e.g., 123)

#### Configuration
The backend URL is configured in `public/app-config.js`:
```javascript
window.MCZ_CONFIG.backendUrl = 'https://music-connectz-backend-2.onrender.com';
```
To use a different backend, update this URL.

#### Operability Checklist
To make the frontend fully operational in production:
1. Set `public/app-config.js` to the correct backend origin.
2. Configure backend CORS to allow your frontend origins.
3. Ensure backend responds to `OPTIONS` preflight for auth routes.
4. Allow headers: `Content-Type`, `Authorization`.
5. Allow methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
6. If using cookies/session auth, enable credentials and avoid wildcard origin.

#### Premium Per-Second Earnings
Enable premium mode to monetize your content by earning money for every second viewers watch your work.

##### How It Works
1. **Enable Premium**: Go to Settings → Premium Features and toggle "Premium Earnings Enabled"
2. **Set Your Rate**: Configure how much you want to earn per second (default: $0.01/sec = $0.60/min = $36/hr)
3. **Upload Content**: Your work examples will now track viewing time and earnings
4. **Earn Automatically**: When viewers play your content, you earn per second of watch time
5. **Track Earnings**: View detailed analytics including views, watch time, and earnings per example

##### Premium Features
- ⏱️ **Real-time Tracking**: Earnings update every second while content is being viewed
- 📊 **Analytics Dashboard**: View stats per example (views, watch time, total earnings)
- 💰 **Automatic Payments**: Earnings automatically added to your wallet
- 🎯 **Customizable Rates**: Set your own per-second rate ($0.0001 - $1.00)
- 📈 **Total Earnings Display**: Track cumulative premium earnings across all content

---

## Security Features
- 🔒 Input sanitization to prevent XSS attacks
- 🔒 File upload validation (type, size, content)
- 🔒 CORS configuration with whitelist
- 🔒 Rate limiting to prevent abuse
- 🔒 Helmet.js for secure HTTP headers
- 🔒 Environment variables for sensitive data
- 🔒 HTTPS enforcement in production

## Accessibility Features
- ♿ WCAG 2.1 AA compliance
- ♿ Full keyboard navigation (Tab, Enter, Escape)
- ♿ Screen reader support with ARIA labels
- ♿ High contrast mode toggle
- ♿ Focus management with visual indicators
- ♿ Color blindness support

## Deployment
### Environment Variables for Production
Ensure all environment variables in `.env` are set:
- Change `NODE_ENV` to `production`
- Use production Stripe keys
- Configure production webhook URL
- Set secure `SESSION_SECRET`
- Update `FRONTEND_URL` to your domain

### Deploy to Azure
1. Create an Azure Web App
2. Configure environment variables in Application Settings
3. Enable HTTPS Only
4. Deploy using GitHub Actions (workflow included)

### Deploy to Other Platforms
- **Heroku**: Use Heroku CLI or GitHub integration
- **AWS**: Use Elastic Beanstalk or EC2
- **DigitalOcean**: Use App Platform
- **Vercel/Netlify**: For frontend only (separate backend deployment needed)

## Development
### Running in Development Mode
```bash
npm run dev
```
This uses nodemon for auto-restart on file changes.

### Testing Stripe Webhooks Locally
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook

# Test a payment
stripe trigger payment_intent.succeeded
```

### Testing Google Maps
Ensure your API key has the following APIs enabled:
- Maps JavaScript API
- Places API
- Geocoding API

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License.

## Support
For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review API documentation (Stripe, Google Maps)

## Changelog
### v5.5.0 (2026-02-04)
- ✅ Added Google Maps API integration
- ✅ Added Stripe payment processing
- ✅ Enhanced accessibility (WCAG 2.1 AA)
- ✅ Improved validation and error handling
- ✅ Security enhancements
- ✅ Backend API with Express
- ✅ Enhanced UI/UX with dark mode refinements

### v5.5d (Base)
- Initial Music ConnectZ application
- User profiles and personas
- Collaboration board
- LocalStorage persistence
- Dark/Light theme

## Acknowledgments
- Stripe for payment processing
- Google Maps Platform for location services
- Express.js community
- Open source contributors
