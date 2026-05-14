require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const validator = require('validator');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://maps.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"]
    }
  }
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Serve Static Files
app.use(express.static('public'));
app.use(express.static('.'));

// Input Sanitization Middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = validator.escape(req.body[key]);
      }
    });
  }
  next();
};

// ============================================
// STRIPE PAYMENT ENDPOINTS
// ============================================

/**
 * POST /api/payments/create-checkout-session
 * Initialize Stripe Checkout session
 */
app.post('/api/payments/create-checkout-session', sanitizeInput, async (req, res) => {
  try {
    const { amount, currency = 'usd', userId } = req.body;

    // Validate input
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Music ConnectZ Wallet Funds',
              description: 'Add funds to your wallet',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?payment=cancelled`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        type: 'wallet_topup'
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 */
app.post('/api/payments/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful:', session.id);
      
      // TODO: Update user wallet in database
      // const userId = session.client_reference_id;
      // const amount = session.amount_total / 100;
      // await updateUserWallet(userId, amount);
      
      break;
    
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.error('Payment failed:', failedPayment.id);
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * GET /api/payments/transaction-history
 * Retrieve user transaction history
 */
app.get('/api/payments/transaction-history', async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // TODO: Fetch from database when implemented
    // For now, return mock data
    const mockTransactions = [
      {
        id: 'txn_1',
        date: new Date().toISOString(),
        amount: 100.00,
        currency: 'usd',
        status: 'succeeded',
        description: 'Wallet top-up',
        paymentMethod: 'card',
        last4: '4242'
      },
      {
        id: 'txn_2',
        date: new Date(Date.now() - 86400000).toISOString(),
        amount: 50.00,
        currency: 'usd',
        status: 'succeeded',
        description: 'Wallet top-up',
        paymentMethod: 'card',
        last4: '4242'
      }
    ];

    res.json({
      transactions: mockTransactions.slice(0, parseInt(limit)),
      total: mockTransactions.length
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// ============================================
// GOOGLE MAPS / LOCATION ENDPOINTS
// ============================================

/**
 * GET /api/locations/autocomplete
 * Google Places autocomplete
 */
app.get('/api/locations/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;

    if (!input || input.length < 3) {
      return res.status(400).json({ error: 'Input must be at least 3 characters' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: {
        input: input,
        key: apiKey,
        types: '(cities)'
      }
    });

    if (response.data.status === 'OK') {
      res.json({
        predictions: response.data.predictions.map(p => ({
          description: p.description,
          placeId: p.place_id,
          mainText: p.structured_formatting.main_text,
          secondaryText: p.structured_formatting.secondary_text
        }))
      });
    } else {
      res.status(400).json({ error: response.data.status });
    }
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to fetch autocomplete suggestions' });
  }
});

/**
 * POST /api/locations/reverse-geocode
 * Convert GPS coordinates to human-readable address
 */
app.post('/api/locations/reverse-geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${latitude},${longitude}`,
        key: apiKey
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const addressComponents = result.address_components;

      // Extract city, state, country
      const getComponent = (type) => {
        const component = addressComponents.find(c => c.types.includes(type));
        return component ? component.long_name : '';
      };

      res.json({
        formattedAddress: result.formatted_address,
        city: getComponent('locality') || getComponent('administrative_area_level_2'),
        state: getComponent('administrative_area_level_1'),
        country: getComponent('country'),
        postalCode: getComponent('postal_code'),
        coordinates: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        }
      });
    } else {
      res.status(400).json({ error: 'Location not found' });
    }
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  }
});

/**
 * GET /api/collaborations/nearby
 * Find collaborations by location proximity
 */
app.get('/api/collaborations/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // TODO: Fetch from database when implemented
    // For now, return mock data
    const mockCollaborations = [
      {
        id: 'collab_1',
        title: 'Looking for Beat Producer',
        description: 'Need a beat producer for hip-hop project',
        skills: ['Beat Production', 'Hip-Hop'],
        budget: 500,
        location: {
          city: 'Los Angeles',
          state: 'CA',
          latitude: 34.0522,
          longitude: -118.2437,
          distance: 5.2
        },
        user: {
          name: 'John Doe',
          persona: 'Indie Artist'
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'collab_2',
        title: 'Mix Engineer Needed',
        description: 'Looking for experienced mix engineer',
        skills: ['Mixing', 'Mastering'],
        budget: 800,
        location: {
          city: 'Los Angeles',
          state: 'CA',
          latitude: 34.0689,
          longitude: -118.4452,
          distance: 12.8
        },
        user: {
          name: 'Jane Smith',
          persona: 'Beat Producer'
        },
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    // Filter by radius (simple distance calculation)
    const filteredCollaborations = mockCollaborations.filter(collab => {
      return collab.location.distance <= radiusKm;
    });

    res.json({
      collaborations: filteredCollaborations,
      total: filteredCollaborations.length,
      radius: radiusKm,
      center: { latitude: lat, longitude: lng }
    });
  } catch (error) {
    console.error('Nearby collaborations error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby collaborations' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// SERVE INDEX.HTML FOR ALL OTHER ROUTES
// ============================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Music ConnectZ Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  
  // Check for required environment variables
  const requiredEnvVars = ['STRIPE_SECRET_KEY', 'GOOGLE_MAPS_API_KEY'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('⚠️  Some features may not work. Check .env.example');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
