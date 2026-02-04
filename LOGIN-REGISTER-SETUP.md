# ✅ Login & Register Backend Setup

Your frontend is now fully configured to use the backend authentication endpoints. Follow these steps to get everything working:

## 1. Install Dependencies

Make sure your backend has bcrypt installed:

```bash
cd music-connectz-backend
npm install bcrypt
```

## 2. Add Routes to Your Backend Server (server.js)

Add these routes to your Express server:

```javascript
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// In-memory storage (replace with database in production)
const users = new Map();
const resetTokens = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Register
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

    res.json({
      success: true,
      message: 'Account created successfully',
      token,
      userId,
      username
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login
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

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    const user = users.get(email.toLowerCase());
    
    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent'
      });
    }

    const resetToken = generateToken();
    resetTokens.set(resetToken, {
      email: email.toLowerCase(),
      expires: Date.now() + 3600000 // 1 hour
    });

    // In production, send email here using nodemailer
    console.log(`Password reset for ${email}: ${resetToken}`);
    
    res.json({
      success: true,
      message: 'Password reset link sent to email',
      resetToken: resetToken // Remove in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
});
```

## 3. Enable CORS (Important!)

Make sure your backend allows requests from your frontend domain:

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080', 'https://music-connectz.vercel.app'],
  credentials: true
}));
```

## 4. Test Login/Register

1. **Start your backend server:**
   ```bash
   node server.js
   ```
   Backend should run on `http://localhost:3000`

2. **Open your HTML file** in a browser

3. **Click 🔐 Login button**

4. **Test register:**
   - Click "Create One"
   - Fill in username, email, password (8+ chars)
   - Click "Create Account"

5. **Test login:**
   - Use the email/password you just created
   - You should see "✓ Login successful!"

## 5. What Changed in Frontend

✅ **Login now uses backend** instead of Firebase (which requires real API keys)
✅ **Register tab added** with validation
✅ **Password storage uses bcrypt** (hashed, secure)
✅ **Auth tokens stored in localStorage** for session management

## 6. Frontend Setup (Already Done)

- `index.html` - Added register tab and functions
- Backend URL auto-detects: `http://localhost:3000` (dev) or `https://music-connectz-backend.vercel.app` (production)

## Future Improvements

- [ ] Replace Map storage with MongoDB/PostgreSQL database
- [ ] Add email verification for registration
- [ ] Implement real password reset emails (nodemailer)
- [ ] Add JWT token verification middleware
- [ ] Add rate limiting to prevent brute force attacks
- [ ] Hash password reset tokens as well

---

**Ready to go!** Start your backend and test login/register. 🎉
