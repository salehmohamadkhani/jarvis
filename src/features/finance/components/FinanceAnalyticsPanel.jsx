import { useMemo } from 'react'
import { Grid, Group, SimpleGrid, Stack, Tabs, Text } from '@mantine/core'
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { DSCard } from '../../../design-system'
import DonutChart from '../../../components/charts/DonutChart.jsx'
import NetFlowLineChart from '../../../components/charts/NetFlowLineChart.jsx'
import BucketedCashChart from '../../../components/charts/BucketedCashChart.jsx'

const PERIOD_DAYS = { week: 7, month: 30, quarter: 90, year: 365 }

function buildSeries(items, periodKey) {
  const days = PERIOD_DAYS[periodKey] ?? 30
  const today = startOfDay(new Date())
  const start = subDays(today, days - 1)
  const data = Array(days).fill(0)
  if (!items?.length) return data
  items.forEach((item) => {
    const date = startOfDay(new Date(item.date))
    let adjusted = date
    if (isAfter(date, today)) adjusted = today
    else if (isBefore(date, start)) adjusted = start
    const index = Math.max(0, Math.min(days - 1, Math.round((adjusted - start) / (1000 * 60 * 60 * 24))))
    data[index] += item.type === 'income' ? item.money.amount : -item.money.amount
  })
  return data
}

function buildTrend(items, periodKey) {
  const series = buildSeries(items, periodKey)
  const trend = []
  let cumulative = 0
  series.forEach((val) => {
    cumulative += val
    trend.push(cumulative)
  })
  if (trend.length === 0) trend.push(0)
  return trend
}

function transactionsInPeriod(transactions, periodKey) {
  const days = PERIOD_DAYS[periodKey] ?? 30
  const today = startOfDay(new Date())
  const start = subDays(today, days - 1)
  return transactions.filter((tx) => {
    const txDate = startOfDay(new Date(tx.date))
    return !isBefore(txDate, start) && !isAfter(txDate, today)
  })
}

function buildBuckets(transactions, periodKey) {
  const today = startOfDay(new Date())

  if (periodKey === 'week' || periodKey === 'month') {
    const days = PERIOD_DAYS[periodKey]
    const rangeStart = subDays(today, days - 1)
    const daysList = eachDayOfInterval({ start: rangeStart, end: today })
    return daysList.map((day) => {
      const d0 = startOfDay(day)
      const inDay = transactions.filter((tx) => startOfDay(new Date(tx.date)).getTime() === d0.getTime())
      const income = inDay.filter((t) => t.type === 'income').reduce((s, t) => s + t.money.amount, 0)
      const expense = inDay.filter((t) => t.type === 'expense').reduce((s, t) => s + t.money.amount, 0)
      return {
        key: d0.toISOString(),
        label: periodKey === 'week' ? format(day, 'EEE') : format(day, 'd'),
        income,
        expense,
      }
    })
  }

  if (periodKey === 'quarter') {
    const numWeeks = 13
    const out = []
    for (let i = numWeeks - 1; i >= 0; i -= 1) {
      const end = subDays(today, i * 7)
      const start = subDays(end, 6)
      const inB = transactions.filter((tx) => {
        const d = startOfDay(new Date(tx.date))
        return !isBefore(d, start) && !isAfter(d, end)
      })
      const income = inB.filter((t) => t.type === 'income').reduce((s, t) => s + t.money.amount, 0)
      const expense = inB.filter((t) => t.type === 'expense').reduce((s, t) => s + t.money.amount, 0)
      out.push({ key: `w${i}`, label: `${numWeeks - i}`, income, expense })
    }
    return out
  }

  /* year */
  const months = eachMonthOfInterval({ start: startOfMonth(subMonths(today, 11)), end: today })
  return months.map((m) => {
    const ms = startOfMonth(m)
    const me = endOfMonth(m)
    const inM = transactions.filter((tx) => {
      const d = startOfDay(new Date(tx.date))
      return !isBefore(d, ms) && !isAfter(d, me)
    })
    const income = inM.filter((t) => t.type === 'income').reduce((s, t) => s + t.money.amount, 0)
    const expense = inM.filter((t) => t.type === 'expense').reduce((s, t) => s + t.money.amount, 0)
    return { key: ms.toISOString(), label: format(m, 'MMM'), income, expense }
  })
}

