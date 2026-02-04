// Authentication endpoints for MusicConnectZ backend
// Add this to your server.js or create a separate auth routes file

const bcrypt = require('bcrypt');
const crypto = require('crypto');

// In-memory storage (replace with database in production)
const users = new Map();
const resetTokens = new Map();

// Helper to generate auth token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/register
async function handleRegister(req, res) {
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

    res.json({
      success: true,
      message: 'Account created successfully',
      token,
      userId
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
}

// POST /api/auth/login
async function handleLogin(req, res) {
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
}

// POST /api/auth/forgot-password
async function handleForgotPassword(req, res) {
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

    // In production, send email here using nodemailer
    console.log(`Password reset for ${email}: ${resetToken}`);
    
    // For now, just return success
    res.json({
      success: true,
      message: 'Password reset link sent to email',
      // Remove this in production:
      resetToken: resetToken
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Password reset failed' 
    });
  }
}

// POST /api/auth/reset-password
async function handleResetPassword(req, res) {
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
}

// Export functions
module.exports = {
  handleRegister,
  handleLogin,
  handleForgotPassword,
  handleResetPassword
};
