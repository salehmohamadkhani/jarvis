import { Grid, Stack, Text } from '@mantine/core'
import { DSCard } from '../../../design-system'

export default function FinanceSummaryCard({ summary }) {
  return (
    <Grid gutter={{ base: 'xs', sm: 'sm', md: 'md' }}>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <DSCard>
          <Stack gap={4}>
            <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
              مجموع درآمد
            </Text>
            <Text size={{ base: 'md', sm: 'lg', md: 'xl' }} fw={700} c="teal" style={{ wordBreak: 'break-word' }}>
              +{summary.income.toLocaleString()} تومان
            </Text>
          </Stack>
        </DSCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <DSCard>
          <Stack gap={4}>
            <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
              مجموع هزینه
            </Text>
            <Text size={{ base: 'md', sm: 'lg', md: 'xl' }} fw={700} c="red" style={{ wordBreak: 'break-word' }}>
              -{summary.expense.toLocaleString()} تومان
            </Text>
          </Stack>
        </DSCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <DSCard>
          <Stack gap={4}>
            <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
              موجودی خالص
            </Text>
            <Text size={{ base: 'md', sm: 'lg', md: 'xl' }} fw={700} c={summary.balance >= 0 ? 'teal' : 'red'} style={{ wordBreak: 'break-word' }}>
              {summary.balance >= 0 ? '+' : ''}
              {summary.balance.toLocaleString()} تومان
            </Text>
          </Stack>
        </DSCard>
      </Grid.Col>
    </Grid>
  )
}

