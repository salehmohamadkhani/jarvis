import { useState } from 'react'
import { Button, Group, Modal, NumberInput, Select, Stack, TextInput, SegmentedControl } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { COMMITMENT_KINDS, RECURRING_FREQUENCIES } from '../types.js'

export default function AddCommitmentModal({ opened, onClose, onSave, persons, projects }) {
  const [projectId, setProjectId] = useState(null)
  const [personId, setPersonId] = useState(null)
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState('recurring')
  const [amount, setAmount] = useState(0)
  const [frequency, setFrequency] = useState('monthly')
  const [startDate, setStartDate] = useState(new Date())

  const handleSubmit = () => {
    if (amount <= 0 || !projectId || !label.trim()) return

    onSave({
      projectId,
      personId: personId || null,
      label: label.trim(),
      kind,
      money: { amount, currency: 'IRR' },
      frequency: kind === 'recurring' ? frequency : null,
      startDate: startDate.toISOString(),
      endDate: null,
    })

    // Reset form
    setProjectId(null)
    setPersonId(null)
    setLabel('')
    setKind('recurring')
    setAmount(0)
    setFrequency('monthly')
    setStartDate(new Date())
    onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title="افزودن تعهد" size="md">
      <Stack gap="md">
        <Select
          label="پروژه"
          placeholder="انتخاب پروژه"
          value={projectId}
          onChange={setProjectId}
          data={(projects || []).map((p) => ({ value: p.id, label: p.name }))}
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

        <TextInput label="برچسب" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثلاً: حقوق ماهانه توسعه‌دهنده" required />

        <SegmentedControl
          value={kind}
          onChange={setKind}
          data={[
            { value: 'one_off', label: 'یک‌باره' },
            { value: 'recurring', label: 'تکرارشونده' },
          ]}
          fullWidth
        />

        {kind === 'recurring' && (
          <Select
            label="فرکانس"
            value={frequency}
            onChange={setFrequency}
            data={[
              { value: 'monthly', label: 'ماهانه' },
              { value: 'weekly', label: 'هفتگی' },
              { value: 'yearly', label: 'سالانه' },
            ]}
            required
          />
        )}

        <NumberInput
          label="مبلغ"
          value={amount}
          onChange={(val) => setAmount(Number(val) || 0)}
          min={0}
          required
          thousandSeparator=","
        />

        <DateInput label="تاریخ شروع" value={startDate} onChange={setStartDate} required />

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={onClose}>
            لغو
          </Button>
          <Button onClick={handleSubmit} disabled={amount <= 0 || !projectId || !label.trim()}>
            ذخیره
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

