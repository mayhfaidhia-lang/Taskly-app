const express = require('express');
const { getDb } = require('../src/database');

const router = express.Router();

/* ── Auth guard middleware ── */
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

router.use(requireAuth);

/* ── GET /tasks  — list all tasks for current user ── */
router.get('/', (req, res) => {
  const db = getDb();
  const tasks = db.prepare(
    `SELECT id, text, note, priority, done, created_at
     FROM tasks
     WHERE user_id = ?
     ORDER BY done ASC,
              CASE priority WHEN 'high' THEN 0 WHEN 'mid' THEN 1 ELSE 2 END ASC,
              created_at DESC`
  ).all(req.session.userId);

  // Convert SQLite integer booleans to JS booleans
  res.json(tasks.map(t => ({ ...t, done: t.done === 1 })));
});

/* ── POST /tasks  — create a new task ── */
router.post('/', (req, res) => {
  const { text, note = '', priority = 'mid' } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Task text is required.' });
  }
  if (!['high', 'mid', 'low'].includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority value.' });
  }

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO tasks (user_id, text, note, priority) VALUES (?, ?, ?, ?)`
  ).run(req.session.userId, text.trim(), note.trim(), priority);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...task, done: task.done === 1 });
});

/* ── PUT /tasks/:id  — update task text, note, priority ── */
router.put('/:id', (req, res) => {
  const { text, note, priority } = req.body;
  const db = getDb();

  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.session.userId);

  if (!task) return res.status(404).json({ error: 'Task not found.' });
  if (priority && !['high', 'mid', 'low'].includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority value.' });
  }

  db.prepare(
    `UPDATE tasks SET
       text     = COALESCE(?, text),
       note     = COALESCE(?, note),
       priority = COALESCE(?, priority)
     WHERE id = ? AND user_id = ?`
  ).run(
    text ? text.trim() : null,
    note !== undefined ? note.trim() : null,
    priority || null,
    req.params.id,
    req.session.userId
  );

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ ...updated, done: updated.done === 1 });
});

/* ── PATCH /tasks/:id/toggle  — toggle done/undone ── */
router.patch('/:id/toggle', (req, res) => {
  const db = getDb();
  const task = db.prepare(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.session.userId);

  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const newDone = task.done === 1 ? 0 : 1;
  db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(newDone, req.params.id);

  res.json({ ...task, done: newDone === 1 });
});

/* ── DELETE /tasks/:id  — delete a task ── */
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM tasks WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.session.userId);

  if (result.changes === 0) return res.status(404).json({ error: 'Task not found.' });
  res.json({ ok: true });
});

module.exports = router;
