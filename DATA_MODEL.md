# Jarvis -- Data Model Documentation

## 1. Data Model Principles

1. **Tasks are work items. Transactions are money events. Invoices are billing documents. Payments are settlement records.** Never conflate these.
2. **UUID primary keys** throughout. No auto-increment integers for public IDs.
3. **JSONB for flexible data** where schema is not fixed (labels, metadata, tags).
4. **Foreign keys with ON DELETE SET NULL** for non-critical references (if a category is deleted, transactions keep their data).
5. **Foreign keys with ON DELETE CASCADE** for ownership relationships (if an invoice is deleted, its items are deleted).
6. **Timestamps on every table**: `created_at` and `updated_at`.
7. **Audit-friendly**: No destructive updates to financial records (use status fields instead).
8. **Multi-currency ready**: Store `currency` and `amount` rather than assuming a single currency.
9. **Phase 03 forward**: The v2 model is designed for incremental migration from v1.

## 2. Current Existing Tables

### projects

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| name | TEXT NOT NULL | |
| status | TEXT DEFAULT 'active' | |
| priority | INTEGER DEFAULT 3 | |
| start_date | DATE | |
| due_date | DATE | |
| notes | TEXT | |
| client_name | TEXT | |
| client_phone | TEXT | |
| referred_by_name | TEXT | |
| referred_by_phone | TEXT | |
| archived | BOOLEAN DEFAULT FALSE | |
| archived_at | TIMESTAMPTZ | |
| collaborators | JSONB DEFAULT '[]' | Legacy -- see project_collaborators |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### tasks

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK -> projects | ON DELETE CASCADE |
| title | TEXT NOT NULL | |
| description | TEXT | |
| due_at | TIMESTAMPTZ | |
| priority | INTEGER DEFAULT 3 | |
| status | TEXT DEFAULT 'todo' | |
| is_routine | BOOLEAN DEFAULT FALSE | |
| labels | JSONB DEFAULT '[]' | |
| kind | TEXT DEFAULT 'task' | |
| cost_amount | DECIMAL(12,2) | **Legacy** -- will be removed in v2 |
| notes | TEXT | |
| assignee_id | UUID | References collaborator ID |
| assignee_name | TEXT | Denormalized |
| archived | BOOLEAN DEFAULT FALSE | |
| archived_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### meetings

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK -> projects | ON DELETE CASCADE |
| title | TEXT NOT NULL | |
| scheduled_at | TIMESTAMPTZ NOT NULL | |
| duration_minutes | INTEGER | |
| participants | JSONB DEFAULT '[]' | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### collaborators

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | |
| role | TEXT | |
| email | TEXT | |
| phone | TEXT | |
| telegram_id | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

## 3. Problems in Current Model

1. **Finance is not persistent.** All transaction and commitment data lives in frontend `useReducer`. A page refresh destroys all financial records.
2. **`tasks.cost_amount` is a conflated field.** It stores financial amounts on task rows, making tasks serve dual purpose as work items and finance records. This is confusing and leads to inconsistent balance calculations.
3. **Project balance has two sources.** Some screens use `tasks.cost_amount` to calculate balance (ProjectCard, Dashboard project stats). Other screens use `FinanceContext.transactions` (Finance page, ProjectDetails). These can diverge.
4. **Collaborators are stored as JSONB on projects.** The `projects.collaborators` field stores an array of collaborator objects. This makes querying (find all projects for a collaborator) difficult.
5. **No foreign key for `tasks.assignee_id`.** It references collaborator IDs conceptually but has no FK constraint.
6. **No invoice or payment tables.** Invoicing will require new tables.
7. **No category system for finance transactions.** Categories are free-text, leading to inconsistency.
8. **No multi-currency support in finance.** The prototype hardcodes `IRR`.
9. **No time tracking.** Time entries against tasks and projects are not possible.

## 4. Proposed v2 Model

The v2 model extends the existing schema with new tables. Existing tables are preserved with minimal changes.

### Core Tables (existing, mostly unchanged)

- `projects` -- Add `budget`, `hourly_rate`, `payment_terms` columns (optional, Phase 03+)
- `tasks` -- Keep existing; `cost_amount` becomes legacy; `assignee_id` should get FK constraint
- `meetings` -- Keep as is
- `collaborators` -- Keep as is

### New Core Table

- `project_collaborators` -- Many-to-many project-collaborator relationship

### Finance Tables (new)

- `finance_categories` -- Transaction category system
- `finance_transactions` -- Persistent income/expense records
- `finance_commitments` -- Planned recurring or one-off financial obligations

### Invoice Tables (new)

- `invoices` -- Billing documents
- `invoice_items` -- Line items on invoices
- `payments` -- Settlement records against invoices

### Optional Future Tables

- `project_rates` -- Rate configurations per project
- `time_entries` -- Time tracking against tasks
- `clients` -- Client records (separate from project metadata)
- `files` -- File attachments
- `activity_logs` -- Audit trail
- `assistant_actions` -- Log of assistant actions
- `integrations` -- Integration configurations
- `reports` -- Saved report configurations

## 5. Entity Relationships

```
projects 1---* tasks
projects 1---* meetings
projects 1---* project_collaborators
projects 1---* project_rates
projects 1---* finance_transactions
projects 1---* finance_commitments
projects 1---* invoices

collaborators 1---* project_collaborators
collaborators 1---* finance_transactions
collaborators 1---* finance_commitments
collaborators 1---* time_entries

tasks 1---* time_entries
tasks 1---* finance_transactions (optional link)

invoices 1---* invoice_items
invoices 1---* payments

finance_transactions 1---* payments
finance_transactions *---1 finance_categories
```

