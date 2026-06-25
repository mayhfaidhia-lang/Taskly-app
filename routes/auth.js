const express = require('express');
const bcrypt  = require('bcryptjs');
const { getDb } = require('../src/database');

const router = express.Router();

/* ── POST /auth/register ── */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
  ).run(name.trim(), email.toLowerCase(), hash);

  // Create a welcome task for new users
  db.prepare(
    `INSERT INTO tasks (user_id, text, note, priority) VALUES (?, ?, ?, ?)`
  ).run(result.lastInsertRowid, 'Welcome to Taskly! Start by adding your first task.', 'Click the pencil icon to edit me', 'low');

  req.session.userId = result.lastInsertRowid;
  req.session.userName = name.trim();

  res.json({ ok: true, name: name.trim() });
});

/* ── POST /auth/login ── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  const valid = user && await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  req.session.userId = user.id;
  req.session.userName = user.name;

  res.json({ ok: true, name: user.name });
});

/* ── POST /auth/logout ── */
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

/* ── GET /auth/me ── */
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  res.json({ id: req.session.userId, name: req.session.userName });
});

module.exports = router;
