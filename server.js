import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import bcrypt from 'bcrypt';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const domain = process.env.DOMAIN || `http://localhost:${port}`;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM_NUMBER;
const verificationDevMode = process.env.VERIFICATION_DEV_MODE === 'true';

if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY is missing. Set it in .env');
  process.exit(1);
}

const stripe = new Stripe(stripeSecret);
const emailTransporter = smtpHost && smtpUser && smtpPass
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass }
    })
  : null;

const twilioClient = twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null;

const emailCodes = new Map();
const phoneCodes = new Map();
const CODE_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '');
}

function canSend(store, key) {
  const rec = store.get(key);
  if (!rec) return { ok: true };
  const now = Date.now();
  if (rec.lastSentAt && now - rec.lastSentAt < COOLDOWN_MS) {
    return { ok: false, waitMs: COOLDOWN_MS - (now - rec.lastSentAt) };
  }
  return { ok: true };
}

function setCode(store, key, code) {
  store.set(key, {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    lastSentAt: Date.now(),
    attempts: 0
  });
}

function verifyCode(store, key, code) {
  const rec = store.get(key);
  if (!rec) return { ok: false, error: 'No code found' };
  if (Date.now() > rec.expiresAt) {
    store.delete(key);
    return { ok: false, error: 'Code expired' };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return { ok: false, error: 'Too many attempts' };
  }
  rec.attempts += 1;
  if (String(code).trim() !== rec.code) {
    return { ok: false, error: 'Invalid code' };
  }
  store.delete(key);
  return { ok: true };
}

// Middleware
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', time: new Date().toISOString() });
});

// Create checkout session
app.post('/api/create-checkout', async (req, res) => {
  try {
    const { amount, description, taxMode, customerEmail } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!description) {
      return res.status(400).json({ error: 'Description required' });
    }

    const sessionConfig = {
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: description },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/cancel`,
    };

    if (taxMode === 'automatic') {
      sessionConfig.automatic_tax = { enabled: true };
      sessionConfig.customer_update = { address: 'auto' };
    }

    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ url: session.url, sessionId: session.id, message: 'Checkout session created' });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Basic success/cancel placeholders
app.get('/success', (req, res) => {
  res.send('<h2>Payment successful 🎉</h2>');
});

app.get('/cancel', (req, res) => {
  res.send('<h2>Payment canceled. Try again.</h2>');
});

// Verification: Email
app.post('/api/verify/email/send', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    if (!emailTransporter || !smtpFrom) {
      return res.status(501).json({ error: 'Email provider not configured' });
    }
    const rate = canSend(emailCodes, email);
    if (!rate.ok) {
      return res.status(429).json({ error: 'Please wait before requesting another code', retryAfterMs: rate.waitMs });
    }

    const code = generateCode();
    setCode(emailCodes, email, code);

    await emailTransporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Music ConnectZ verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`
    });

    res.json({ ok: true, expiresInSec: Math.floor(CODE_TTL_MS / 1000), devCode: verificationDevMode ? code : undefined });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to send email verification code' });
  }
});

app.post('/api/verify/email/check', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
  const result = verifyCode(emailCodes, email, code);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

// Verification: SMS
app.post('/api/verify/sms/send', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!phone || phone.length < 7) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }
    if (!twilioClient || !twilioFrom) {
      return res.status(501).json({ error: 'SMS provider not configured' });
    }
    const rate = canSend(phoneCodes, phone);
    if (!rate.ok) {
      return res.status(429).json({ error: 'Please wait before requesting another code', retryAfterMs: rate.waitMs });
    }

    const code = generateCode();
    setCode(phoneCodes, phone, code);

    await twilioClient.messages.create({
      to: phone,
      from: twilioFrom,
      body: `Your Music ConnectZ verification code is ${code}. It expires in 10 minutes.`
    });

    res.json({ ok: true, expiresInSec: Math.floor(CODE_TTL_MS / 1000), devCode: verificationDevMode ? code : undefined });
  } catch (error) {
    console.error('SMS verification error:', error);
    res.status(500).json({ error: 'Failed to send SMS verification code' });
  }
});

app.post('/api/verify/sms/check', (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });
  const result = verifyCode(phoneCodes, phone, code);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

// Password validation and storage (for validation only, not persisted without backend database)
// Simple in-memory store for demonstration
const userPasswords = new Map();

// Validate password strength
function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return { ok: false, error: 'Password must contain at least one special character (!@#$%^&*)' };
  }
  return { ok: true };
}

// Set password for user
app.post('/api/auth/set-password', async (req, res) => {
  try {
    const { userId, password } = req.body || {};
    
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password required' });
    }

    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Store in memory (NOTE: This is not persisted without a database)
    userPasswords.set(userId, hashedPassword);

    res.json({ ok: true, message: 'Password set successfully (in-memory storage)' });
  } catch (error) {
    console.error('Password set error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Verify password for user
app.post('/api/auth/verify-password', async (req, res) => {
  try {
    const { userId, password } = req.body || {};
    
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password required' });
    }

    const hashedPassword = userPasswords.get(userId);
    if (!hashedPassword) {
      return res.status(404).json({ error: 'User or password not found' });
    }

    // Compare password with hashed version
    const isValid = await bcrypt.compare(password, hashedPassword);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    res.json({ ok: true, message: 'Password verified successfully' });
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at ${domain}`);
});
