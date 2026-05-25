# Jarvis — AI-powered Freelance Project & Finance OS

Jarvis is an open-source, AI-assisted operating system for freelance project and finance management. It helps independent professionals, small teams, and AI-assisted builders manage projects, tasks, meetings, collaborators, and financial records through a modern web interface and an intelligent voice/text assistant.

## Why Jarvis?

Existing project management tools are built for large teams with dedicated project managers. Freelancers and small teams need something different:

- **AI-native**: A built-in assistant understands natural language commands for task creation, scheduling, and project queries
- **Finance-aware**: Track project profitability, commitments, and payouts alongside tasks (Note: Finance is currently a UI prototype — see Known Limitations)
- **Offline-capable**: Works with embedded PGlite database for local development without internet
- **Persian-friendly**: Supports Persian language interface, RTL layout, and Iranian date/time conventions
- **Self-hosted**: Your data stays on your infrastructure

## Current Features

- Voice/text AI assistant with natural language task and meeting creation
- Project CRUD with archiving, client info, and collaborator assignment
- Task management with priorities, labels, status, and assignee
- Meeting scheduling with optional Google Calendar integration
- Collaborator directory with Telegram notification support
- Finance tracking dashboard (income/expense, commitments, categories, upcoming payouts)
- Dashboard with project summaries, task completion stats, and cashflow overview
- Today view with upcoming tasks and meetings
- Google Calendar event creation from meetings
- Telegram user-client notifications for meeting creation
- Embedded PGlite database for zero-config local development
- Docker-based PostgreSQL for production-like local setup

## Planned Features

See [ROADMAP.md](ROADMAP.md) for the full development roadmap. Key upcoming items include:

- Persistent finance database tables and APIs
- Invoice generation
- Enhanced project details page with integrated tasks, meetings, finance
- Dashboard v2 with AI insight cards
- Assistant v2 with finance commands and action previews
- UI/UX polish and design system cleanup

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router 7, Vite 7, Mantine UI 8, Tabler Icons |
| **Backend** | Node.js, Express 4 |
| **Database** | PostgreSQL (production) / PGlite (development, embedded) |
| **AI/LLM** | Ollama (local), OpenAI-compatible APIs (DeepSeek, etc.) |
| **STT** | Whisper (local Docker container) or Web Speech API |
| **Calendar** | Google Calendar API (service account) |
| **Telegram** | MTProto client via `telegram` npm package |
| **Styling** | Custom CSS with design system tokens |

## Project Structure

```
api/                    Backend API routes (Express)
├── index.js           Router aggregator
├── health.js          Health endpoint
├── db.js              Database connection
├── projects.js        Project routes
├── tasks.js           Task routes
├── meetings.js        Meeting routes
├── collaborators.js   Collaborator routes
├── projects/[...slug].js   Project sub-routes
├── meetings/[...slug].js    Meeting sub-routes
├── collaborators/[...slug].js  Collaborator sub-routes
├── tasks/[...slug].js       Task sub-routes
db/schema.sql           Database schema
docs/openapi.js         OpenAPI specification
lib/                    Shared utilities (Ollama, Telegram, etc.)
scripts/                Utility scripts
src/                    Frontend application
├── api/               API client library
├── assistant/         Assistant action handlers
├── commands/          Command registry
├── components/        Reusable UI components
├── design-system/     Design tokens and components
├── features/finance/  Finance feature (context, components)
├── hooks/             Custom React hooks
├── pages/             Page components
├── state/             Global state (PlannerContext)
└── utils/             Frontend utilities
server.js               Express server entry point
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (or leave empty for PGlite) |
| `USE_PGLITE` | Set `true` to use embedded PGlite instead of PostgreSQL |
| `LLM_BASE_URL` | OpenAI-compatible API endpoint (Ollama, DeepSeek, etc.) |
| `LLM_MODEL` | LLM model name (e.g., `llama3.2`, `deepseek-chat`) |
| `VITE_LLM_MODEL` | Frontend model name |
| `GOOGLE_CALENDAR_ID` | Google Calendar ID for meeting events |
| `TELEGRAM_API_ID` | Telegram API ID for user-client notifications |
| `VITE_BACKEND_URL` | Backend URL for frontend API calls |

See [.env.example](.env.example) for all variables with detailed documentation.

## Local Setup

### Prerequisites

- Node.js 18+
- npm 9+
- (Optional) Docker Desktop for PostgreSQL or Whisper
- (Optional) Ollama for local LLM

### Quick Start (Zero Config)

The fastest way to get running uses the embedded PGlite database (no Docker, no external database needed):

```bash
npm install
npm run build
npm start
```

Or on Windows: `start-local.bat`

The server starts on http://localhost:3001 with the frontend serving at the same URL. The API health endpoint is at http://localhost:3001/api/health.

### Development Mode (Frontend + Backend separately)

```bash
# Terminal 1: Backend
node server.js

# Terminal 2: Frontend (Vite dev server with API proxy)
npm run dev
```

### Database Setup

**Development (PGlite, no setup needed):**
Set `USE_PGLITE=true` or leave `DATABASE_URL` empty. Data is stored in `.data/pglite/` (gitignored).

**Local PostgreSQL with Docker:**
```bash
docker compose up -d
scripts/local-db-up.bat
```

Set `DATABASE_URL=postgresql://jarvis:jarvis@localhost:5432/jarvis?sslmode=disable` in `.env.local`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run build` | Build frontend for production |
| `npm run start` | Start production server (serves built frontend) |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview built frontend |
| `npm run check` | Run lint + build (CI check) |
| `npm run dev:all` | Run backend + frontend concurrently |
| `npm run verify` | Run lint + build (verification) |
| `npm run telegram-login` | Log in to Telegram for user-client |

## Health Check

```bash
curl http://localhost:3001/api/health
# Response: { "ok": true, "status": "ok", "database": "connected" }

# With LLM status:
curl http://localhost:3001/api/health?llm=1
```

See also `scripts/check-health.mjs` for a programmatic health check utility.

## Known Limitations

- **Finance is a UI prototype only**: Finance transactions and commitments are stored in frontend memory only (`useReducer`). They are lost on page refresh. No finance database tables or APIs exist yet.
- **Duplicate finance data sources**: Some screens use `tasks.costAmount` for financial data while others use `FinanceContext.transactions`. These are not unified.
- **Collaborator Telegram ID**: While Telegram ID is stored in the database, automated Telegram notification for non-meeting events is not yet implemented.
- **No user authentication**: The application currently has no user accounts or authentication.

## License

MIT License — see LICENSE file (to be added).

---

Built with React, Express, and a lot of Persian tea.

## Documentation Roadmap

Jarvis development follows a phased roadmap. Key documentation files for contributors and AI agents:

| File | Purpose |
|------|---------|
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | Product specification: positioning, users, modules, MVP scope, success criteria |
| [DATA_MODEL.md](DATA_MODEL.md) | Data model: current tables, proposed v2 entities, finance/invoice model, migration strategy |
| [PHASE_03_IMPLEMENTATION_PLAN.md](PHASE_03_IMPLEMENTATION_PLAN.md) | Practical plan for Finance Persistence phase: endpoints, migration, testing |
| [ROADMAP.md](ROADMAP.md) | 8-phase development roadmap from foundation through portfolio release |
| [CHANGELOG.md](CHANGELOG.md) | Release history and unreleased changes |
| [AGENTS.md](AGENTS.md) | Guide for AI agents with architecture, safe working rules, and build verification |
| [db/schema.v2.sql](db/schema.v2.sql) | Draft schema for Phase 03 finance/invoice tables (review before applying) |