## 6. Finance Model

### Key Design Decisions

- **Single transaction table**: All money movements (income, expense, transfers) go into `finance_transactions`. No separate income/expense tables.
- **Category system**: `finance_categories` provides a controlled vocabulary. Categories have a `type` (income/expense/both) that constrains their usage.
- **Project association optional**: Transactions can be linked to projects, collaborators, or standalone.
- **Currency per transaction**: Each transaction has its own currency and amount. Exchange rate conversions are handled at the application layer.
- **Commitments are separate**: A commitment represents a planned future transaction. It may generate one or more actual transactions when fulfilled.

### Transaction Types (conceptual)

| Type | Description |
|------|-------------|
| income | Money received |
| expense | Money paid out |

### Transaction Kinds (conceptual)

| Kind | Description |
|------|-------------|
| project | Direct project income/expense |
| personal | Personal finance not tied to a project |
| business | Business expense not tied to a specific project |
| invoice_payment | Payment against an invoice |
| commitment | Fulfillment of a commitment |

### Finance Flow

```
User records income/expense
  -> finance_transactions row created
  -> optionally linked to a project
  -> optionally linked to an invoice
  -> optionally linked to a commitment
  
Project profitability = SUM(income transactions for project) - SUM(expense transactions for project)
```

## 7. Invoice Model

### Key Design Decisions

- **Invoice is a document**: It has a number, issue date, due date, line items, subtotal, tax, discount, total.
- **Status-driven lifecycle**: draft -> sent -> partially_paid -> paid -> overdue -> cancelled
- **Payments track against invoices**: A separate `payments` table links back to invoices.
- **Invoice remains editable until sent**: Once sent, changes create a new version (future).
- **Invoice number is unique**: Auto-generated or user-specified.

### Invoice Lifecycle

```
draft -> sent -> partially_paid -> paid
  |                      |
  +----> cancelled        +----> overdue
```

### Invoice Finance Integration

```
Invoice created
  -> `invoices` row with status = 'draft'
  -> `invoice_items` rows created
  -> total_amount calculated from items

Invoice sent
  -> status = 'sent'

Payment received
  -> `payments` row created
  -> optionally `finance_transactions` row created
  -> invoice.paid_amount updated
  -> if paid_amount >= total_amount, status = 'paid'
  -> if paid_amount < total_amount but > 0, status = 'partially_paid'
```

## 8. Project Profitability Model

### Definition

Project profitability is calculated as:

```
profitability = total_income - total_expense
```

Where:
- `total_income` = SUM of `finance_transactions.amount` WHERE `project_id = X` AND `type = 'income'`
- `total_expense` = SUM of `finance_transactions.amount` WHERE `project_id = X` AND `type = 'expense'`

### Legacy cost_amount

The old `tasks.cost_amount` field will be treated as **legacy data**. During migration (Phase 03):

1. New finance data goes into `finance_transactions` only
2. Old `tasks.cost_amount` data is displayed alongside new data during transition
3. A migration script can optionally convert old `cost_amount` rows into `finance_transactions`
4. Once migration is confirmed, `tasks.cost_amount` display is removed from balance calculations

### Phase 03 Transition

| Screen | Phase 02 (current) | Phase 03 target |
|--------|-------------------|-----------------|
| Project Cards | cost_amount | finance_transactions |
| Dashboard Project Stats | cost_amount | finance_transactions |
| ProjectDetails | FinanceContext | finance_transactions API |
| Finance page | FinanceContext | finance_transactions API |
| Charts | FinanceContext | finance_transactions API |

## 9. Assistant Command Implications

The assistant currently handles task and meeting creation. In v2, it should also handle:

- "Add expense of 500,000 IRR for project X -- category software"
- "What is the balance for project X?"
- "Create invoice for project X for 5,000,000 IRR"
- "Mark invoice INV-001 as paid"
- "Show me project profitability"
- "Which projects are overdue on invoices?"

This means the assistant action handlers need access to finance APIs. The `gptClient.js` system prompt should be updated to describe available finance operations.

## 10. Migration Strategy

### Phase 03 Migration (from v1 to v2)

1. **Apply new tables**: Run `db/schema.v2.sql` to create all new tables (safe, CREATE IF NOT EXISTS)
2. **Add finance API routes**: New endpoints in `server.js`
3. **Frontend migration**:
   - Update `FinanceContext` to fetch from API on load, write through API
   - Keep temporary local state as fallback if API is unavailable
   - Add loading/error states for finance data
4. **Legacy bridge**:
   - Show old `cost_amount` data alongside new finance data
   - Add note in UI explaining the transition
5. **Verification**:
   - All existing screens continue to work
   - Finance data persists across page refresh
   - No data loss

### What Does NOT Change

- Existing `db/schema.sql` tables remain unchanged
- Existing API routes remain unchanged
- Existing frontend routes remain unchanged
- `tasks.cost_amount` column stays (just becomes unused in new code)

## 11. Open Questions / Later Decisions

1. **Exchange rates**: How to handle multi-currency when reporting? Store exchange rate at transaction time? Use a service?
2. **Invoice templates**: Should invoice PDF generation be server-side (Puppeteer/PDFKit) or client-side?
3. **Payment gateway integration**: Which gateways? Zarinpal for Iran? Stripe for international?
4. **Tax handling**: Should tax be per-line-item or per-invoice? Different tax rates for different services?
5. **Discount types**: Percentage vs. fixed amount? Per-line or per-invoice?
6. **Recurring invoices**: Generate automatically on schedule? Or manual generation from template?
7. **Retainer model**: How to handle monthly retainers with variable usage?
8. **Soft delete**: Should financial records support soft delete for audit purposes?
