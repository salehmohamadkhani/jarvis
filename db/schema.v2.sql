-- =====================================================================
-- Jarvis -- Phase 03 Draft Schema
--
-- This is a PROPOSED schema draft for Phase 03 Finance Persistence.
-- It is NOT applied to production automatically.
-- Review carefully before executing against any database.
--
-- All CREATE statements use IF NOT EXISTS for safety.
-- Existing db/schema.sql tables are NOT modified.
-- =====================================================================

-- =====================================================================
-- 1. Project-Collaborator Many-to-Many
-- =====================================================================
CREATE TABLE IF NOT EXISTS project_collaborators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  role            TEXT,
  responsibilities JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, collaborator_id)
);

-- =====================================================================
-- 2. Finance Categories
-- =====================================================================
CREATE TABLE IF NOT EXISTS finance_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,   -- 'income', 'expense', 'both'
  color      TEXT,
  icon       TEXT,
  is_system  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 3. Finance Transactions
-- =====================================================================
CREATE TABLE IF NOT EXISTS finance_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  category_id     UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  collaborator_id UUID REFERENCES collaborators(id) ON DELETE SET NULL,
  invoice_id      UUID,  -- FK added after invoices table is created
  type            TEXT NOT NULL,          -- 'income', 'expense'
  kind            TEXT NOT NULL DEFAULT 'project',  -- 'project', 'personal', 'business', 'invoice_payment', 'commitment'
  amount          NUMERIC(14,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'IRR',
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description     TEXT,
  notes           TEXT,
  tags            JSONB DEFAULT '[]'::jsonb,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 4. Finance Commitments
-- =====================================================================
CREATE TABLE IF NOT EXISTS finance_commitments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  collaborator_id UUID REFERENCES collaborators(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'one_off',    -- 'one_off', 'recurring'
  direction       TEXT NOT NULL DEFAULT 'expense',    -- 'income', 'expense'
  amount          NUMERIC(14,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'IRR',
  start_date      DATE,
  due_date        DATE,
  frequency       TEXT,     -- 'weekly', 'monthly', 'yearly' (for recurring)
  status          TEXT NOT NULL DEFAULT 'active',     -- 'active', 'completed', 'cancelled'
  notes           TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 5. Invoices
-- =====================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL,
  title           TEXT,
  client_name     TEXT,
  client_email    TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft','sent','partially_paid','paid','overdue','cancelled'
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  currency        TEXT NOT NULL DEFAULT 'IRR',
  subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 6. Invoice Items
-- =====================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  quantity     NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price   NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 7. Payments
-- =====================================================================
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  amount         NUMERIC(14,2) NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'IRR',
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method         TEXT,    -- 'cash', 'bank_transfer', 'card', 'online', 'cheque', 'other'
  reference      TEXT,    -- payment reference number, transaction ID, cheque number
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 8. Project Rates
-- =====================================================================
CREATE TABLE IF NOT EXISTS project_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rate_type   TEXT NOT NULL DEFAULT 'fixed',  -- 'fixed', 'hourly', 'monthly', 'milestone'
  amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'IRR',
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 9. Time Entries
-- =====================================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id          UUID REFERENCES tasks(id) ON DELETE SET NULL,
  collaborator_id  UUID REFERENCES collaborators(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  duration_minutes INTEGER,
  billable         BOOLEAN NOT NULL DEFAULT FALSE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- Add FK from finance_transactions to invoices (circular-safe)
-- =====================================================================
-- This is added separately because finance_transactions and invoices
-- have a circular-ish reference (transactions can link to invoices,
-- payments link transactions to invoices).
ALTER TABLE finance_transactions
  ADD CONSTRAINT fk_finance_transactions_invoice_id
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  -- Use IF NOT EXISTS equivalent: only add if constraint doesn't exist
  -- PostgreSQL doesn't support IF NOT EXISTS for ALTER TABLE ADD CONSTRAINT
  -- so this is a note: apply this only after invoices table has data or skip for now
  -- In practice, the FK can be added in a separate migration step.
  ;

-- =====================================================================
-- Indexes
-- =====================================================================

-- Project collaborators
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id
  ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_collaborator_id
  ON project_collaborators(collaborator_id);

-- Finance transactions
CREATE INDEX IF NOT EXISTS idx_finance_transactions_project_id
  ON finance_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type
  ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_occurred_at
  ON finance_transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_invoice_id
  ON finance_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category_id
  ON finance_transactions(category_id);

-- Finance commitments
CREATE INDEX IF NOT EXISTS idx_finance_commitments_project_id
  ON finance_commitments(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_commitments_due_date
  ON finance_commitments(due_date);
CREATE INDEX IF NOT EXISTS idx_finance_commitments_status
  ON finance_commitments(status);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_project_id
  ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON invoices(due_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number
  ON invoices(invoice_number);

-- Invoice items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON invoice_items(invoice_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON payments(invoice_id);

-- Time entries
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id
  ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id
  ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_collaborator_id
  ON time_entries(collaborator_id);
