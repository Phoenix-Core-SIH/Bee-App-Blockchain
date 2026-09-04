const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock KVIC users database
const kvicUsers = [
  { username: 'kvic_admin', password: 'password123', role: 'KVIC_ADMIN', scope: 'NATIONAL' },
  { username: 'kvic_karnataka', password: 'password123', role: 'KVIC_STATE', scope: 'Karnataka' },
  { username: 'kvic_coorg', password: 'password123', role: 'KVIC_DISTRICT', scope: 'Coorg' }
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(422).json({ error: 'Missing username or password' });
  }

  const user = kvicUsers.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = {
    username: user.username,
    role: user.role,
    scope: user.scope
  };

  const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev';
  const token = jwt.sign(payload, secret, { expiresIn: '8h' });

  res.json({ token, role: user.role, scope: user.scope });
});

module.exports = router;
