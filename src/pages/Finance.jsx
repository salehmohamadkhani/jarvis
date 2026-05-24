import { useMemo, useState } from 'react'
import { DirectionProvider, Stack, Tabs } from '@mantine/core'
import { useFinance } from '../features/finance/FinanceContext.jsx'
import { usePlanner } from '../state/PlannerContext.jsx'
import { DSPage, DSButton, DSSection } from '../design-system'
import FinanceFiltersBar from '../features/finance/components/FinanceFiltersBar.jsx'
import FinanceSummaryCard from '../features/finance/components/FinanceSummaryCard.jsx'
import FinanceAnalyticsPanel from '../features/finance/components/FinanceAnalyticsPanel.jsx'
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
  const [mainTab, setMainTab] = useState('summary')
  const [isAddTransactionOpen, setAddTransactionOpen] = useState(false)
  const [isAddCommitmentOpen, setAddCommitmentOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  const filteredTransactions = useMemo(() => {
    let transactions = financeState.transactions
    if (projectId) {
      transactions = transactions.filter((tx) => tx.projectId === projectId)
    }
    return transactions
  }, [financeState.transactions, projectId])

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
    <DirectionProvider initialDirection="ltr" detectDirection={false}>
      <DSPage
        title="Finance"
        actions={
          <>
            <DSButton onClick={() => setAddTransactionOpen(true)}>
              Add Transaction
            </DSButton>
            <DSButton variant="secondary" onClick={() => setAddCommitmentOpen(true)}>
              Add Commitment
            </DSButton>
          </>
        }
      >
        <div className="ds-page-content-spacer finance-page" dir="ltr" lang="en">
        <DSSection
          className="finance-scope-section"
          title="Report scope"
          description="Period and project apply to Summary, Analytics, Ledger, and Payouts."
        >
          <FinanceFiltersBar
            period={period}
            projectId={projectId}
            projects={plannerState.projects}
            onChange={handleFiltersChange}
          />
        </DSSection>

        <Tabs
          value={mainTab}
          onChange={(v) => v && setMainTab(v)}
          keepMounted={false}
          className="finance-main-tabs"
        >
          <Tabs.List className="finance-main-tabs-list">
            <Tabs.Tab value="summary">Summary</Tabs.Tab>
            <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
            <Tabs.Tab value="ledger">Ledger</Tabs.Tab>
            <Tabs.Tab value="payouts">Payouts</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="summary" pt="md" className="finance-tab-panel">
            <Stack gap="lg">
              <FinanceSummaryCard summary={summary} />
              <TopProjectsCard projects={topProjects} />
              <TopCategoriesCard categories={topCategories} />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="analytics" pt="md" className="finance-tab-panel">
            <FinanceAnalyticsPanel transactions={filteredTransactions} period={period} />
          </Tabs.Panel>

          <Tabs.Panel value="ledger" pt="md" className="finance-tab-panel">
            <TransactionsTable
              transactions={filteredTransactions}
              persons={financeState.persons}
              projects={plannerState.projects}
              onRowClick={handleTransactionClick}
            />
          </Tabs.Panel>

          <Tabs.Panel value="payouts" pt="md" className="finance-tab-panel">
            <UpcomingPayoutsCard payouts={upcomingPayouts} persons={financeState.persons} projects={plannerState.projects} />
          </Tabs.Panel>
        </Tabs>

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
    </DirectionProvider>
  )
}
