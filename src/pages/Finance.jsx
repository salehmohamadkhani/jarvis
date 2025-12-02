import { useMemo, useState } from 'react'
import { useFinance } from '../features/finance/FinanceContext.jsx'
import { usePlanner } from '../state/PlannerContext.jsx'
import { DSPage, DSButton } from '../design-system'
import FinanceFiltersBar from '../features/finance/components/FinanceFiltersBar.jsx'
import FinanceSummaryCard from '../features/finance/components/FinanceSummaryCard.jsx'
import FinanceCharts from '../features/finance/components/FinanceCharts.jsx'
import TopProjectsCard from '../features/finance/components/TopProjectsCard.jsx'
import TopCategoriesCard from '../features/finance/components/TopCategoriesCard.jsx'
import UpcomingPayoutsCard from '../features/finance/components/UpcomingPayoutsCard.jsx'
import TransactionsTable from '../features/finance/components/TransactionsTable.jsx'
import AddTransactionModal from '../features/finance/components/AddTransactionModal.jsx'
import AddCommitmentModal from '../features/finance/components/AddCommitmentModal.jsx'
import TransactionDetailsModal from '../features/finance/components/TransactionDetailsModal.jsx'

export default function Finance() {
  const { state: plannerState } = usePlanner()
  const {
    state: financeState,
    addTransaction,
    addCommitment,
    getGlobalSummaryForPeriod,
    getProjectSummariesForPeriod,
    getTopCategoriesForPeriod,
    getUpcomingPayoutsList,
  } = useFinance()

  const [period, setPeriod] = useState('week')
  const [projectId, setProjectId] = useState(null)
  const [isAddTransactionOpen, setAddTransactionOpen] = useState(false)
  const [isAddCommitmentOpen, setAddCommitmentOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  // Get filtered transactions based on period and project
  // We'll filter by period in FinanceCharts component, but filter by project here
  const filteredTransactions = useMemo(() => {
    let transactions = financeState.transactions
    if (projectId) {
      transactions = transactions.filter((tx) => tx.projectId === projectId)
    }
    return transactions
  }, [financeState.transactions, projectId])

  // Get summaries
  const summary = useMemo(() => getGlobalSummaryForPeriod(period), [getGlobalSummaryForPeriod, period])
  const topProjects = useMemo(() => getProjectSummariesForPeriod(period, plannerState.projects), [getProjectSummariesForPeriod, period, plannerState.projects])
  const topCategories = useMemo(() => getTopCategoriesForPeriod(period), [getTopCategoriesForPeriod, period])
  const upcomingPayouts = useMemo(() => getUpcomingPayoutsList(), [getUpcomingPayoutsList])

  const handleFiltersChange = ({ period: newPeriod, projectId: newProjectId }) => {
    if (newPeriod !== undefined) setPeriod(newPeriod)
    if (newProjectId !== undefined) setProjectId(newProjectId)
  }

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction)
  }

  const selectedPerson = useMemo(() => {
    if (!selectedTransaction?.personId) return null
    return financeState.persons.find((p) => p.id === selectedTransaction.personId)
  }, [selectedTransaction, financeState.persons])

  const selectedProject = useMemo(() => {
    if (!selectedTransaction?.projectId) return null
    return plannerState.projects.find((p) => p.id === selectedTransaction.projectId)
  }, [selectedTransaction, plannerState.projects])

  return (
    <DSPage
      title="مالی"
      actions={
        <>
          <DSButton onClick={() => setAddTransactionOpen(true)}>
            افزودن تراکنش
          </DSButton>
          <DSButton variant="secondary" onClick={() => setAddCommitmentOpen(true)}>
            افزودن تعهد
          </DSButton>
        </>
      }
    >
      <div className="ds-page-content-spacer">

        <FinanceFiltersBar period={period} projectId={projectId} projects={plannerState.projects} onChange={handleFiltersChange} />

        <FinanceSummaryCard summary={summary} />

        <FinanceCharts transactions={filteredTransactions} period={period} />

        <TopProjectsCard projects={topProjects} />

        <div className="ds-grid-two-col">
          <div className="ds-grid-col">
            <TopCategoriesCard categories={topCategories} />
          </div>
          <div className="ds-grid-col">
            <UpcomingPayoutsCard payouts={upcomingPayouts} persons={financeState.persons} projects={plannerState.projects} />
          </div>
        </div>

        <TransactionsTable
          transactions={filteredTransactions}
          persons={financeState.persons}
          projects={plannerState.projects}
          onRowClick={handleTransactionClick}
        />

        {/* Modals */}
        <AddTransactionModal
          opened={isAddTransactionOpen}
          onClose={() => setAddTransactionOpen(false)}
          onSave={addTransaction}
          persons={financeState.persons}
          projects={plannerState.projects}
        />

        <AddCommitmentModal
          opened={isAddCommitmentOpen}
          onClose={() => setAddCommitmentOpen(false)}
          onSave={addCommitment}
          persons={financeState.persons}
          projects={plannerState.projects}
        />

        <TransactionDetailsModal
          opened={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          transaction={selectedTransaction}
          person={selectedPerson}
          project={selectedProject}
        />
      </div>
    </DSPage>
  )
}
