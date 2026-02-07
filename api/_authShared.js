const bcrypt = require('bcrypt');
const crypto = require('crypto');

// In-memory storage (shared across invocations)
const users = global.users || (global.users = new Map());
const resetTokens = global.resetTokens || (global.resetTokens = new Map());

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { bcrypt, users, resetTokens, generateToken };
