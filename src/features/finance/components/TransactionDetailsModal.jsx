import { Badge, Group, Modal, Stack, Text } from '@mantine/core'

export default function TransactionDetailsModal({ opened, onClose, transaction, person, project }) {
  if (!transaction) return null

  return (
    <Modal opened={opened} onClose={onClose} title="Transaction details" size="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600}>Type</Text>
          <Badge color={transaction.type === 'income' ? 'teal' : 'red'}>
            {transaction.type === 'income' ? 'Income' : 'Expense'}
          </Badge>
        </Group>

        <Group justify="space-between">
          <Text fw={600}>Amount</Text>
          <Text c={transaction.type === 'income' ? 'teal' : 'red'} fw={700} size="lg">
            {transaction.type === 'income' ? '+' : '-'}
            {transaction.money.amount.toLocaleString()} IRR
          </Text>
        </Group>

        <Group justify="space-between">
          <Text fw={600}>Category</Text>
          <Text>{transaction.category}</Text>
        </Group>

        <Group justify="space-between">
          <Text fw={600}>Kind</Text>
          <Badge variant="light">{transaction.kind === 'personal' ? 'Personal' : 'Project'}</Badge>
        </Group>

        {project && (
          <Group justify="space-between">
            <Text fw={600}>Project</Text>
            <Text>{project.name}</Text>
          </Group>
        )}

        {person && (
          <Group justify="space-between">
            <Text fw={600}>Person</Text>
            <Text>{person.name}</Text>
          </Group>
        )}

        <Group justify="space-between">
          <Text fw={600}>Date</Text>
          <Text>{new Date(transaction.date).toLocaleDateString()}</Text>
        </Group>

        {transaction.description && (
          <Stack gap="xs">
            <Text fw={600}>Description</Text>
            <Text>{transaction.description}</Text>
          </Stack>
        )}

        {transaction.tags && transaction.tags.length > 0 && (
          <Stack gap="xs">
            <Text fw={600}>Tags</Text>
            <Group gap="xs">
              {transaction.tags.map((tag, idx) => (
                <Badge key={idx} variant="light" color="gray">
                  {tag}
                </Badge>
              ))}
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}

