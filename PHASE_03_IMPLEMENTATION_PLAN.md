# Phase 03 -- Finance Persistence Implementation Plan

## 1. Objective

Replace the frontend-only finance prototype with persistent database-backed finance, invoice, and payment functionality. By the end of Phase 03:

- Finance transactions are stored in the database and survive page refresh
- Finance commitments are stored in the database
- Invoices can be created and tracked
- Payments can be recorded against invoices
- Project profitability is calculated from `finance_transactions`, not `tasks.cost_amount`
- The old `FinanceContext` frontend-only state is replaced with API-backed state

## 2. Files Likely to Change

### Backend

| File | Change |
|------|--------|
| `api/index.js` or `server.js` | Add finance, invoice, and payment API routes |
| `db/schema.sql` or migration | Apply new tables from `db/schema.v2.sql` |
| `docs/openapi.js` | Add new endpoint documentation |

### Frontend

| File | Change |
|------|--------|
| `src/api/plannerApi.js` | Add finance, invoice, payment API client functions |
| `src/features/finance/FinanceContext.jsx` | Refactor to fetch from API on load, write through API |
| `src/features/finance/types.js` | Add shared types/constants if applicable |
| `src/pages/Finance.jsx` | Update to handle loading/error states for API data |
| `src/pages/Projects.jsx` | Update project balance to use finance API |
| `src/pages/Dashboard.jsx` | Update finance summary to use finance API |
| `src/pages/ProjectDetails.jsx` | Update project finance to use finance API |
| `src/components/project/ProjectFinanceMini.jsx` | Update to use finance API |
| `src/components/ProjectCard.jsx` | Update balance calculation |
| `src/state/PlannerContext.jsx` | Optionally add finance state to global context |

### New Files

| File | Purpose |
|------|---------|
| `src/api/financeApi.js` | Finance-specific API client (or add to plannerApi.js) |

## 3. Backend Endpoints to Add

### Finance Categories

```
GET    /api/finance/categories        -- List all categories
POST   /api/finance/categories        -- Create a category
```

### Finance Transactions

```
GET    /api/finance/transactions        -- List transactions (with filters: projectId, type, period)
POST   /api/finance/transactions        -- Create a transaction
GET    /api/finance/transactions/:id    -- Get a single transaction
PUT    /api/finance/transactions/:id    -- Update a transaction
DELETE /api/finance/transactions/:id    -- Delete a transaction
```

### Finance Commitments

```
GET    /api/finance/commitments        -- List commitments
POST   /api/finance/commitments        -- Create a commitment
PUT    /api/finance/commitments/:id    -- Update a commitment
DELETE /api/finance/commitments/:id    -- Delete a commitment
```

### Invoices

```
GET    /api/invoices                    -- List invoices
POST   /api/invoices                    -- Create an invoice
GET    /api/invoices/:id                -- Get invoice with items
PUT    /api/invoices/:id                -- Update an invoice
PATCH  /api/invoices/:id/status         -- Update invoice status
DELETE /api/invoices/:id                -- Delete an invoice (only if draft)
```

### Payments

```
POST   /api/invoices/:id/payments       -- Record a payment against an invoice
GET    /api/invoices/:id/payments       -- List payments for an invoice
```

### Finance Summary

```
GET    /api/projects/:id/finance-summary  -- Get project income/expense/balance
```

## 4. Frontend API Client Changes

Add to `src/api/plannerApi.js` (or create `src/api/financeApi.js`):

```javascript
export const financeApi = {
  // Categories
  getCategories: async () => { ... },
  createCategory: async (data) => { ... },

  // Transactions
  getTransactions: async (filters) => { ... },
  createTransaction: async (data) => { ... },
  updateTransaction: async (id, data) => { ... },
  deleteTransaction: async (id) => { ... },

  // Commitments
  getCommitments: async () => { ... },
  createCommitment: async (data) => { ... },
  updateCommitment: async (id, data) => { ... },
  deleteCommitment: async (id) => { ... },
}

export const invoicesApi = {
  getInvoices: async (filters) => { ... },
  createInvoice: async (data) => { ... },
  getInvoice: async (id) => { ... },
  updateInvoice: async (id, data) => { ... },
  deleteInvoice: async (id) => { ... },
  recordPayment: async (invoiceId, data) => { ... },
}
```

## 5. FinanceContext Migration Plan

### Current State

`FinanceContext` uses `useReducer` with hardcoded initial state `{ transactions: [], commitments: [], persons: [] }`. All data is lost on page refresh. No API calls are made.

### Target State

`FinanceContext` fetches initial data from the API on mount, writes through the API, and keeps a local cache in reducer state for responsiveness.

### Migration Steps

1. Add API client functions (step 4 above)
2. Add a `loadData` effect in `FinanceContext` that fetches from API on mount
3. Replace reducer actions to call API then dispatch local update
4. Add loading/error states
5. Keep local state as fallback if API is unavailable (graceful degradation)
6. Add retry logic for transient failures

### Pseudo-code for new FinanceContext

