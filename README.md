# Taskly

A pastel task manager with login system — built with Node.js, Express, and SQLite.

---

## Project Structure

```
taskly/
├── server.js           ← Express app entry point
├── package.json
├── .env.example        ← Copy to .env and edit
├── routes/
│   ├── auth.js         ← Register, login, logout, /me
│   └── tasks.js        ← Full CRUD for tasks
├── src/
│   └── database.js     ← SQLite connection & schema setup
├── db/                 ← Auto-created; holds taskly.db & sessions.db
└── public/
    ├── index.html
    ├── assets/
    │   └── logo.png
    ├── css/
    │   └── style.css
    └── js/
        └── app.js      ← Frontend; talks to API via fetch()
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env and set a strong SESSION_SECRET
```

### 3. Run the server
```bash
# Development (auto-restarts on changes)
npm run dev

# Production
npm start
```

### 4. Open in browser
```
http://localhost:3000
```

The SQLite database file is created automatically at `db/taskly.db` on first run.

---

## API Reference

### Auth

| Method | Endpoint         | Body                        | Description        |
|--------|-----------------|-----------------------------|--------------------|
| POST   | /auth/register  | `{name, email, password}`   | Create account     |
| POST   | /auth/login     | `{email, password}`         | Log in             |
| POST   | /auth/logout    | —                           | Log out            |
| GET    | /auth/me        | —                           | Get current user   |

### Tasks (all require login)

| Method | Endpoint              | Body                            | Description        |
|--------|-----------------------|---------------------------------|--------------------|
| GET    | /tasks                | —                               | Get all my tasks   |
| POST   | /tasks                | `{text, note?, priority?}`      | Create task        |
| PUT    | /tasks/:id            | `{text?, note?, priority?}`     | Update task        |
| PATCH  | /tasks/:id/toggle     | —                               | Toggle done/undone |
| DELETE | /tasks/:id            | —                               | Delete task        |

---

## Upgrading to MySQL

To switch from SQLite to MySQL:
1. `npm install mysql2` and remove `better-sqlite3`
2. Replace `src/database.js` with a MySQL connection pool
3. Update queries from synchronous better-sqlite3 syntax to async/await with mysql2
