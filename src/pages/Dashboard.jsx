import { addDays, isAfter, isBefore, isSameDay, startOfDay, subDays } from 'date-fns'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BarChart from '../components/BarChart.jsx'
import LineChart from '../components/LineChart.jsx'
import CalendarCard from '../components/CalendarCard.jsx'
import { usePlanner } from '../state/PlannerContext.jsx'
import { useFinance } from '../features/finance/FinanceContext.jsx'
import { DSPage, DSSection, DSCard, DSButton, DSPill, DSToolbar } from '../design-system'

const PERIODS = {
  week: { label: 'Weekly', days: 7 },
  month: { label: 'Monthly', days: 30 },
  quarter: { label: 'Quarterly', days: 90 },
  year: { label: 'Yearly', days: 365 },
}

export default function Dashboard() {
  const { state, toggleTask } = usePlanner()
  const { state: financeState } = useFinance()
  const transactions = financeState.transactions || []
  const navigate = useNavigate()
  const [financePeriod, setFinancePeriod] = useState('week')
  const [taskPeriod, setTaskPeriod] = useState('week')
  const [anchor, setAnchor] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [expandedDayTaskId, setExpandedDayTaskId] = useState(null)
  const projectMap = useMemo(() => Object.fromEntries(state.projects.map((p) => [p.id, p])), [state.projects])

  const now = new Date()
  const activeProjects = state.projects.filter((p) => !p.archived)
  const archivedProjects = state.projects.filter((p) => p.archived)
  const realTasks = state.tasks.filter((t) => t.costAmount === null && !t.archived)
  const doneCount = realTasks.filter((t) => t.status === 'done').length
  const upcomingTasks = realTasks.filter((t) => t.dueAt && isAfter(new Date(t.dueAt), now)).length
  const upcomingMeetings = state.meetings.filter((m) => isAfter(new Date(m.scheduledAt), now)).length

  // Project statistics
  const projectStats = useMemo(() => {
    return activeProjects.map((project) => {
      const tasks = state.tasks.filter((t) => t.projectId === project.id && t.costAmount === null && !t.archived)
      const done = tasks.filter((t) => t.status === 'done').length
      const projectTransactions = transactions.filter((t) => t.projectId === project.id)
      const income = projectTransactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + (Number(t.money?.amount || t.amount) || 0), 0)
      const expense = projectTransactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + (Number(t.money?.amount || t.amount) || 0), 0)
      const balance = income - expense
      return {
        project,
        tasksTotal: tasks.length,
        done,
        balance,
        income,
        expense,
        completionRate: tasks.length > 0 ? (done / tasks.length) * 100 : 0,
      }
    })
  }, [activeProjects, state.tasks, transactions])

  const topProjects = useMemo(() => {
    return [...projectStats]
      .sort((a, b) => b.tasksTotal - a.tasksTotal)
      .slice(0, 5)
  }, [projectStats])

  const topBalanceProjects = useMemo(() => {
    return [...projectStats]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3)
  }, [projectStats])

  // Filter transactions by period
  const financeEntries = useMemo(() => {
    const days = PERIODS[financePeriod].days
    const today = startOfDay(new Date())
    const start = subDays(today, days - 1)
    return transactions.filter((tx) => {
      const txDate = startOfDay(new Date(tx.date))
      return !isBefore(txDate, start) && !isAfter(txDate, today)
    })
  }, [transactions, financePeriod])

  const financeSeries = useMemo(() => buildSeries(financeEntries, financePeriod, (item) => {
    const amount = Number(item.money?.amount || item.amount) || 0
    return item.type === 'income' ? amount : -amount
  }), [financeEntries, financePeriod])
  const financeTrend = useMemo(() => buildTrend(financeEntries, financePeriod), [financeEntries, financePeriod])
  const tasksSeries = useMemo(() => buildSeries(realTasks.filter((t) => t.status === 'done'), taskPeriod, () => 1), [realTasks, taskPeriod])

  // Calculate totals from all transactions (not filtered by period)
  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.money?.amount || tx.amount) || 0
        if (tx.type === 'income') {
          acc.income += amount
        } else if (tx.type === 'expense') {
          acc.expense += amount
        }
        acc.balance = acc.income - acc.expense
        return acc
      },
      { income: 0, expense: 0, balance: 0 },
    )
  }, [transactions])

  const totalTasksAcrossProjects = projectStats.reduce((sum, p) => sum + p.tasksTotal, 0)
  const totalDoneAcrossProjects = projectStats.reduce((sum, p) => sum + p.done, 0)

  const dayItems = useMemo(() => {
    if (!selectedDay) return []
    return realTasks.filter((t) => t.dueAt && isSameDay(new Date(t.dueAt), selectedDay) && !t.archived)
  }, [selectedDay, realTasks])

  return (
    <DSPage title="Dashboard">
      <div className="stat-grid">
        <StatCard title="Active Projects" value={activeProjects.length} onClick={() => navigate('/projects')} />
        <StatCard title="Archived Projects" value={archivedProjects.length} onClick={() => navigate('/projects/archived')} />
        <StatCard title="Total Tasks" value={`${totalDoneAcrossProjects}/${totalTasksAcrossProjects} Done`} />
        <StatCard title="Upcoming" value={`${upcomingTasks} tasks, ${upcomingMeetings} meetings`} />
      </div>

      {/* Top Projects by Tasks */}
      {topProjects.length > 0 && (
        <DSSection
          title="Top Projects by Tasks"
          headerRight={
            <DSButton variant="secondary" onClick={() => navigate('/projects')}>
              View All
            </DSButton>
          }
        >
          <div className="projects-summary-list">
            {topProjects.map(({ project, tasksTotal, done, completionRate }) => (
              <DSCard
                key={project.id}
                clickable
                onClick={() => navigate(`/projects/${project.id}`)}
                className="ds-dashboard-project-card"
              >
                <div className="ds-dashboard-project-row">
                  <div className="ds-dashboard-project-left">
                    <div className="ds-dashboard-project-name">{project.name}</div>
                    <div className="ds-dashboard-project-meta">
                      <span className="ds-badge">{project.status}</span>
                      <span className="ds-dashboard-project-stats">
                        {done}/{tasksTotal} tasks
                      </span>
                    </div>
                  </div>
                  <div className="ds-dashboard-project-right">
                    <div className="ds-dashboard-project-value">{completionRate.toFixed(0)}%</div>
                    <div className="ds-dashboard-project-label">complete</div>
                  </div>
                </div>
              </DSCard>
            ))}
          </div>
        </DSSection>
      )}

      {/* Top Projects by Balance */}
      {topBalanceProjects.length > 0 && (
        <DSSection
          title="Top Projects by Finance"
          headerRight={
            <DSButton variant="secondary" onClick={() => navigate('/finance')}>
              View Finance
            </DSButton>
          }
        >
          <div className="projects-summary-list">
            {topBalanceProjects.map(({ project, balance, income, expense }) => (
              <DSCard
                key={project.id}
                clickable
                onClick={() => navigate(`/projects/${project.id}`)}
                className="ds-dashboard-project-card"
              >
                <div className="ds-dashboard-project-row">
                  <div className="ds-dashboard-project-left">
                    <div className="ds-dashboard-project-name">{project.name}</div>
                    <div className="ds-dashboard-project-meta">
                      <span className="ds-dashboard-project-income">+{income.toLocaleString()} تومان</span>
                      <span className="ds-dashboard-project-expense">-{expense.toLocaleString()} تومان</span>
                    </div>
                  </div>
                  <div className="ds-dashboard-project-right">
                    <div className={`ds-dashboard-project-value ${balance >= 0 ? 'ds-dashboard-value-positive' : 'ds-dashboard-value-negative'}`}>
                      {balance >= 0 ? "+" : "-"}
                      {Math.abs(balance).toLocaleString()} تومان
                    </div>
                    <div className="ds-dashboard-project-label">balance</div>
                  </div>
                </div>
              </DSCard>
            ))}
          </div>
        </DSSection>
      )}

      <CalendarCard
        anchor={anchor}
        tasks={realTasks}
        onAnchorChange={setAnchor}
        onSelectDay={(day) => setSelectedDay(day)}
      />

      {selectedDay && (
        <DSSection
          title={`Tasks on ${selectedDay.toLocaleDateString()}`}
          headerRight={
            <DSButton variant="secondary" onClick={() => setSelectedDay(null)}>
              Clear
            </DSButton>
          }
        >
          {dayItems.length === 0 ? (
            <p className="muted">No tasks scheduled.</p>
          ) : (
            <div className="day-tasks-list">
              {dayItems.map((task) => {
                const project = task.projectId ? projectMap[task.projectId] : null
                const isExpanded = expandedDayTaskId === task.id
                const tileClass = `day-task-tile${task.status === 'done' ? ' completed-task' : ''}`
                return (
                  <div key={task.id} className={tileClass} onClick={() => setExpandedDayTaskId(isExpanded ? null : task.id)}>
                    <div className="day-task-row">
                      <div className="day-task-left">
                        <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleTask(task.id)
                        }}
                      />
                        <div>
                          <strong>{task.title}</strong>
                          {project && (
                            <div className="day-task-project">{project.name}</div>
                          )}
                        </div>
                      </div>
                      <DSPill tone={task.status === 'done' ? 'success' : task.status === 'todo' ? 'info' : 'warning'}>
                        {task.status}
                      </DSPill>
                    </div>
                    <p className="muted">
                      Priority {task.priority}
                      {task.assignedTo ? ` • ${task.assignedTo}` : ''}
                      {task.dueAt ? ` • ${new Date(task.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </p>
                    {isExpanded && (
                      <div className="day-task-detail">
                        <p>
                          <span>Status:</span> {task.status}
                        </p>
                        <p>
                          <span>Priority:</span> {task.priority}
                        </p>
                        {task.dueAt && (
                          <p>
                            <span>Due date:</span> {new Date(task.dueAt).toLocaleString()}
                          </p>
                        )}
                        {task.notes && (
                          <p>
                            <span>Notes:</span> {task.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </DSSection>
      )}

      <DSSection
        title="Finance summary"
        headerRight={<PeriodTabs value={financePeriod} onChange={setFinancePeriod} />}
      >
        <div className="ds-chart-container">
          {financeTrend.length > 0 && financeTrend.some(v => v !== 0) ? (
            <LineChart positiveColor="#0ea5e9" negativeColor="#f43f5e" values={financeTrend} />
          ) : (
            <div className="ds-chart-empty">
              No financial data available for this period
            </div>
          )}
        </div>
        <div className="finance-row">
          <div className="finance-item">
            <span>Income</span>
            <strong className="positive">+{totals.income.toLocaleString()} تومان</strong>
          </div>
          <div className="finance-item">
            <span>Expense</span>
            <strong className="negative">-{totals.expense.toLocaleString()} تومان</strong>
          </div>
          <div className="finance-item">
            <span>Balance</span>
            <strong className={totals.balance >= 0 ? 'positive' : 'negative'}>
              {totals.balance >= 0 ? '+' : '-'}
              {Math.abs(totals.balance).toLocaleString()} تومان
            </strong>
          </div>
        </div>
      </DSSection>

      <DSSection
        title="Tasks done"
        headerRight={<PeriodTabs value={taskPeriod} onChange={setTaskPeriod} />}
      >
        <BarChart values={tasksSeries} positiveColor="#2563eb" negativeColor="#cbd5f5" />
      </DSSection>
    </DSPage>
  )
}

function StatCard({ title, value, onClick }) {
  return (
    <div className={`stat-card${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PeriodTabs({ value, onChange }) {
  return (
    <div className="period-tabs">
      {Object.entries(PERIODS).map(([key, meta]) => (
        <button key={key} className={value === key ? 'pill active' : 'pill'} onClick={() => onChange(key)}>
          {meta.label}
        </button>
      ))}
    </div>
  )
}

function buildSeries(items, periodKey, valueSelector) {
  const days = PERIODS[periodKey].days
  const today = startOfDay(new Date())
  const start = subDays(today, days - 1)
  const data = Array(days).fill(0)
  items.forEach((item) => {
    // For transactions, use item.date; for tasks/meetings, use dueAt/scheduledAt/etc
    const reference = item.date || item.dueAt || item.updatedAt || item.createdAt || item.scheduledAt
    if (!reference) return
    const date = startOfDay(new Date(reference))
    let adjustedDate = date
    if (isAfter(date, today)) {
      adjustedDate = today
    } else if (isBefore(date, start)) {
      adjustedDate = start
    }
    const index = Math.max(0, Math.min(days - 1, Math.round((adjustedDate - start) / (1000 * 60 * 60 * 24))))
    data[index] += valueSelector(item)
  })
  return data
}

function buildTrend(items, periodKey) {
  const series = buildSeries(items, periodKey, (item) => {
    // For transactions, calculate income - expense; for old finance tasks, use costAmount
    if (item.type !== undefined) {
      const amount = Number(item.money?.amount || item.amount) || 0
      return item.type === 'income' ? amount : -amount
    }
    return item.costAmount ?? 0
  })
  const trend = []
  series.reduce((acc, val) => {
    const next = acc + val
    trend.push(next)
    return next
  }, 0)
  return trend
}
