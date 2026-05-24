import { Grid, Stack, Text } from '@mantine/core'
import { DSCard } from '../../../design-system'

export default function FinanceSummaryCard({ summary }) {
  return (
    <Grid className="finance-stat-grid" gutter={{ base: 'xs', sm: 'sm', md: 'md' }}>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <DSCard className="finance-stat-card finance-stat-card--income">
          <Stack gap={4}>
            <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
              Total income
            </Text>
            <Text size={{ base: 'md', sm: 'lg', md: 'xl' }} fw={700} c="teal" style={{ wordBreak: 'break-word' }}>
              +{summary.income.toLocaleString()} IRR
            </Text>
          </Stack>
        </DSCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <DSCard className="finance-stat-card finance-stat-card--expense">
          <Stack gap={4}>
            <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
              Total expense
            </Text>
            <Text size={{ base: 'md', sm: 'lg', md: 'xl' }} fw={700} c="red" style={{ wordBreak: 'break-word' }}>
              -{summary.expense.toLocaleString()} IRR
            </Text>
          </Stack>
        </DSCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <DSCard className="finance-stat-card finance-stat-card--net">
          <Stack gap={4}>
            <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
              Net balance
            </Text>
            <Text size={{ base: 'md', sm: 'lg', md: 'xl' }} fw={700} c={summary.balance >= 0 ? 'teal' : 'red'} style={{ wordBreak: 'break-word' }}>
              {summary.balance >= 0 ? '+' : ''}
              {summary.balance.toLocaleString()} IRR
            </Text>
          </Stack>
        </DSCard>
      </Grid.Col>
    </Grid>
  )
}

