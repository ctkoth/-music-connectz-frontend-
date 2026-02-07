const { bcrypt, users, resetTokens } = require('../../api/_authShared');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const resetData = resetTokens.get(token);
    if (!resetData) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    if (Date.now() > resetData.expires) {
      resetTokens.delete(token);
      return res.status(400).json({ success: false, message: 'Reset token expired' });
    }
    const user = users.get(resetData.email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    users.set(resetData.email, user);
    resetTokens.delete(token);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};
