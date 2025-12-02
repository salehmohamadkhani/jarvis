import { Badge, Group, Stack, Table, Text } from '@mantine/core'
import { useState } from 'react'
import { SegmentedControl, Select } from '@mantine/core'
import { DSCard } from '../../../design-system'
import { TRANSACTION_TYPES, SPENDING_KINDS, FINANCE_CATEGORIES } from '../types.js'

export default function TransactionsTable({ transactions, persons, projects, onRowClick }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')

  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false
    if (kindFilter !== 'all' && tx.kind !== kindFilter) return false
    return true
  })

  const getPersonName = (personId) => {
    if (!personId) return '-'
    const person = persons?.find((p) => p.id === personId)
    return person?.name || 'نامشخص'
  }

  const getProjectName = (projectId) => {
    if (!projectId) return 'شخصی'
    const project = projects?.find((p) => p.id === projectId)
    return project?.name || 'نامشخص'
  }

  return (
    <DSCard>
      <Stack gap={{ base: 'xs', sm: 'sm', md: 'md' }}>
        <Text fw={700} size={{ base: 'md', sm: 'lg' }} className="ds-section-title">
          تراکنش‌ها
        </Text>

        <Stack gap="xs">
          <Group gap={{ base: 'xs', sm: 'md' }} wrap="wrap" align="flex-end">
            <SegmentedControl
              value={typeFilter}
              onChange={setTypeFilter}
              data={[
                { value: 'all', label: 'همه انواع' },
                { value: 'income', label: 'درآمد' },
                { value: 'expense', label: 'هزینه' },
              ]}
              size="sm"
              style={{ flex: '1 1 100%', minWidth: '100%' }}
              styles={{
                root: {
                  '@media (min-width: 640px)': {
                    flex: '1 1 auto',
                    minWidth: '150px',
                    maxWidth: '250px',
                  },
                },
              }}
            />
            <Select
              placeholder="دسته‌بندی"
              value={categoryFilter}
              onChange={setCategoryFilter}
              data={[
                { value: 'all', label: 'همه دسته‌بندی‌ها' },
                ...FINANCE_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
              ]}
              clearable
              size="sm"
              style={{ flex: '1 1 100%', minWidth: '100%' }}
              styles={{
                root: {
                  '@media (min-width: 640px)': {
                    flex: '1 1 auto',
                    minWidth: '150px',
                    maxWidth: '200px',
                  },
                },
              }}
            />
            <SegmentedControl
              value={kindFilter}
              onChange={setKindFilter}
              data={[
                { value: 'all', label: 'همه' },
                { value: 'personal', label: 'شخصی' },
                { value: 'project', label: 'پروژه' },
              ]}
              size="sm"
              style={{ flex: '1 1 100%', minWidth: '100%' }}
              styles={{
                root: {
                  '@media (min-width: 640px)': {
                    flex: '1 1 auto',
                    minWidth: '150px',
                    maxWidth: '250px',
                  },
                },
              }}
            />
          </Group>
        </Stack>

        {filteredTransactions.length === 0 ? (
          <Text c="dimmed" p="md" size="sm">
            تراکنشی یافت نشد
          </Text>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table striped highlightOnHover fontSize={{ base: 'xs', sm: 'sm' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ whiteSpace: 'nowrap' }}>تاریخ</Table.Th>
                  <Table.Th style={{ whiteSpace: 'nowrap' }}>نوع</Table.Th>
                  <Table.Th style={{ whiteSpace: 'nowrap' }}>دسته‌بندی</Table.Th>
                  <Table.Th style={{ whiteSpace: 'nowrap' }}>شخص</Table.Th>
                  <Table.Th style={{ whiteSpace: 'nowrap' }}>پروژه</Table.Th>
                  <Table.Th style={{ whiteSpace: 'nowrap' }}>مبلغ</Table.Th>
                  <Table.Th style={{ whiteSpace: 'nowrap' }}>توضیحات</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredTransactions.map((tx) => (
                  <Table.Tr
                    key={tx.id}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    onClick={() => onRowClick?.(tx)}
                  >
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>{new Date(tx.date).toLocaleDateString('fa-IR')}</Table.Td>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      <Badge size="sm" color={tx.type === 'income' ? 'teal' : 'red'}>
                        {tx.type === 'income' ? 'درآمد' : 'هزینه'}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>{tx.category}</Table.Td>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>{getPersonName(tx.personId)}</Table.Td>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>{getProjectName(tx.projectId)}</Table.Td>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      <Text c={tx.type === 'income' ? 'teal' : 'red'} fw={600} size="sm">
                        {tx.type === 'income' ? '+' : '-'}
                        {tx.money.amount.toLocaleString()} تومان
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.description || '-'}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Stack>
    </DSCard>
  )
}

