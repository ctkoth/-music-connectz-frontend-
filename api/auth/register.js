const { bcrypt, users, generateToken } = require('../../api/_authShared');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
    const userId = crypto.randomUUID ? crypto.randomUUID() : generateToken();
    const token = generateToken();
    users.set(email.toLowerCase(), {
      userId,
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, message: 'Account created successfully', token, userId, username });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};
