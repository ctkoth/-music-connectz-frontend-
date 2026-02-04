const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'https://music-connectz-frontend.vercel.app',
    'https://musicconnectz.net',
    'https://*.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// In-memory storage (replace with database in production)
const users = new Map();
const resetTokens = new Map();

// Helper to generate auth token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and username required' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters' 
      });
    }

    // Check if user exists
    if (users.has(email.toLowerCase())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const token = generateToken();

    // Store user
    users.set(email.toLowerCase(), {
      userId,
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    console.log(`✓ User registered: ${email} (${username})`);

    res.json({
      success: true,
      message: 'Account created successfully',
      token,
      userId,
      username
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password required' 
      });
    }

    const user = users.get(email.toLowerCase());
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const token = generateToken();

    console.log(`✓ User logged in: ${email}`);

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
    res.status(500).json({ 
      success: false, 
      message: 'Login failed' 
    });
  }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email required' 
      });
    }

    const user = users.get(email.toLowerCase());
    
    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = generateToken();
    resetTokens.set(resetToken, {
      email: email.toLowerCase(),
      expires: Date.now() + 3600000 // 1 hour
    });

    // TODO: In production, send email here using nodemailer
    console.log(`🔐 Password reset token for ${email}: ${resetToken}`);
    
    res.json({
      success: true,
      message: 'Password reset link sent to email',
      resetToken: resetToken // Remove this in production (don't send token in response)
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Password reset failed' 
    });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and new password required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters' 
      });
    }

    const resetData = resetTokens.get(token);
    
    if (!resetData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    if (Date.now() > resetData.expires) {
      resetTokens.delete(token);
      return res.status(400).json({ 
        success: false, 
        message: 'Reset token expired' 
      });
    }

    const user = users.get(resetData.email);
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    users.set(resetData.email, user);
    
    // Delete used token
    resetTokens.delete(token);

    console.log(`✓ Password reset for: ${resetData.email}`);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Password reset failed' 
    });
  }
});

// POST /api/auth/set-password - Set password for existing user
app.post('/api/auth/set-password', async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and password required' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters' 
      });
    }

    // Find user by userId
    let userFound = null;
    for (let [email, user] of users) {
      if (user.userId === userId) {
        userFound = user;
        break;
      }
    }

    if (!userFound) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(password, 10);
    userFound.password = hashedPassword;
    users.set(userFound.email, userFound);

    console.log(`✓ Password set for user: ${userFound.email}`);

    res.json({
      success: true,
      message: 'Password set successfully'
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to set password' 
    });
  }
});

// POST /api/auth/verify-password - Verify user password
app.post('/api/auth/verify-password', async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and password required' 
      });
    }

    // Find user by userId
    let userFound = null;
    for (let [email, user] of users) {
      if (user.userId === userId) {
        userFound = user;
        break;
      }
    }

    if (!userFound) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, userFound.password);
    
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }

    console.log(`✓ Password verified for user: ${userFound.email}`);

    res.json({
      success: true,
      message: 'Password verified',
      userId: userFound.userId,
      username: userFound.username,
      email: userFound.email
    });
  } catch (error) {
    console.error('Verify password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify password' 
    });
  }
});

// ============================================
// HEALTH CHECK & INFO ROUTES
// ============================================

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// GET /api/auth/users - DEMO ONLY (remove in production)
app.get('/api/auth/users', (req, res) => {
  const userList = Array.from(users.values()).map(u => ({
    userId: u.userId,
    email: u.email,
    username: u.username,
    createdAt: u.createdAt
  }));
  
  res.json({
    totalUsers: users.size,
    users: userList
  });
});

// ============================================
// ERROR HANDLING - API ONLY
// ============================================

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// ============================================
// START SERVER
// ============================================

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🎵 MusicConnectZ Backend Server 🎵   ║
╠════════════════════════════════════════╣
║ Server running on: http://localhost:${PORT}  ║
║ Auth routes ready:                     ║
║   POST /api/auth/register              ║
║   POST /api/auth/login                 ║
║   POST /api/auth/forgot-password       ║
║   POST /api/auth/reset-password        ║
║ Health check: GET /api/health          ║
╚════════════════════════════════════════╝
  `);
  });
}

// Export for Vercel serverless
module.exports = app;
