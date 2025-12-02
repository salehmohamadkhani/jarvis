import { useState } from 'react'
import { Button, Group, Modal, NumberInput, Stack, TextInput, Textarea } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { usePlanner } from '../state/PlannerContext.jsx'

export default function AddProjectModal({ opened, onClose }) {
  const { addProject } = usePlanner()
  const [form, setForm] = useState({
    name: '',
    priority: 3,
    notes: '',
    startDate: new Date(),
  })

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return
    addProject({
      name: form.name.trim(),
      priority: Number(form.priority) || 3,
      notes: form.notes.trim() || '',
      startDate: form.startDate ? new Date(form.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })
    // Reset form
    setForm({
      name: '',
      priority: 3,
      notes: '',
      startDate: new Date(),
    })
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add New Project"
      size="md"
      radius="lg"
      padding="lg"
      styles={{
        title: {
          fontSize: '1.25rem',
          fontWeight: 700,
        },
        body: {
          padding: '20px',
        },
        header: {
          padding: '20px 20px 0',
        },
      }}
    >
      <Stack gap="md">
        <TextInput
          label="Project Name"
          placeholder="Enter project name"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
          radius="md"
          size="md"
        />

        <NumberInput
          label="Priority"
          placeholder="Priority (1-5)"
          value={form.priority}
          onChange={(value) => handleChange('priority', Number(value) || 3)}
          min={1}
          max={5}
          radius="md"
          size="md"
          thousandSeparator=","
        />

        <DateInput
          label="Start Date"
          value={form.startDate}
          onChange={(value) => handleChange('startDate', value)}
          radius="md"
          size="md"
        />

        <Textarea
          label="Notes"
          placeholder="Project notes (optional)"
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          radius="md"
          size="md"
        />

        <Group justify="flex-end" mt="md" gap="sm">
          <Button variant="outline" onClick={onClose} radius="xl" size="md">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()} radius="xl" size="md">
            Add Project
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

