# Changelog

All notable changes to Jarvis are documented in this file.

## [Unreleased] — Phase 01 Foundation Fix

### Fixed
- **Health check mismatch**: Backend `/api/health` now returns `{ ok, status: 'ok', database: 'connected' }`. Frontend `healthCheck()` accepts `data.ok === true`, `data.status === 'ok'`, or `data.database === 'connected'` for resilience.
- **UUID-safe task assignee**: Replaced `parseInt(updates.assigneeId)` with safe `String()` conversion in task update API call. UUIDs are no longer corrupted by numeric parsing.
- **Telegram ID persistence**: Verified that frontend sends `telegramId` and backend correctly maps it to `telegram_id` in both POST and PUT collaborator routes.

### Added
- **README.md**: Professional English documentation with overview, setup instructions, tech stack, project structure, environment variables, and known limitations.
- **AGENTS.md**: Guide for future AI agents explaining architecture, safe working rules, and build verification process.
- **ROADMAP.md**: Eight-phase development roadmap from foundation through portfolio release.
- **CHANGELOG.md**: This file — release history and unreleased changes.
- **PRODUCT_SPEC.md**: Lightweight product specification with positioning, users, modules, and feature details.
- **scripts/check-health.mjs**: Standalone health check utility script.
- **Package scripts**: Added `check` and `verify` scripts (lint + build combined).

### Known Limitations
- **Finance is not persistent**: All finance data (transactions, commitments) is stored in frontend memory via `useReducer` and is lost on page refresh. No finance database tables or APIs exist.
- **Dual finance data sources**: `tasks.costAmount` is used for financial display on project cards and dashboard, while `FinanceContext.transactions` is used on the Finance page. These are not unified.
- **No user authentication**: The application currently has no authentication system. All users share the same data.
- **Finance/balance data unification needed**: The two parallel systems for tracking financial data (costAmount on tasks vs. FinanceContext transactions) should be consolidated into one persistent model.
