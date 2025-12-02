import { useMemo } from 'react'
import { Stack, Text } from '@mantine/core'
import { isAfter, isBefore, startOfDay, subDays } from 'date-fns'
import { DSCard } from '../../../design-system'
import LineChart from '../../../components/LineChart.jsx'

const PERIODS = {
  week: { days: 7 },
  month: { days: 30 },
  quarter: { days: 90 },
  year: { days: 365 },
}

function buildSeries(items, periodKey) {
  const days = PERIODS[periodKey].days
  const today = startOfDay(new Date())
  const start = subDays(today, days - 1)
  const data = Array(days).fill(0)
  
  if (items.length === 0) return data
  
  items.forEach((item) => {
    const date = startOfDay(new Date(item.date))
    let adjustedDate = date
    if (isAfter(date, today)) {
      adjustedDate = today
    } else if (isBefore(date, start)) {
      adjustedDate = start
    }
    const index = Math.max(0, Math.min(days - 1, Math.round((adjustedDate - start) / (1000 * 60 * 60 * 24))))
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
  if (trend.length === 0) {
    trend.push(0)
  }
  return trend
}

export default function FinanceCharts({ transactions, period }) {
  // Filter transactions by period
  const periodTransactions = useMemo(() => {
    const days = PERIODS[period].days
    const today = startOfDay(new Date())
    const start = subDays(today, days - 1)
    return transactions.filter((tx) => {
      const txDate = startOfDay(new Date(tx.date))
      return !isBefore(txDate, start) && !isAfter(txDate, today)
    })
  }, [transactions, period])

  const cashflowTrend = useMemo(() => {
    return buildTrend(periodTransactions, period)
  }, [periodTransactions, period])

  return (
    <DSCard>
      <Stack gap={{ base: 'xs', sm: 'sm', md: 'md' }}>
        <Text fw={700} size={{ base: 'md', sm: 'lg' }} className="ds-section-title">
          جریان نقدی در طول زمان
        </Text>
        {cashflowTrend.length > 0 && transactions.length > 0 ? (
          <div style={{ width: '100%', overflowX: 'auto', minHeight: '150px' }}>
            <LineChart positiveColor="#0ea5e9" negativeColor="#f43f5e" values={cashflowTrend} />
          </div>
        ) : (
          <div className="ds-chart-empty">
            <Text c="dimmed" size={{ base: 'xs', sm: 'sm' }} ta="center">
              داده مالی برای این دوره موجود نیست
            </Text>
          </div>
        )}
      </Stack>
    </DSCard>
  )
}

