/**
 * @typedef {Object} Money
 * @property {number} amount - Amount in smallest currency unit (e.g., IRR)
 * @property {string} currency - Currency code (default: 'IRR')
 */

/**
 * @typedef {'income' | 'expense'} TransactionType
 */

/**
 * @typedef {'personal' | 'project'} SpendingKind
 */

/**
 * @typedef {'Salary' | 'Software' | 'Marketing' | 'Equipment' | 'Travel' | 'Office' | 'Other'} FinanceCategory
 */

/**
 * @typedef {'employee' | 'contractor' | 'partner' | 'other'} PersonRole
 */

/**
 * @typedef {Object} Person
 * @property {string} id
 * @property {string} name
 * @property {PersonRole} role
 * @property {string[]} [linkedProjectIds] - Optional project IDs this person is associated with
 * @property {string} [email]
 * @property {string} [phone]
 */

/**
 * @typedef {Object} ProjectFinanceCommitment
 * @property {string} id
 * @property {string} projectId
 * @property {string} [personId] - Optional person this commitment is for
 * @property {string} label - e.g., "Monthly salary developer", "Fixed payout for design"
 * @property {'one_off' | 'recurring'} kind
 * @property {Money} money
 * @property {'monthly' | 'weekly' | 'yearly'} [frequency] - Required if kind === 'recurring'
 * @property {string} startDate - ISO date string
 * @property {string} [endDate] - ISO date string, optional
 * @property {number} [totalCommitted] - Computed: total amount committed
 * @property {number} [totalPaid] - Computed: total amount paid against this commitment
 * @property {number} [remaining] - Computed: totalCommitted - totalPaid
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} [projectId] - Nullable if personal spending
 * @property {TransactionType} type
 * @property {SpendingKind} kind
 * @property {Money} money
 * @property {string} date - ISO date string
 * @property {FinanceCategory} category
 * @property {string} [description]
 * @property {string} [personId] - Optional person associated with this transaction
 * @property {string} [commitmentId] - Optional link to a ProjectFinanceCommitment
 * @property {string[]} [tags] - Optional tags
 */

export const FINANCE_CATEGORIES = [
  'Salary',
  'Software',
  'Marketing',
  'Equipment',
  'Travel',
  'Office',
  'Other',
]

export const PERSON_ROLES = ['employee', 'contractor', 'partner', 'other']

export const TRANSACTION_TYPES = ['income', 'expense']

export const SPENDING_KINDS = ['personal', 'project']

export const COMMITMENT_KINDS = ['one_off', 'recurring']

export const RECURRING_FREQUENCIES = ['monthly', 'weekly', 'yearly']

