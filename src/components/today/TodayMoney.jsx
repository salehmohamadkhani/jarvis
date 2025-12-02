import { useMemo } from 'react'
import { useFinance } from '../../features/finance/FinanceContext.jsx'
import { usePlanner } from '../../state/PlannerContext.jsx'
import { isSameDay } from '../../utils/date.js'
import { DSSection, DSPill } from '../../design-system'

export default function TodayMoney() {
  const { state } = usePlanner()
  const { state: financeState } = useFinance()
  const transactions = financeState.transactions || []
  const commitments = financeState.commitments || []

  const projectsById = useMemo(() => {
    const map = new Map()
    state.projects.forEach(p => map.set(p.id, p.name))
    return map
  }, [state.projects])

  const { todayTx, todayCommitments } = useMemo(() => {
    const t = transactions.filter(tx => tx.date && isSameDay(tx.date, new Date()))
    const c = commitments.filter(co => co.startDate && isSameDay(co.startDate, new Date()))
    return { todayTx: t.slice(0, 6), todayCommitments: c.slice(0, 6) }
  }, [transactions, commitments])

  const sum = (list, type) =>
    list.filter(x => x.type === type).reduce((acc, x) => acc + (Number(x.money?.amount || x.amount) || 0), 0)

  const income = sum(todayTx, 'income')
  const expense = sum(todayTx, 'expense')

  return (
    <DSSection title="Money Today">
      <div className="ds-summary">
        <DSPill tone="success">Income: {income.toLocaleString()}</DSPill>
        <DSPill tone="warning">Expense: {expense.toLocaleString()}</DSPill>
      </div>

      {todayTx.length === 0 ? (
        <div className="ds-empty">تراکنشی برای امروز ثبت نشده.</div>
      ) : (
        <ul className="ds-list">
          {todayTx.map(tx => {
            const amount = Number(tx.money?.amount || tx.amount) || 0
            return (
              <li key={tx.id} className="ds-list-item">
                <div className="ds-list-item-title">{tx.description || tx.title || (tx.type === 'income' ? 'Income' : 'Expense')}</div>
                <div className="ds-list-item-meta">
                  <DSPill tone={tx.type === 'income' ? 'success' : 'warning'}>
                    {tx.type}
                  </DSPill>
                  <span className="ds-badge">{amount.toLocaleString()}</span>
                  {tx.projectId && <span className="ds-badge ds-badge-project">{projectsById.get(tx.projectId) || '—'}</span>}
                  {tx.category && <span className="ds-badge">{tx.category}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {todayCommitments.length > 0 && (
        <>
          <div className="ds-subtitle">Commitments Today</div>
          <ul className="ds-list">
            {todayCommitments.map(co => {
              const amount = Number(co.money?.amount || co.amount) || 0
              return (
                <li key={co.id} className="ds-list-item">
                  <div className="ds-list-item-title">{co.label || co.title || 'Commitment'}</div>
                  <div className="ds-list-item-meta">
                    <span className="ds-badge">{co.kind || co.type || 'commitment'}</span>
                    <span className="ds-badge">{amount.toLocaleString()}</span>
                    {co.projectId && <span className="ds-badge ds-badge-project">{projectsById.get(co.projectId) || '—'}</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </DSSection>
  )
}


