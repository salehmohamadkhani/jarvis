import { Grid, Group, Stack, Text } from '@mantine/core'
import { DSCard } from '../../../design-system'

export default function TopProjectsCard({ projects }) {
  if (!projects || projects.length === 0) {
    return (
      <DSCard>
        <Text fw={700} size={{ base: 'md', sm: 'lg' }} className="ds-section-title" mb="md">
          برترین پروژه‌ها از نظر مالی
        </Text>
        <Text c="dimmed">داده مالی پروژه موجود نیست</Text>
      </DSCard>
    )
  }

  return (
    <DSCard>
      <Text fw={700} size={{ base: 'md', sm: 'lg' }} className="ds-section-title" mb={{ base: 'xs', sm: 'sm', md: 'md' }}>
        برترین پروژه‌ها از نظر مالی
      </Text>
      <Grid gutter={{ base: 'xs', sm: 'sm', md: 'md' }}>
        {projects.map((proj, idx) => (
          <Grid.Col key={idx} span={{ base: 12, sm: 6 }}>
            <DSCard className="ds-bg-light">
              <Stack gap={4}>
                <Text fw={600} size={{ base: 'xs', sm: 'sm', md: 'md' }} style={{ wordBreak: 'break-word' }}>
                  {proj.name}
                </Text>
                <Group gap="xs" wrap="wrap">
                  <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="teal">
                    +{proj.income.toLocaleString()}
                  </Text>
                  <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} c="red">
                    -{proj.expense.toLocaleString()}
                  </Text>
                </Group>
                <Text fw={700} size={{ base: 'xs', sm: 'sm', md: 'md' }} c={proj.balance >= 0 ? 'teal' : 'red'} style={{ wordBreak: 'break-word' }}>
                  خالص: {proj.balance >= 0 ? '+' : ''}
                  {proj.balance.toLocaleString()} تومان
                </Text>
              </Stack>
            </DSCard>
          </Grid.Col>
        ))}
      </Grid>
    </DSCard>
  )
}

