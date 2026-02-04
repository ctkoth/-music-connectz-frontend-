# 🔐 Add Password Authentication to Backend

## Quick Setup

Add these endpoints to your `music-connectz-backend` project:

### 1. Install bcrypt (if not already installed)

```bash
npm install bcrypt
```

### 2. Add routes to server.js

Add these routes to your existing `server.js`:

```javascript
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// In-memory user storage (replace with database later)
const users = new Map();
const resetTokens = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ success: false, message: 'Email, password, and username required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    if (users.has(email.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const token = generateToken();

    users.set(email.toLowerCase(), {
      userId,
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Account created successfully', token, userId });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = users.get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken();
    res.json({
      success: true,
      message: 'Login successful',
      token,
      userId: user.userId,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    const user = users.get(email.toLowerCase());
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
    }

    const resetToken = generateToken();
    resetTokens.set(resetToken, {
      email: email.toLowerCase(),
      expires: Date.now() + 3600000 // 1 hour
    });

    // TODO: Send email with reset link using nodemailer
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.json({ success: true, message: 'Password reset link sent to email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
});
```

### 3. Deploy to Vercel

```bash
git add .
git commit -m "Add password authentication endpoints"
git push
```

Vercel will auto-deploy in 30 seconds.

### 4. Test

Go to https://musicconnectz.net:
1. Click **🔐 Login**
2. Try logging in with email/password
3. Should work!

## 🔄 Upgrade to Database Later

This uses in-memory storage (resets on deploy). Later, add:
- **Supabase** (PostgreSQL, free tier)
- **MongoDB Atlas** (NoSQL, free tier)
- **Firebase Firestore** (NoSQL, free tier)

For now, this works for testing!

## ⚠️ Important

- Passwords are securely hashed with bcrypt
- In-memory storage means users reset on redeploy
- Add a real database for production
- Consider using Firebase Auth instead (handles everything)

## 🆚 Alternative: Use Firebase Auth

Firebase can handle password auth too:
1. Enable Email/Password in Firebase Console
2. No backend code needed
3. Persistent user storage
4. Built-in email verification

Want to switch to Firebase for passwords instead?
