import { Group, Text } from '@mantine/core'
import { DSCard } from '../../../design-system'

export default function TopCategoriesCard({ categories }) {
  if (!categories || categories.length === 0) {
    return (
      <DSCard>
        <Text fw={700} size={{ base: 'md', sm: 'lg' }} className="ds-section-title" mb="md">
          دسته‌بندی‌های برتر هزینه
        </Text>
        <Text c="dimmed">داده دسته‌بندی موجود نیست</Text>
      </DSCard>
    )
  }

  return (
    <DSCard>
      <Text fw={700} size={{ base: 'md', sm: 'lg' }} className="ds-section-title" mb={{ base: 'xs', sm: 'sm', md: 'md' }}>
        دسته‌بندی‌های برتر هزینه
      </Text>
      <Group gap={{ base: 'xs', sm: 'sm' }} wrap="wrap">
        {categories.map((cat, idx) => (
          <DSCard key={idx} className="ds-bg-light ds-padding-sm">
            <Text size={{ base: '10px', sm: 'xs', md: 'sm' }} fw={600} style={{ wordBreak: 'break-word' }}>
              {cat.name}: {cat.amount.toLocaleString()} تومان
            </Text>
          </DSCard>
        ))}
      </Group>
    </DSCard>
  )
}

