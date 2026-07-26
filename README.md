# Jarvis

> A personal planner with a React frontend and a Node.js API — runs offline out of the box, no database setup required.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

Jarvis is a planning and task-management app built to be trivially easy to start.
It ships with **PGlite** — an embedded Postgres that runs inside Node — so a fresh
clone boots with a working database and zero configuration. Point it at a real
PostgreSQL instance whenever you're ready.

---

## Features

- Planning and task management with a React/Vite interface
- Zero-config startup — embedded PGlite database, no `DATABASE_URL` needed
- Three database modes: embedded, local Docker Postgres, or any cloud Postgres
- Swagger API documentation generated at runtime
- One-click Windows launch scripts for backend, frontend, or both
- PM2 process configuration for production deployment

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL / PGlite (embedded) |
| Docs | Swagger (`/api/docs`) |
| Deployment | Docker Compose, PM2 |

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Docker Desktop *(optional — only for local Postgres)*

### Quick start

```bash
git clone https://github.com/salehmohamadkhani/jarvis.git
cd jarvis
npm install
cp .env.example .env.local
npm run build
npm run start
```

That's it. The backend starts with PGlite and stores data in `.data/pglite`.

**On Windows**, use the batch scripts instead:

| Script | What it does |
|---|---|
| `start-local.bat` | Backend + frontend together *(recommended)* |
| `start-backend.bat` | Backend only, with PGlite |
| `start-backend-postgres.bat` | Backend only, against real Postgres |
| `start-frontend.bat` | Frontend only |

`start-backend.bat` creates `.env.local` from `.env.example` if it's missing.

### Development

```bash
npm run dev          # frontend with hot reload
node server.js       # backend (set USE_PGLITE=true first)
```

Once the server is up, Swagger docs are at
[`http://localhost:3001/api/docs`](http://localhost:3001/api/docs).

---

## Database Modes

### Embedded PGlite — default

Set `USE_PGLITE=true` and the server runs without `DATABASE_URL`. Data lands in
`.data/pglite`, which is gitignored. This is the default in `start-backend.bat`.

### Local Postgres via Docker — fully offline

```bash
docker compose up -d
scripts\local-db-up.bat        # apply the schema, once
```

Then in `.env.local`:

```env
DATABASE_URL=postgresql://jarvis:jarvis@localhost:5432/jarvis?sslmode=disable
```

### Cloud Postgres — Neon or any provider

Run [`db/schema.sql`](db/schema.sql) once in your provider's SQL editor, set
`DATABASE_URL`, and you're done. No separate migration step.

---

## Configuration

All environment variables are documented in
[`.env.example`](.env.example). Copy it to `.env.local` and fill in real values.

---

## Project Structure

```
jarvis/
├── server.js               # Express entry point
├── api/                    # API route handlers
├── lib/                    # Shared backend utilities
├── models/                 # Data models
├── db/
│   └── schema.sql          # Initial schema
├── src/                    # React frontend
├── public/                 # Static assets
├── scripts/                # Setup and maintenance scripts
├── docker/                 # Docker resources
├── docker-compose.yml      # Local Postgres
├── ecosystem.config.cjs    # PM2 configuration
└── vite.config.js
```

---

## License

Released under the [MIT License](LICENSE).

---

<div align="center">
  Built by <a href="https://github.com/salehmohamadkhani">M. Saleh Mohammadkhani</a>
</div>
