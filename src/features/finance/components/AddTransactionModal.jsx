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
    <Modal opened={opened} onClose={onClose} title="Add transaction" size="md">
      <Stack gap="md">
        <SegmentedControl
          value={type}
          onChange={setType}
          data={[
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expense' },
          ]}
          fullWidth
        />

        <SegmentedControl
          value={kind}
          onChange={setKind}
          data={[
            { value: 'personal', label: 'Personal' },
            { value: 'project', label: 'Project' },
          ]}
          fullWidth
        />

        {kind === 'project' && (
          <Select
            label="Project"
            placeholder="Select project"
            value={projectId}
            onChange={setProjectId}
            data={(projects || []).map((p) => ({ value: p.id, label: p.name }))}
            required
          />
        )}

        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          data={FINANCE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          required
        />

        <Select
          label="Person (optional)"
          placeholder="Select person"
          value={personId}
          onChange={setPersonId}
          data={(persons || []).map((p) => ({ value: p.id, label: p.name }))}
          clearable
        />

        <NumberInput
          label="Amount"
          value={amount}
          onChange={(val) => setAmount(Number(val) || 0)}
          min={0}
          required
          thousandSeparator=","
        />

        <DateInput label="Date" value={date} onChange={setDate} required />

        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={amount <= 0 || (kind === 'project' && !projectId)}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

