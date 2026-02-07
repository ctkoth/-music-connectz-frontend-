const { bcrypt, users, generateToken } = require('../../api/_authShared');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
    res.json({ success: true, message: 'Login successful', token, userId: user.userId, username: user.username, email: user.email });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};
