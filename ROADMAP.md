# Jarvis Development Roadmap

## Phase 01 — Foundation Fix (Current)
**Focus**: Stabilization, documentation, and safe GitHub presentation.

- [x] Fix health check endpoint mismatch (backend returns `{ ok, status, database }`, frontend accepts multiple shapes)
- [x] Fix UUID assignee handling (`parseInt` replaced with `String()` for UUIDs)
- [x] Fix Telegram ID persistence (frontend sends `telegramId` -> backend maps to `telegram_id`)
- [x] Professional README with setup instructions and known limitations
- [x] `.env.example` with all real environment variables
- [x] `AGENTS.md` for future AI agents
- [x] `ROADMAP.md` (this file)
- [x] `CHANGELOG.md` with release history
- [x] `PRODUCT_SPEC.md` lightweight product specification
- [x] Health check utility script (`scripts/check-health.mjs`)
- [x] Package scripts (`check`, `verify`)
- [ ] Build and health verification complete

## Phase 02 — Product Spec & Data Model
**Focus**: Formal product specification, improved data models, finance schema design.

- [ ] `PRODUCT_SPEC.md` refined with detailed user stories
- [ ] Better project model (add fields: budget, hourly rate, payment terms)
- [ ] Finance database tables design (transactions, commitments, invoices)
- [ ] Invoice model design (items, tax, discounts, payment tracking)
- [ ] Database migration strategy (versioned SQL migrations)

## Phase 03 — Finance Persistence
**Focus**: Move finance from frontend-only prototype to persistent database.

- [ ] Finance database tables (transactions, commitments, categories)
- [ ] Finance REST API endpoints (CRUD transactions, commitments)
- [ ] Connect `FinanceContext` to backend APIs
- [ ] Persistent transactions with project association
- [ ] Commitment tracking and payment status
- [ ] Project profitability calculation from persistent data

## Phase 04 — Project Details v2
**Focus**: Enhanced project detail page with integrated sub-modules.

- [ ] Overview tab with project summary and quick stats
- [ ] Tasks tab with full task management
- [ ] Meetings tab with integrated scheduling
- [ ] Finance tab with project-level income/expense
- [ ] Invoices tab (stub for future)
- [ ] Collaborators tab for project-level assignment
- [ ] Timeline view for project milestones

## Phase 05 — Dashboard v2
**Focus**: Comprehensive dashboard with insights and analytics.

- [ ] Cashflow chart (income/expense over time)
- [ ] Project health indicators (on track, at risk, overdue)
- [ ] Overdue tasks widget
- [ ] Upcoming payments widget
- [ ] AI insight card (natural language project summary)
- [ ] Configurable widget layout

## Phase 06 — Assistant v2
**Focus**: Refactored assistant with finance commands and better UX.

- [ ] Refactor assistant action handlers into modular structure
- [ ] Finance commands (add expense, show balance, project profitability)
- [ ] Action previews before execution
- [ ] Better text/voice flow with confirmation patterns
- [ ] Streaming response support

## Phase 07 — UI/UX Polish
**Focus**: Design system cleanup, responsive layouts, accessibility.

- [ ] Design system token audit and cleanup
- [ ] Better responsive layouts (tablet, desktop)
- [ ] Better empty/loading/error states
- [ ] Reduce inline styling, use design system components
- [ ] Accessibility pass (ARIA labels, keyboard navigation, screen reader)

## Phase 08 — Portfolio Release
**Focus**: Public release preparation.

- [ ] Screenshots and demo data
- [ ] GitHub topics and description
- [ ] Release notes and v1.0.0 tag
- [ ] CI/CD pipeline optimization
- [ ] User documentation
- [ ] Contribution guide

## Backlog / Ideas (Not Yet Scheduled)

- Multi-user support with authentication
- Mobile app (React Native or PWA)
- Time tracking with start/stop timer
- Project templates
- Recurring invoices
- Payment gateway integration (Zarinpal, etc.)
- Browser extension for time tracking
- Dark mode polish (currently dark-only)
- i18n for additional languages beyond Persian
- WebSocket for real-time updates
- File attachments for tasks and projects
- Activity feed / audit log
