import { createContext, useContext, useMemo, useReducer } from 'react'
import { isAfter, isBefore, startOfDay, subDays } from 'date-fns'
import { sampleTransactions, sampleCommitments, samplePersons } from './sampleFinanceData.js'

const FinanceContext = createContext()

const PERIODS = {
  week: { label: 'Weekly', days: 7 },
  month: { label: 'Monthly', days: 30 },
  quarter: { label: 'Quarterly', days: 90 },
  year: { label: 'Yearly', days: 365 },
}

const initialState = {
  transactions: sampleTransactions,
  commitments: sampleCommitments,
  persons: samplePersons,
}

function nextId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function financeReducer(state, action) {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [...state.transactions, { ...action.payload, id: nextId('tx') }],
      }
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.payload.id ? { ...t, ...action.payload.patch } : t)),
      }
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
      }
    case 'ADD_COMMITMENT':
      return {
        ...state,
        commitments: [...state.commitments, { ...action.payload, id: nextId('c') }],
      }
    case 'UPDATE_COMMITMENT':
      return {
        ...state,
        commitments: state.commitments.map((c) => (c.id === action.payload.id ? { ...c, ...action.payload.patch } : c)),
      }
    case 'DELETE_COMMITMENT':
      return {
        ...state,
        commitments: state.commitments.filter((c) => c.id !== action.payload),
      }
    default:
      return state
  }
}

// Selector helpers
function getTransactionsInPeriod(transactions, periodKey) {
  const days = PERIODS[periodKey].days
  const today = startOfDay(new Date())
  const start = subDays(today, days - 1)
  return transactions.filter((tx) => {
    const txDate = startOfDay(new Date(tx.date))
    return !isBefore(txDate, start) && !isAfter(txDate, today)
  })
}

function getGlobalSummary(transactions, periodKey) {
  const periodTransactions = getTransactionsInPeriod(transactions, periodKey)
  return periodTransactions.reduce(
    (acc, tx) => {
      if (tx.type === 'income') {
        acc.income += tx.money.amount
      } else {
        acc.expense += tx.money.amount
      }
      acc.balance = acc.income - acc.expense
      return acc
    },
    { income: 0, expense: 0, balance: 0 },
  )
}

function getProjectSummaries(transactions, periodKey, projects) {
  const periodTransactions = getTransactionsInPeriod(transactions, periodKey)
  const projectMap = {}
  
  periodTransactions.forEach((tx) => {
    if (!tx.projectId) return
    if (!projectMap[tx.projectId]) {
      projectMap[tx.projectId] = { projectId: tx.projectId, income: 0, expense: 0, balance: 0 }
    }
    if (tx.type === 'income') {
      projectMap[tx.projectId].income += tx.money.amount
    } else {
      projectMap[tx.projectId].expense += tx.money.amount
    }
    projectMap[tx.projectId].balance = projectMap[tx.projectId].income - projectMap[tx.projectId].expense
  })
  
  return Object.values(projectMap)
    .map((p) => {
      const project = projects.find((pr) => pr.id === p.projectId)
      return { ...p, name: project?.name || 'Unknown' }
    })
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
}

function getTopCategories(transactions, periodKey) {
  const periodTransactions = getTransactionsInPeriod(transactions, periodKey)
  const categoryMap = {}
  
  periodTransactions.forEach((tx) => {
    if (tx.type === 'expense') {
      if (!categoryMap[tx.category]) {
        categoryMap[tx.category] = { name: tx.category, amount: 0 }
      }
      categoryMap[tx.category].amount += tx.money.amount
    }
  })
  
  return Object.values(categoryMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
}

function getUpcomingPayouts(commitments, transactions) {
  const today = startOfDay(new Date())
  const upcoming = []
  
  commitments.forEach((commitment) => {
    if (commitment.kind === 'one_off') {
      // Check if already paid
      const paid = transactions
        .filter((tx) => tx.commitmentId === commitment.id)
        .reduce((sum, tx) => sum + tx.money.amount, 0)
      
      if (paid < commitment.money.amount) {
        upcoming.push({
          ...commitment,
          dueDate: commitment.startDate,
          remaining: commitment.money.amount - paid,
        })
      }
    } else if (commitment.kind === 'recurring') {
      // For recurring, show next payment date (simplified: assume monthly on start date)
      const startDate = startOfDay(new Date(commitment.startDate))
      let nextDate = new Date(startDate)
      
      // Find next payment date
      while (nextDate <= today) {
        if (commitment.frequency === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1)
        } else if (commitment.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7)
        } else if (commitment.frequency === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1)
        }
      }
      
      upcoming.push({
        ...commitment,
        dueDate: nextDate.toISOString(),
        remaining: commitment.money.amount,
      })
    }
  })
  
  return upcoming.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 10)
}

export function FinanceProvider({ children }) {
  const [state, dispatch] = useReducer(financeReducer, initialState)

  const value = useMemo(() => {
    const addTransaction = (payload) => {
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          date: payload.date || new Date().toISOString(),
          money: { currency: 'IRR', ...payload.money },
          tags: payload.tags || [],
          ...payload,
        },
      })
    }

    const updateTransaction = (id, patch) => {
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: { id, patch },
      })
    }

    const deleteTransaction = (id) => {
      dispatch({
        type: 'DELETE_TRANSACTION',
        payload: id,
      })
    }

    const addCommitment = (payload) => {
      dispatch({
        type: 'ADD_COMMITMENT',
        payload: {
          money: { currency: 'IRR', ...payload.money },
          ...payload,
        },
      })
    }

    const updateCommitment = (id, patch) => {
      dispatch({
        type: 'UPDATE_COMMITMENT',
        payload: { id, patch },
      })
    }

    const deleteCommitment = (id) => {
      dispatch({
        type: 'DELETE_COMMITMENT',
        payload: id,
      })
    }

    // Selectors
    const getGlobalSummaryForPeriod = (period) => getGlobalSummary(state.transactions, period)
    const getProjectSummariesForPeriod = (period, projects) => getProjectSummaries(state.transactions, period, projects)
    const getTopCategoriesForPeriod = (period) => getTopCategories(state.transactions, period)
    const getUpcomingPayoutsList = () => getUpcomingPayouts(state.commitments, state.transactions)

    return {
      state,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCommitment,
      updateCommitment,
      deleteCommitment,
      getGlobalSummaryForPeriod,
      getProjectSummariesForPeriod,
      getTopCategoriesForPeriod,
      getUpcomingPayoutsList,
    }
  }, [state])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider')
  return ctx
}

