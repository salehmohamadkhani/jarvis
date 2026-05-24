# Changelog

All notable changes to Jarvis are documented in this file.

## [Unreleased] -- Phase 02 Product Spec & Data Model

### Added

- **PRODUCT_SPEC.md**: Detailed product specification defining Jarvis as an AI-powered freelance project and finance OS. Includes positioning, primary users, core problem, core promise, main modules, user journeys, MVP scope, non-goals, and v1.0 success criteria.
- **DATA_MODEL.md**: Comprehensive data model documentation covering current tables, model problems, proposed v2 entities, entity relationships, finance model, invoice model, project profitability model, migration strategy, assistant command implications, and open questions.
- **db/schema.v2.sql**: Draft PostgreSQL schema for Phase 03 finance persistence. Includes 9 new tables: `project_collaborators`, `finance_categories`, `finance_transactions`, `finance_commitments`, `invoices`, `invoice_items`, `payments`, `project_rates`, `time_entries`. All with IF NOT EXISTS for safety.
- **PHASE_03_IMPLEMENTATION_PLAN.md**: Practical implementation plan for Phase 03 finance persistence. Includes objective, files to change, backend endpoints, frontend API client design, FinanceContext migration plan, project balance unification plan, database migration notes, testing plan, risk management, and definition of done.
- **ROADMAP.md**: Updated development roadmap with detailed Phase 03 (Finance Persistence), Phase 04 (Project Details v2), Phase 05 (Dashboard v2), Phase 06 (Assistant v2) tasks.

### Changed

- README.md remains at its pre-Phase-02 version (Persian). Will be professionalized in a later phase.

### Notes

- Phase 02 is a documentation-and-design-only phase. No code was changed.
- `db/schema.v2.sql` is a DRAFT and must be reviewed before applying to any database.
- Finance persistence, invoice creation, and payment tracking are designed but NOT implemented.
- The FinanceContext frontend-only prototype remains untouched. Phase 03 will replace it.

## [Phase 01] -- 2025-05-24

### Fixed

- Health check endpoint now returns consistent `{ ok, status: 'ok', database: 'connected' }` shape.
- UUID assignee handling: replaced `parseInt` with `String()` for UUID safety.
- Telegram ID persistence verified (frontend sends `telegramId`, backend maps to `telegram_id`).

### Added

- Professional English README with setup instructions and known limitations.
- AGENTS.md guide for AI agents.
- ROADMAP.md with 8-phase development plan.
- CHANGELOG.md for release history.
- PRODUCT_SPEC.md lightweight product specification.
- `scripts/check-health.mjs` health check utility.
- Package scripts (`check`, `verify`).

### Known Limitations

- Finance is not persistent. All finance data lives in frontend memory.
- Dual finance data sources: `tasks.cost_amount` and `FinanceContext.transactions` are not unified.
- No user authentication.
- Finance/balance data unification needed.
