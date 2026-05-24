# Jarvis -- Product Specification

## Product Name

Jarvis

## Tagline

AI-powered Freelance Project & Finance OS

## Product Positioning

Jarvis is an AI-powered freelance operating system for managing projects, tasks, meetings, collaborators, invoices, payments, project profitability, and daily execution through a voice/text assistant.

Unlike traditional project management tools (Jira, Asana, Monday.com) that are designed for large teams with dedicated project managers, Jarvis is built from the ground up for independent professionals and small teams who want an AI-native, self-hosted workflow tool.

## Primary Users

| User Type | Description |
|-----------|-------------|
| **Freelancers** | Independent professionals managing multiple client projects, tracking tasks and deadlines, logging time and expenses, sending invoices |
| **Full-stack Builders** | Solo product builders who need to manage tasks, notes, and milestones through voice/text assistant |
| **AI-assisted Builders** | Users who prefer natural language interaction over clicking through menus |
| **Small Technical Teams** | Teams of 2-10 people who self-host their tools and need project coordination |
| **Project-based Consultants** | Consultants who need client management, time tracking, invoicing, and profitability analysis |

## Core Problem

Freelancers and small teams lack a purpose-built tool that combines project management, finance tracking, and AI assistance in a single, self-hosted system. They either:

- Use disconnected tools (Trello for tasks, Excel for finances, Google Calendar for meetings)
- Use enterprise tools that are too heavy and expensive
- Have no finance tracking at all, making it hard to understand project profitability

## Core Promise

"Jarvis helps you run your freelance business from one place -- tasks, meetings, money, and clients -- through a natural voice/text assistant."

## Main Product Modules

| Module | Route | Purpose | Status |
|--------|-------|---------|--------|
| **Assistant** | `/` | Primary interface. Natural language chat with voice input. Can create tasks, meetings, projects. Powered by any OpenAI-compatible LLM. | Working |
| **Today** | `/today` | Daily view of tasks (overdue, today, upcoming) and meetings. Quick-add. Calendar card. | Working |
| **Dashboard** | `/dashboard` | Overview of all projects with stats, finance summary, revenue chart, task completion. | Working (finance from prototype) |
| **Projects** | `/projects` | List of active/archived projects with task counts and balance. Add/archive. | Working |
| **Project Details** | `/projects/:id` | Single project view with header, finance mini-card, project info, tasks. | Basic (needs Phase 04) |
| **Finance** | `/finance` | Income/expense tracking, commitments, categories, upcoming payouts. | Prototype (frontend-only) |
| **Invoices** | *(future)* | Create, send, track invoices and payments. | Planned (Phase 03+) |
| **Collaborators** | `/collaborators` | Contact directory with roles, email, phone, Telegram ID. | Working |
| **Settings** | `/settings` | App configuration, LLM provider, model selection, STT toggle. | Basic |
| **Reports** | *(future)* | Project profitability, cashflow, time reports. | Planned (Phase 05+) |
| **Integrations** | *(future)* | Google Calendar, Telegram, payment gateways. | Partial (Calendar + Telegram exist) |

## User Journey (Primary Flow)

1. **User creates a project** -- adds name, client info, dates, priority
2. **User adds tasks** -- titles, descriptions, due dates, assignees, priorities, labels
3. **User schedules meetings** -- title, date, duration, participants, Google Calendar sync
4. **User adds collaborators** -- names, roles, contact info, Telegram IDs
5. **User records income/expenses** -- transactions linked to projects (currently frontend-only)
6. **User creates an invoice** *(future)* -- items, quantities, rates, tax, send to client
7. **User tracks payments** *(future)* -- mark invoices as paid, partial payments
8. **Jarvis summarizes what matters today** -- assistant provides daily briefing
9. **Dashboard shows project health** -- active tasks, overdue items, financial status

## MVP Scope (v1.0)

The MVP includes all working modules plus:

- [x] Project CRUD with client info, archiving
- [x] Task CRUD with priorities, labels, status, assignees, due dates
- [x] Meeting CRUD with Google Calendar integration
- [x] Collaborator CRUD with Telegram notifications
- [x] AI Assistant with task/meeting/project creation via natural language
- [x] Dashboard with project stats and task overview
- [x] Finance UI prototype (transactions, commitments, categories)
- [ ] Persistent finance transactions (Phase 03)
- [ ] Invoice creation and tracking (Phase 03)
- [ ] Project profitability calculations (Phase 03)
- [ ] Project Details v2 with integrated tabs (Phase 04)

## Post-MVP Scope

- Time tracking with start/stop timer
- Recurring invoices
- Payment gateway integration
- Multi-user support with authentication
- File attachments
- Activity feed / audit log
- Browser extension for time tracking
- Mobile app (React Native or PWA)
- WebSocket for real-time updates

## Non-goals

- Enterprise features (RBAC, SSO, compliance reporting)
- Real-time collaboration (Google Docs-style multi-user editing)
- Built-in CRM beyond basic client info
- Native mobile app in v1 (PWA is acceptable)
- Social features (feed, comments, @mentions)
- Public API for third-party developers

## Known Limitations

- **Finance is frontend-only**: Transactions and commitments are stored in React `useReducer` state. They are lost on page refresh. No finance database tables or APIs exist.
- **Dual finance data sources**: `tasks.cost_amount` is used for balance calculations on project cards and dashboard, while `FinanceContext.transactions` is used on the Finance page. These are not unified.
- **No user authentication**: All users share the same data. No login, no multi-tenancy.
- **Single server file**: All Express routes are in `server.js`. Manageable now but needs splitting as the app grows.
- **No ORM**: Raw SQL queries using `pg` or `pglite-pg-adapter`. This is intentional but means careful migration management.
- **No formal migration system**: Schema changes are applied manually.

## Success Criteria for v1.0

1. `npm run build` passes
2. `npm run lint` passes (pre-existing warnings acceptable)
3. Health check endpoint returns correct status
4. All CRUD routes work for projects, tasks, meetings, collaborators
5. Finance transactions are persistent (database-backed)
6. Invoices can be created and tracked
7. Project profitability can be calculated from finance data
8. Assistant creates tasks, meetings, and projects from natural language
9. Dashboard shows correct financial and project data
10. Page refresh does not lose finance data

## Design Principles

1. **AI-first**: The assistant is the primary interface, not an afterthought
2. **Offline-capable**: Should work with local LLM and local database
3. **Self-hosted**: User owns their data
4. **Freelance-focused**: Skip enterprise features, focus on solo/small-team workflows
5. **Progressive enhancement**: Start with basics, add sophistication incrementally
6. **Task-money separation**: Tasks are work items. Transactions are money events. Do not conflate them.
