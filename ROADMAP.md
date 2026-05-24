# Jarvis Development Roadmap

## Phase 01 -- Foundation Fix (Complete)
**Focus**: Stabilization, documentation, and safe GitHub presentation.

- Fixed health check endpoint mismatch
- Fixed UUID assignee handling
- Verified Telegram ID persistence
- Added professional README, AGENTS.md, ROADMAP.md, CHANGELOG.md, PRODUCT_SPEC.md
- Added health check utility script
- Added package scripts (check, verify)

## Phase 02 -- Product Spec & Data Model (Current)
**Focus**: Define the product, design the data model, prepare finance schema draft.

- [x] Detailed product specification (PRODUCT_SPEC.md)
- [x] Data model documentation (DATA_MODEL.md)
- [x] Draft Finance/Invoice/Postgres schema (db/schema.v2.sql)
- [x] Phase 03 implementation plan (PHASE_03_IMPLEMENTATION_PLAN.md)
- [x] Updated roadmap (ROADMAP.md)
- [x] Updated changelog (CHANGELOG.md)
- [ ] Build verification complete

## Phase 03 -- Finance Persistence
**Focus**: Move finance from frontend-only prototype to persistent database.

- [ ] Apply reviewed finance schema (db/schema.v2.sql)
- [ ] Seed default finance categories
- [ ] Build finance API routes (transactions, commitments, categories)
- [ ] Build invoice API routes (invoices, items, payments)
- [ ] Add frontend finance API client
- [ ] Refactor FinanceContext to fetch/write through API
- [ ] Keep local fallback for offline resilience
- [ ] Add transaction CRUD in UI
- [ ] Add commitment CRUD in UI
- [ ] Add invoice CRUD in UI
- [ ] Add payment tracking in UI
- [ ] Replace task cost_amount balance logic with finance transactions
- [ ] Add project profitability selectors
- [ ] Add tests and build verification
- [ ] Performance check for large transaction sets

## Phase 04 -- Project Details v2
**Focus**: Enhanced project detail page with integrated sub-modules.

- [ ] Project overview tab with summary and quick stats
- [ ] Project tasks tab with full task management
- [ ] Project meetings tab with integrated scheduling
- [ ] Project finance tab with income/expense breakdown
- [ ] Project invoice tab with invoice list and creation
- [ ] Project collaborators tab with role assignment
- [ ] Project timeline view for milestones
- [ ] Project health summary card

## Phase 05 -- Dashboard v2
**Focus**: Comprehensive dashboard with insights and analytics.

- [ ] Cashflow chart (income/expense over time)
- [ ] Project health indicators (on track, at risk, overdue)
- [ ] Overdue tasks widget
- [ ] Upcoming payments widget
- [ ] AI insight card (natural language project summary)
- [ ] Configurable widget layout
- [ ] Export to PDF/CSV

## Phase 06 -- Assistant v2
**Focus**: Refactored assistant with finance commands and better UX.

- [ ] Refactor assistant action handlers into modular structure
- [ ] Finance commands (add expense, show balance, project profitability)
- [ ] Invoice commands (create invoice, check payment status)
- [ ] Action previews before execution
- [ ] Better text/voice flow with confirmation patterns
- [ ] Streaming response support

## Phase 07 -- UI/UX Polish
**Focus**: Design system cleanup, responsive layouts, accessibility.

- [ ] Design system token audit and cleanup
- [ ] Better responsive layouts (tablet, desktop)
- [ ] Better empty/loading/error states
- [ ] Reduce inline styling, use design system components
- [ ] Accessibility pass (ARIA labels, keyboard navigation, screen reader)
- [ ] Performance optimization (code splitting, lazy loading)

## Phase 08 -- Portfolio Release
**Focus**: Public release preparation.

- [ ] Screenshots and demo data
- [ ] GitHub topics and description
- [ ] Release notes and v1.0.0 tag
- [ ] CI/CD pipeline optimization
- [ ] User documentation
- [ ] Contribution guide
- [ ] License file

## Backlog / Ideas (Not Yet Scheduled)

- Multi-user support with authentication
- Mobile app (React Native or PWA)
- Time tracking with start/stop timer
- Project templates
- Recurring invoices
- Payment gateway integration (Zarinpal, Stripe)
- Browser extension for time tracking
- Dark mode polish (currently dark-only)
- i18n for additional languages beyond Persian
- WebSocket for real-time updates
- File attachments for tasks and projects
- Activity feed / audit log
- Soft delete for financial records
