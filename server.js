const express        = require('express');
const session        = require('express-session');
const SQLiteStore    = require('connect-sqlite3')(session);
const path           = require('path');
const fs             = require('fs');

const authRoutes     = require('./routes/auth');
const taskRoutes     = require('./routes/tasks');

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: dbDir }),
  secret: process.env.SESSION_SECRET || 'taskly-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

/* ── Routes ── */
app.use('/auth',  authRoutes);
app.use('/tasks', taskRoutes);

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`\n  Taskly running at http://localhost:${PORT}\n`);
});
