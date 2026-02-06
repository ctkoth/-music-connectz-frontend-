const bcrypt = require('bcrypt');

// In-memory storage (shared across invocations)
const users = global.users || (global.users = new Map());

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId and password required' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    users.set(userId, hashedPassword);

    return res.status(200).json({ 
      success: true, 
      message: 'Password set successfully' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};
