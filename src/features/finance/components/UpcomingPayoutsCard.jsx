import { Group, Stack, Text } from '@mantine/core'
import { DSCard } from '../../../design-system'

export default function UpcomingPayoutsCard({ payouts, persons, projects }) {
  if (!payouts || payouts.length === 0) {
    return (
      <DSCard>
        <Text fw={700} size={{ base: 'md', sm: 'lg' }} className="ds-section-title" mb="md">
          پرداخت‌های پیش‌رو
        </Text>
        <Text c="dimmed">پرداخت پیش‌رویی وجود ندارد</Text>
      </DSCard>
    )
  }

  const getPersonName = (personId) => {
    const person = persons?.find((p) => p.id === personId)
    return person?.name || 'نامشخص'
  }

  const getProjectName = (projectId) => {
    const project = projects?.find((p) => p.id === projectId)
    return project?.name || 'نامشخص'
  }

  return (
    <DSCard>
      <Text fw={700} size={{ base: 'md', sm: 'lg' }} className="ds-section-title" mb={{ base: 'xs', sm: 'sm', md: 'md' }}>
        پرداخت‌های پیش‌رو
      </Text>
      <Stack gap={{ base: 'xs', sm: 'sm' }}>
        {payouts.map((payout) => (
          <DSCard key={payout.id} className="ds-bg-light">
            <Stack gap={4}>
              <Group justify="space-between" wrap="wrap" gap="xs">
                <Text fw={600} size={{ base: 'xs', sm: 'sm', md: 'md' }} style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
                  {payout.label}
                </Text>
                <Text fw={700} c="red" size={{ base: 'xs', sm: 'sm', md: 'md' }} style={{ wordBreak: 'break-word' }}>
                  {payout.money.amount.toLocaleString()} تومان
                </Text>
              </Group>
              <Group gap="xs" wrap="wrap">
                <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
                  {getPersonName(payout.personId)}
                </Text>
                <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
                  •
                </Text>
                <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
                  {getProjectName(payout.projectId)}
                </Text>
              </Group>
              <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="dimmed">
                سررسید: {new Date(payout.dueDate).toLocaleDateString('fa-IR')}
              </Text>
              {payout.remaining !== undefined && payout.remaining < payout.money.amount && (
                <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="orange">
                  باقیمانده: {payout.remaining.toLocaleString()} تومان
                </Text>
              )}
            </Stack>
          </DSCard>
        ))}
      </Stack>
    </DSCard>
  )
}

