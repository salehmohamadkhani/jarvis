# Jarvis — Product Specification

## Product Name

Jarvis

## Tagline

AI-powered Freelance Project & Finance OS

## Positioning

Jarvis is an open-source, AI-assisted operating system for freelance project and finance management. Unlike traditional project management tools (Jira, Asana, Monday.com) which are designed for large teams with dedicated project managers, Jarvis is built from the ground up for:

- **Independent freelancers** who manage their own projects and finances
- **Product builders** who want an AI-native workflow tool
- **Small technical teams** (2-10 people) who self-host their tools
- **AI-assisted builders** who prefer natural language interaction over clicking through menus

## Primary Users

1. **Freelance Developer/Designer**: Manages multiple client projects, tracks tasks and deadlines, logs time and expenses, sends invoices
2. **Solo Product Builder**: Builds a product while managing tasks, notes, and milestones through voice/text assistant
3. **Small Agency Owner**: Coordinates team members (collaborators), tracks project profitability, schedules meetings
4. **AI-assisted Builder**: Interacts primarily through the assistant to create, update, and query projects and tasks

## Core User Jobs

1. **Manage projects**: Create, update, organize, and archive client projects with metadata (client info, dates, priority)
2. **Manage tasks**: Create, assign, prioritize, and track tasks within projects or standalone
3. **Manage meetings**: Schedule meetings with Google Calendar sync and Telegram notifications
4. **Manage collaborators**: Track team members, their contact info, roles, and Telegram IDs
5. **Manage money** (future): Track income, expenses, project profitability, commitments, and invoices
6. **Use the assistant**: Natural language voice/text interface for all of the above

## Main Modules

### Assistant (`/`)
Primary interface. Natural language chat with voice input support. Can create tasks, meetings, projects, and query data. Powered by any OpenAI-compatible LLM. Commands registry supports text-based and JSON-based action parsing.

### Today (`/today`)
Daily view showing today's tasks (overdue, today, upcoming) and meetings. Quick-add functionality. Calendar card with monthly view.

### Dashboard (`/dashboard`)
Overview of all projects with stats (total tasks, completed, balance). Project revenue bar chart. Health status cards. Finance summary (from `FinanceContext`).

### Projects (`/projects`)
List of active projects with task counts and financial balance. Add project, archive project, swipeable project cards. Navigate to project details.

### Project Details (`/projects/:id`)
Single project view with header, finance mini-card, project info card, and tasks card. Shows project-specific transactions from `FinanceContext`.

### Finance (`/finance`)
Finance dashboard with:
- Summary card (income, expense, balance for period)
- Transaction filters (period, project)
- Transaction table with add/edit/delete
- Commitments management (one-off and recurring)
- Analytics panel (project summaries, top categories, upcoming payouts)
- Currently frontend-only (no persistence)

### Collaborators (`/collaborators`)
Contact directory for project collaborators. CRUD operations with fields: name, role, email, phone, Telegram ID.

### Settings (`/settings`)
App configuration including LLM provider, model selection, STT provider toggle, and connection status display.

### More (`/more`)
Secondary navigation hub.

## Architecture

- **Single-page application**: React with client-side routing (React Router)
- **Unified Express server**: Single Node.js process serves both the API and the built frontend
- **State management**: React Context for primary data, useReducer for finance (frontend-only)
- **Database**: PostgreSQL with PGlite fallback for development
- **AI integration**: Backend proxy to any OpenAI-compatible API (Ollama, DeepSeek, OpenAI)

## Data Flow

1. User interacts with React frontend
2. Frontend calls Express REST API via `apiCall` wrapper
3. Backend queries PostgreSQL (or PGlite)
4. Frontend state updates via React Context
5. Finance state is managed separately via `useReducer` (not persisted in Phase 01)

## Technical Constraints

- All backend routes are in a single `server.js` file (not split into route modules)
- Vite with apiProxy forwards `/api/*` to backend in development mode
- Production build: Vite outputs to `dist/`, Express serves both API and static files
- No ORM — raw SQL queries using `pg` or `@middle-management/pglite-pg-adapter`

## Design Principles

1. **AI-first**: The assistant is the primary interface, not an afterthought
2. **Offline-capable**: Should work with local LLM and local database
3. **Self-hosted**: User owns their data
4. **Freelance-focused**: Skip enterprise features, focus on solo/small-team workflows
5. **Progressive enhancement**: Start with basics, add sophistication incrementally

## Success Metrics

- Build passes cleanly (`npm run build`)
- Health check endpoint responds correctly
- All CRUD operations work for projects, tasks, meetings, collaborators
- Assistant can create tasks and meetings from natural language
- Finance UI renders and computes correctly (even without persistence)
