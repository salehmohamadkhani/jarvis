import { Badge, Group, Modal, Stack, Text } from '@mantine/core'

export default function TransactionDetailsModal({ opened, onClose, transaction, person, project }) {
  if (!transaction) return null

  return (
    <Modal opened={opened} onClose={onClose} title="جزئیات تراکنش" size="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600}>نوع</Text>
          <Badge color={transaction.type === 'income' ? 'teal' : 'red'}>
            {transaction.type === 'income' ? 'درآمد' : 'هزینه'}
          </Badge>
        </Group>

        <Group justify="space-between">
          <Text fw={600}>مبلغ</Text>
          <Text c={transaction.type === 'income' ? 'teal' : 'red'} fw={700} size="lg">
            {transaction.type === 'income' ? '+' : '-'}
            {transaction.money.amount.toLocaleString()} تومان
          </Text>
        </Group>

        <Group justify="space-between">
          <Text fw={600}>دسته‌بندی</Text>
          <Text>{transaction.category}</Text>
        </Group>

        <Group justify="space-between">
          <Text fw={600}>نوع</Text>
          <Badge variant="light">{transaction.kind === 'personal' ? 'شخصی' : 'پروژه'}</Badge>
        </Group>

        {project && (
          <Group justify="space-between">
            <Text fw={600}>پروژه</Text>
            <Text>{project.name}</Text>
          </Group>
        )}

        {person && (
          <Group justify="space-between">
            <Text fw={600}>شخص</Text>
            <Text>{person.name}</Text>
          </Group>
        )}

        <Group justify="space-between">
          <Text fw={600}>تاریخ</Text>
          <Text>{new Date(transaction.date).toLocaleDateString('fa-IR')}</Text>
        </Group>

        {transaction.description && (
          <Stack gap="xs">
            <Text fw={600}>توضیحات</Text>
            <Text>{transaction.description}</Text>
          </Stack>
        )}

        {transaction.tags && transaction.tags.length > 0 && (
          <Stack gap="xs">
            <Text fw={600}>برچسب‌ها</Text>
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

