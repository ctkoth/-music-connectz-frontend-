const { users, resetTokens, generateToken } = require('../../api/_authShared');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
    resetTokens.set(resetToken, { email: email.toLowerCase(), expires: Date.now() + 3600000 });
    // In production, send email here
    res.json({ success: true, message: 'Password reset link sent to email', resetToken });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};
