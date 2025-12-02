import { useState } from 'react'
import { Button, Group, Modal, NumberInput, Select, Stack, TextInput, Textarea, SegmentedControl } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { FINANCE_CATEGORIES, TRANSACTION_TYPES, SPENDING_KINDS } from '../types.js'

export default function AddTransactionModal({ opened, onClose, onSave, persons, projects }) {
  const [type, setType] = useState('expense')
  const [kind, setKind] = useState('project')
  const [projectId, setProjectId] = useState(null)
  const [personId, setPersonId] = useState(null)
  const [category, setCategory] = useState('Other')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(new Date())
  const [description, setDescription] = useState('')

  const handleSubmit = () => {
    if (amount <= 0) return

    onSave({
      type,
      kind,
      projectId: kind === 'project' ? projectId : null,
      personId: personId || null,
      category,
      money: { amount, currency: 'IRR' },
      date: date.toISOString(),
      description: description || null,
      tags: [],
    })

    // Reset form
    setType('expense')
    setKind('project')
    setProjectId(null)
    setPersonId(null)
    setCategory('Other')
    setAmount(0)
    setDate(new Date())
    setDescription('')
    onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title="افزودن تراکنش" size="md">
      <Stack gap="md">
        <SegmentedControl
          value={type}
          onChange={setType}
          data={[
            { value: 'income', label: 'درآمد' },
            { value: 'expense', label: 'هزینه' },
          ]}
          fullWidth
        />

        <SegmentedControl
          value={kind}
          onChange={setKind}
          data={[
            { value: 'personal', label: 'شخصی' },
            { value: 'project', label: 'پروژه' },
          ]}
          fullWidth
        />

        {kind === 'project' && (
          <Select
            label="پروژه"
            placeholder="انتخاب پروژه"
            value={projectId}
            onChange={setProjectId}
            data={(projects || []).map((p) => ({ value: p.id, label: p.name }))}
            required
          />
        )}

        <Select
          label="دسته‌بندی"
          value={category}
          onChange={setCategory}
          data={FINANCE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          required
        />

        <Select
          label="شخص (اختیاری)"
          placeholder="انتخاب شخص"
          value={personId}
          onChange={setPersonId}
          data={(persons || []).map((p) => ({ value: p.id, label: p.name }))}
          clearable
        />

        <NumberInput
          label="مبلغ"
          value={amount}
          onChange={(val) => setAmount(Number(val) || 0)}
          min={0}
          required
          thousandSeparator=","
        />

        <DateInput label="تاریخ" value={date} onChange={setDate} required />

        <Textarea label="توضیحات" value={description} onChange={(e) => setDescription(e.target.value)} />

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={onClose}>
            لغو
          </Button>
          <Button onClick={handleSubmit} disabled={amount <= 0 || (kind === 'project' && !projectId)}>
            ذخیره
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