function expenseCategorySlices(transactions) {
  const map = {}
  transactions.forEach((tx) => {
    if (tx.type !== 'expense') return
    const k = tx.category || 'Other'
    map[k] = (map[k] || 0) + tx.money.amount
  })
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#94a3b8', '#f43f5e']
  const top = entries.slice(0, 6)
  const rest = entries.slice(6).reduce((s, [, v]) => s + v, 0)
  const segs = top.map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }))
  if (rest > 0) segs.push({ label: 'Other', value: rest, color: '#64748b' })
  return segs
}

function CategoryBarList({ items, max }) {
  if (!items?.length || max <= 0) {
    return (
      <Text c="dimmed" size="sm">
        No expense categories in this range
      </Text>
    )
  }
  return (
    <Stack gap="sm">
      {items.map((row) => (
        <div key={row.name}>
          <Group justify="space-between" gap="xs" wrap="nowrap" mb={4}>
            <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
              {row.name}
            </Text>
            <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              {row.amount.toLocaleString()} IRR
            </Text>
          </Group>
          <div className="finance-cat-bar-track">
            <div className="finance-cat-bar-fill" style={{ width: `${(row.amount / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </Stack>
  )
}

function abbrevNet(n) {
  const v = Math.abs(n)
  if (v >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return `${Math.round(n)}`
}

export default function FinanceAnalyticsPanel({ transactions, period }) {
  const periodTx = useMemo(() => transactionsInPeriod(transactions, period), [transactions, period])

  const incomeTotal = useMemo(
    () => periodTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.money.amount, 0),
    [periodTx],
  )
  const expenseTotal = useMemo(
    () => periodTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.money.amount, 0),
    [periodTx],
  )
  const net = incomeTotal - expenseTotal

  const mixSegments = useMemo(() => {
    const segs = []
    if (incomeTotal > 0) segs.push({ label: 'Income', value: incomeTotal, color: '#10b981' })
    if (expenseTotal > 0) segs.push({ label: 'Expense', value: expenseTotal, color: '#ef4444' })
    return segs
  }, [incomeTotal, expenseTotal])

  const categorySegments = useMemo(() => expenseCategorySlices(periodTx), [periodTx])

  const categoryRows = useMemo(() => {
    const map = {}
    periodTx.forEach((tx) => {
      if (tx.type !== 'expense') return
      const k = tx.category || 'Other'
      map[k] = (map[k] || 0) + tx.money.amount
    })
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodTx])

  const maxCat = useMemo(() => Math.max(0, ...categoryRows.map((r) => r.amount)), [categoryRows])

  const cashTrend = useMemo(() => buildTrend(periodTx, period), [periodTx, period])
  const buckets = useMemo(() => buildBuckets(periodTx, period), [periodTx, period])

  const hasData = periodTx.length > 0

  const compareMax = Math.max(incomeTotal, expenseTotal, 1)

  return (
    <DSCard className="finance-analytics-card">
      <Tabs defaultValue="overview" keepMounted={false}>
        <Tabs.List grow mb="md">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="flow">Cash flow</Tabs.Tab>
          <Tabs.Tab value="breakdown">Breakdown</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview">
          {!hasData ? (
            <div className="ds-chart-empty">
              <Text c="dimmed" size="sm" ta="center">
                No data for this period — add transactions or widen the range.
              </Text>
            </div>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Stack gap="md" align="center">
                <Text fw={600} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                  Income vs expense
                </Text>
                <DonutChart
                  segments={mixSegments.length ? mixSegments : [{ label: 'Empty', value: 1, color: '#334155' }]}
                  centerTitle={net >= 0 ? `+${abbrevNet(net)}` : abbrevNet(net)}
                  centerSubtitle="Net (IRR)"
                  size={200}
                />
                <Stack gap={4} w="100%" maw={280}>
                  {mixSegments.map((s) => (
                    <Group key={s.label} justify="space-between" gap="xs" wrap="nowrap">
                      <Group gap={8} wrap="nowrap">
                        <span className="finance-legend-swatch" style={{ background: s.color }} />
                        <Text size="sm">{s.label}</Text>
                      </Group>
                      <Text size="sm" fw={600}>
                        {s.value.toLocaleString()}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Stack>
              <Stack gap="md" justify="center">
                <Text fw={600} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                  Totals
                </Text>
                <div className="finance-compare-bars">
                  <div className="finance-compare-row">
                    <Text size="xs" c="dimmed" w={56}>
                      Income
                    </Text>
                    <div className="finance-compare-track">
                      <div className="finance-compare-fill finance-compare-fill--income" style={{ width: `${(incomeTotal / compareMax) * 100}%` }} />
                    </div>
                    <Text size="sm" fw={600} ta="right" w={100} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {incomeTotal.toLocaleString()}
                    </Text>
                  </div>
                  <div className="finance-compare-row">
                    <Text size="xs" c="dimmed" w={56}>
                      Expense
                    </Text>
                    <div className="finance-compare-track">
                      <div className="finance-compare-fill finance-compare-fill--expense" style={{ width: `${(expenseTotal / compareMax) * 100}%` }} />
                    </div>
                    <Text size="sm" fw={600} ta="right" w={100} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {expenseTotal.toLocaleString()}
                    </Text>
                  </div>
                </div>
                <Text size="xs" c="dimmed">
                  Bars scale to the larger of income or expense so you can compare shape at a glance.
                </Text>
              </Stack>
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="flow">
          {!hasData ? (
            <div className="ds-chart-empty">
              <Text c="dimmed" size="sm" ta="center">
                No cash movements in this period.
              </Text>
            </div>
          ) : (
            <Stack gap="xl">
              <div>
                <Text fw={600} size="sm" mb="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                  Cumulative net (period)
                </Text>
                <div className="finance-chart-frame">
                  <NetFlowLineChart values={cashTrend} />
                </div>
              </div>
              <div>
                <Text fw={600} size="sm" mb="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                  Income vs expense by bucket
                </Text>
                <div className="finance-chart-frame">
                  <BucketedCashChart buckets={buckets} />
                </div>
              </div>
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="breakdown">
          {!hasData ? (
            <div className="ds-chart-empty">
              <Text c="dimmed" size="sm" ta="center">
                Nothing to break down yet.
              </Text>
            </div>
          ) : (
            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, md: 5 }}>
                <Stack gap="md" align="center">
                  <Text fw={600} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                    Expense by category
                  </Text>
                  {categorySegments.length ? (
                    <>
                      <DonutChart segments={categorySegments} size={190} strokeWidth={12} />
                      <Stack gap={6} w="100%" maw={260}>
                        {categorySegments.map((s) => (
                          <Group key={s.label} justify="space-between" gap="xs" wrap="nowrap">
                            <Group gap={8} wrap="nowrap">
                              <span className="finance-legend-swatch" style={{ background: s.color }} />
                              <Text size="xs" lineClamp={1} style={{ flex: 1 }}>
                                {s.label}
                              </Text>
                            </Group>
                            <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {s.value.toLocaleString()}
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </>
                  ) : (
                    <Text c="dimmed" size="sm">
                      No expenses in this period
                    </Text>
                  )}
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 7 }}>
                <Text fw={600} size="sm" mb="md" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                  Category amounts (expense)
                </Text>
                <CategoryBarList items={categoryRows} max={maxCat} />
              </Grid.Col>
            </Grid>
          )}
        </Tabs.Panel>
      </Tabs>
    </DSCard>
  )
}
