import { Group, Select } from '@mantine/core'

const PERIODS = {
  week: 'هفتگی',
  month: 'ماهانه',
  quarter: 'سه‌ماهه',
  year: 'سالانه',
}

export default function FinanceFiltersBar({ period, projectId, projects, onChange }) {
  return (
    <Group gap={{ base: 'xs', sm: 'sm', md: 'md' }} wrap="wrap" align="flex-end">
      <Select
        label="دوره"
        value={period}
        onChange={(value) => onChange({ period: value, projectId })}
        data={Object.entries(PERIODS).map(([value, label]) => ({ value, label }))}
        size="xs"
        style={{ flex: '1 1 calc(50% - 4px)', minWidth: 'calc(50% - 4px)', maxWidth: '100%' }}
        styles={{
          root: {
            '@media (min-width: 640px)': {
              flex: '0 1 auto',
              minWidth: '140px',
              maxWidth: '200px',
            },
          },
          label: {
            fontSize: '12px',
          },
        }}
      />
      <Select
        label="پروژه"
        placeholder="همه پروژه‌ها"
        value={projectId || null}
        onChange={(value) => onChange({ period, projectId: value || null })}
        data={[
          { value: '', label: 'همه پروژه‌ها' },
          ...(projects || []).map((p) => ({ value: p.id, label: p.name })),
        ]}
        clearable
        size="xs"
        style={{ flex: '1 1 calc(50% - 4px)', minWidth: 'calc(50% - 4px)', maxWidth: '100%' }}
        styles={{
          root: {
            '@media (min-width: 640px)': {
              flex: '0 1 auto',
              minWidth: '140px',
              maxWidth: '250px',
            },
          },
          label: {
            fontSize: '12px',
          },
        }}
      />
    </Group>
  )
}

