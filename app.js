/* ── Taskly Frontend — talks to Express/SQLite backend ── */

const PRIO_COLOR = { high: '#F4AECF', mid: '#FFB38A', low: '#C4A8E8' };

let tasks         = [];
let currentFilter = 'all';
let editingId     = null;
let selPriority   = 'mid';

/* ────────────────────────────────────────────
   Helpers
──────────────────────────────────────────── */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/* ────────────────────────────────────────────
   Screen switching
──────────────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ────────────────────────────────────────────
   Auth
──────────────────────────────────────────── */
// Switch between login / signup tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const t = tab.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('login-form').style.display  = t === 'login'  ? 'block' : 'none';
    document.getElementById('signup-form').style.display = t === 'signup' ? 'block' : 'none';
    document.getElementById('login-error').textContent  = '';
    document.getElementById('signup-error').textContent = '';
  });
});

// Login
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const data = await api('POST', '/auth/login', {
      email:    document.getElementById('login-email').value,
      password: document.getElementById('login-pass').value
    });
    enterApp(data.name);
  } catch (err) {
    errEl.textContent = err.message;
  }
});

// Signup
document.getElementById('signup-form').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('signup-error');
  errEl.textContent = '';
  try {
    const data = await api('POST', '/auth/register', {
      name:     document.getElementById('su-name').value,
      email:    document.getElementById('su-email').value,
      password: document.getElementById('su-pass').value
    });
    enterApp(data.name);
  } catch (err) {
    errEl.textContent = err.message;
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('POST', '/auth/logout');
  tasks = [];
  showScreen('auth-screen');
});

/* ────────────────────────────────────────────
   Enter app
──────────────────────────────────────────── */
async function enterApp(name) {
  const first = name.split(' ')[0];
  document.getElementById('greeting').textContent  = `Hey, ${first}!`;
  document.getElementById('user-avatar').textContent = first[0].toUpperCase();
  await loadTasks();
  showScreen('app-screen');
}

/* ────────────────────────────────────────────
   Tasks
──────────────────────────────────────────── */
async function loadTasks() {
  tasks = await api('GET', '/tasks');
  renderAll();
}

function filtered() {
  return tasks.filter(t => {
    if (currentFilter === 'todo') return !t.done;
    if (currentFilter === 'done') return  t.done;
    if (currentFilter === 'high') return t.priority === 'high';
    if (currentFilter === 'mid')  return t.priority === 'mid';
    if (currentFilter === 'low')  return t.priority === 'low';
    return true;
  });
}

function renderAll() {
  // Stats
  const done = tasks.filter(t => t.done).length;
  document.getElementById('stat-total').textContent = tasks.length;
  document.getElementById('stat-done').textContent  = done;
  document.getElementById('stat-left').textContent  = tasks.length - done;
  renderList();
}

function renderList() {
  const list  = document.getElementById('task-list');
  const items = filtered();

  if (!items.length) {
    list.innerHTML = '<div class="empty-state">No tasks here yet. Add one above.</div>';
    return;
  }

  list.innerHTML = items.map(t => `
    <div class="task-item${t.done ? ' done' : ''}" id="ti-${t.id}">
      <button class="check-btn${t.done ? ' checked' : ''}"
              onclick="toggleTask(${t.id})"
              aria-label="${t.done ? 'Mark incomplete' : 'Mark complete'}">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <polyline points="2,6 5,9 10,3" stroke="white" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="task-body">
        <div class="task-text">${esc(t.text)}</div>
        ${t.note ? `<div class="task-note">${esc(t.note)}</div>` : ''}
      </div>
      <div class="priority-dot" style="background:${PRIO_COLOR[t.priority]}"></div>
      <div class="task-actions">
        <button class="act-btn"     onclick="openEdit(${t.id})"   aria-label="Edit">✏️</button>
        <button class="act-btn del" onclick="deleteTask(${t.id})" aria-label="Delete">🗑</button>
      </div>
    </div>
  `).join('');
}

async function toggleTask(id) {
  const updated = await api('PATCH', `/tasks/${id}/toggle`);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) tasks[idx] = updated;
  renderAll();
}

async function deleteTask(id) {
  await api('DELETE', `/tasks/${id}`);
  tasks = tasks.filter(t => t.id !== id);
  renderAll();
}

/* ────────────────────────────────────────────
   Filters
──────────────────────────────────────────── */
document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
});

/* ────────────────────────────────────────────
   Quick add (Enter in input bar)
──────────────────────────────────────────── */
const newTaskInput = document.getElementById('new-task');

newTaskInput.addEventListener('keydown', async e => {
  if (e.key !== 'Enter') return;
  const text = newTaskInput.value.trim();
  if (!text) return;
  const task = await api('POST', '/tasks', { text, priority: 'mid' });
  tasks.unshift(task);
  newTaskInput.value = '';
  renderAll();
});

document.getElementById('open-add-btn').addEventListener('click', () => {
  openAddModal();
});

/* ────────────────────────────────────────────
   Modal
──────────────────────────────────────────── */
const overlay = document.getElementById('modal-overlay');

function openAddModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add task';
  document.getElementById('modal-task-name').value = newTaskInput.value || '';
  document.getElementById('modal-task-note').value = '';
  setPriority('mid');
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('modal-task-name').focus(), 50);
}

function openEdit(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit task';
  document.getElementById('modal-task-name').value = t.text;
  document.getElementById('modal-task-note').value = t.note || '';
  setPriority(t.priority);
  overlay.classList.add('open');
  setTimeout(() => document.getElementById('modal-task-name').focus(), 50);
}

function closeModal() {
  overlay.classList.remove('open');
  newTaskInput.value = '';
}

function setPriority(p) {
  selPriority = p;
  ['high', 'mid', 'low'].forEach(x => {
    const btn = document.getElementById(`p-${x}`);
    btn.className = 'p-btn' + (x === p ? ` sel-${x}` : '');
  });
}

// Priority button clicks
document.querySelectorAll('.p-btn').forEach(btn => {
  btn.addEventListener('click', () => setPriority(btn.dataset.p));
});

// Save
document.getElementById('modal-save').addEventListener('click', async () => {
  const text = document.getElementById('modal-task-name').value.trim();
  if (!text) return;
  const note     = document.getElementById('modal-task-note').value.trim();
  const priority = selPriority;

  if (editingId) {
    const updated = await api('PUT', `/tasks/${editingId}`, { text, note, priority });
    const idx = tasks.findIndex(t => t.id === editingId);
    if (idx !== -1) tasks[idx] = updated;
  } else {
    const task = await api('POST', '/tasks', { text, note, priority });
    tasks.unshift(task);
  }

  closeModal();
  renderAll();
});

// Cancel
document.getElementById('modal-cancel').addEventListener('click', closeModal);

// Click outside modal
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

// Keyboard
document.getElementById('modal-task-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('modal-save').click();
  if (e.key === 'Escape') closeModal();
});

/* ────────────────────────────────────────────
   Init — check if already logged in
──────────────────────────────────────────── */
(async () => {
  try {
    const me = await api('GET', '/auth/me');
    enterApp(me.name);
  } catch {
    showScreen('auth-screen');
  }
})();
