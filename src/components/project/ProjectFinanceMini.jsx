import { useMemo } from 'react'
import { useFinance } from '../../features/finance/FinanceContext.jsx'
import { DSSection, DSPill } from '../../design-system'

export default function ProjectFinanceMini({ projectId }) {
  const { state: financeState } = useFinance()
  const transactions = financeState.transactions || []

  const { totalIncome, totalExpense, lastTx } = useMemo(() => {
    const tx = transactions.filter(t => t.projectId === projectId)
    const income = tx.filter(t => t.type === 'income').reduce((a, b) => a + (Number(b.money?.amount || b.amount) || 0), 0)
    const expense = tx.filter(t => t.type === 'expense').reduce((a, b) => a + (Number(b.money?.amount || b.amount) || 0), 0)
    const sorted = [...tx].sort((a, b) => new Date(b.date) - new Date(a.date))
    return { totalIncome: income, totalExpense: expense, lastTx: sorted[0] || null }
  }, [transactions, projectId])

  const balance = totalIncome - totalExpense

  return (
    <DSSection title="Finance">
      <div className="ds-summary">
        <DSPill tone="success">Income: {totalIncome.toLocaleString()}</DSPill>
        <DSPill tone="warning">Expense: {totalExpense.toLocaleString()}</DSPill>
        <DSPill tone={balance >= 0 ? 'success' : 'warning'}>Balance: {balance.toLocaleString()}</DSPill>
      </div>
      {lastTx ? (
        <div className="ds-last-tx">
          آخرین تراکنش: {lastTx.type} — {Number(lastTx.money?.amount || lastTx.amount || 0).toLocaleString()} — {lastTx.date ? new Date(lastTx.date).toLocaleDateString() : '—'}
        </div>
      ) : (
        <div className="ds-empty">تراکنشی ثبت نشده.</div>
      )}
    </DSSection>
  )
}