```javascript
const initialState = {
  transactions: [],
  commitments: [],
  categories: [],
  loading: true,
  error: null,
  saving: false,
}

// On mount load:
useEffect(() => {
  loadTransactions()
  loadCommitments()
  loadCategories()
}, [])

// On write:
async function addTransaction(payload) {
  setState(prev => ({ ...prev, saving: true }))
  try {
    const saved = await financeApi.createTransaction(payload)
    dispatch({ type: 'ADD_TRANSACTION', payload: saved })
  } catch (err) {
    // Keep local fallback
    const tempId = `temp-${Date.now()}`
    dispatch({ type: 'ADD_TRANSACTION', payload: { ...payload, id: tempId, _temp: true } })
    // Queue for retry
  } finally {
    setState(prev => ({ ...prev, saving: false }))
  }
}
```

## 6. Project Balance Unification Plan

### Current Confusion

- `ProjectCard.jsx` uses `tasks.cost_amount` to calculate balance (treating positive as income, negative as expense)
- `Dashboard.jsx` uses both `tasks.cost_amount` (line 33: `realTasks` filter) AND `financeState.transactions` (lines 43-46)
- `Finance.jsx` uses only `financeState.transactions`
- `ProjectDetails.jsx` uses `financeState.transactions`

### Unification Plan

1. **Phase 03 migration**: Add `financeApi.getProjectSummary(projectId)` endpoint
2. Add a unified `getProjectBalance` function that first tries API, falls back to local calculation
3. Gradually remove `cost_amount` from balance calculations:
   - Phase 03 step 1: Show both sources with a label
   - Phase 03 step 2: Default to finance transactions, keep cost_amount as fallback
   - Phase 03 step 3: Remove cost_amount display entirely once migration is verified
4. Update ProjectCard to use finance API
5. Update Dashboard to use finance API
6. Remove `costAmount` filter logic from task queries

## 7. Database Migration Notes

- Run `db/schema.v2.sql` against the target database
- All statements use `CREATE TABLE IF NOT EXISTS` -- safe to run
- The FK from `finance_transactions` to `invoices` requires a separate step (or skip initially)
- Seed default categories: income categories (Client Payment, Refund, Other Income) and expense categories (Software, Hardware, Travel, Food, Office, Tax, Other Expense)
- No existing data is modified or dropped
- PGlite users: the new tables will be created automatically on server restart after schema.v2.sql is applied

## 8. Testing Plan

### Automated Checks

```
npm install
npm run lint       -- Must pass (pre-existing warnings ok)
npm run build      -- Must pass
npm run verify     -- If available
```

### Manual Smoke Tests

1. Start server with `npm start`
2. `curl http://localhost:3001/api/health` -- Should return healthy
3. Create a finance transaction:
   ```bash
   curl -X POST http://localhost:3001/api/finance/transactions \
     -H 'Content-Type: application/json' \
     -d '{"type":"income","amount":5000000,"currency":"IRR","description":"Client payment"}'
   ```
4. List transactions:
   ```bash
   curl http://localhost:3001/api/finance/transactions
   ```
5. Create an invoice:
   ```bash
   curl -X POST http://localhost:3001/api/invoices \
     -H 'Content-Type: application/json' \
     -d '{"invoice_number":"INV-001","client_name":"Test Client","total_amount":5000000}'
   ```
6. Record a payment:
   ```bash
   curl -X POST http://localhost:3001/api/invoices/INV-001/payments \
     -H 'Content-Type: application/json' \
     -d '{"amount":5000000}'
   ```
7. Check project finance summary:
   ```bash
   curl http://localhost:3001/api/projects/<uuid>/finance-summary
   ```
8. Open UI, create a transaction, refresh page -- data should persist
9. Dashboard and ProjectDetails should show correct finance data

## 9. Risk Management

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Existing `tasks.cost_amount` is preserved. New finance data goes into new tables. |
| FinanceContext breaks existing screens | Keep old FinanceContext behind a feature flag. Migrate screens one at a time. |
| API endpoint naming conflicts | Use `/api/finance/*` prefix for all finance endpoints to avoid conflicts. |
| PGlite compatibility | Test new schema with PGlite. PGlite supports most PostgreSQL syntax. |
| Lint failures from new code | Follow existing code style. Run lint before commit. |
| Accidentally shipping incomplete finance | Keep FinanceContext hybrid: use API if available, fall back to local state. |
| Breaking assistant commands | Assistant does not yet use finance data. No risk. |

## 10. Definition of Done for Phase 03

- [ ] `db/schema.v2.sql` applied and verified
- [ ] All finance API endpoints implemented and tested
- [ ] Invoice API endpoints implemented and tested
- [ ] Frontend API client functions added
- [ ] `FinanceContext` fetches from API on load
- [ ] `FinanceContext` writes through API with local fallback
- [ ] Finance data persists across page refresh
- [ ] Project balance uses finance transactions (not cost_amount)
- [ ] Invoices can be created, viewed, and tracked
- [ ] Payments can be recorded against invoices
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (pre-existing warnings only)
- [ ] No regressions in existing features
- [ ] All changes committed on a feature branch
- [ ] Branch pushed to GitHub
- [ ] PR created
