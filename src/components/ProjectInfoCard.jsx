import { useState, useMemo } from 'react'
import { Button, Group, Modal, Paper, Stack, Text, TextInput, Badge, Select, Avatar } from '@mantine/core'
import { usePlanner } from '../state/PlannerContext.jsx'

export default function ProjectInfoCard({ project }) {
  const { state, updateProject } = usePlanner()
  const [editing, setEditing] = useState(false)
  const [collaboratorModalOpen, setCollaboratorModalOpen] = useState(false)
  const [editingCollaborator, setEditingCollaborator] = useState(null)

  const [form, setForm] = useState({
    clientName: project.clientName || '',
    clientPhone: project.clientPhone || '',
    referredByName: project.referredByName || '',
    referredByPhone: project.referredByPhone || '',
  })

  const [collaboratorForm, setCollaboratorForm] = useState({
    collaboratorId: '',
    responsibilities: [], // آرایه مسئولیت‌ها
  })
  const [newResponsibility, setNewResponsibility] = useState('')

  const collaborators = project.collaborators || []
  const allCollaborators = state.collaborators || []

  // لیست همکارانی که هنوز به پروژه اضافه نشده‌اند
  const availableCollaborators = useMemo(() => {
    const addedIds = new Set(
      collaborators
        .map((c) => c.collaboratorId || c.id)
        .filter((id) => id),
    )
    return allCollaborators
      .filter((c) => c.id && !addedIds.has(c.id))
      .map((c) => ({
        value: c.id,
        label: `${c.name || 'Unknown'}${c.role ? ` - ${c.role}` : ''}`,
        collaborator: c,
      }))
  }, [allCollaborators, collaborators])

  // پیدا کردن همکار از روی ID
  const getCollaboratorById = (id) => {
    return allCollaborators.find((c) => c.id === id)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    updateProject(project.id, form)
    setEditing(false)
  }

  const handleCancel = () => {
    setForm({
      clientName: project.clientName || '',
      clientPhone: project.clientPhone || '',
      referredByName: project.referredByName || '',
      referredByPhone: project.referredByPhone || '',
    })
    setEditing(false)
  }

  const handleAddCollaborator = () => {
    if (availableCollaborators.length === 0) {
      alert('All collaborators are already on this project. Add a new collaborator on the Collaborators page first.')
      return
    }
    setEditingCollaborator(null)
    setCollaboratorForm({ collaboratorId: '', responsibilities: [] })
    setNewResponsibility('')
    setCollaboratorModalOpen(true)
  }

  const handleEditCollaborator = (collab) => {
    setEditingCollaborator(collab)
    const responsibilities = collab.responsibilities
      ? Array.isArray(collab.responsibilities)
        ? collab.responsibilities
        : [collab.responsibilities]
      : []
    setCollaboratorForm({
      collaboratorId: collab.collaboratorId || collab.id,
      responsibilities,
    })
    setNewResponsibility('')
    setCollaboratorModalOpen(true)
  }

  const handleAddResponsibility = () => {
    if (newResponsibility.trim()) {
      setCollaboratorForm((prev) => ({
        ...prev,
        responsibilities: [...prev.responsibilities, newResponsibility.trim()],
      }))
      setNewResponsibility('')
    }
  }

  const handleRemoveResponsibility = (index) => {
    setCollaboratorForm((prev) => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== index),
    }))
  }

  const handleKeyPressResponsibility = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddResponsibility()
    }
  }

  const handleSaveCollaborator = () => {
    if (!collaboratorForm.collaboratorId) {
      alert('Please select a collaborator.')
      return
    }

    const selectedCollaborator = getCollaboratorById(collaboratorForm.collaboratorId)
    if (!selectedCollaborator) {
      alert('Selected collaborator not found.')
      return
    }

    const updatedCollaborators = editingCollaborator
      ? collaborators.map((c) =>
          c.id === editingCollaborator.id
            ? {
                ...c,
                collaboratorId: collaboratorForm.collaboratorId,
                responsibilities: collaboratorForm.responsibilities,
                // اطلاعات همکار را از لیست اصلی بگیر
                name: selectedCollaborator.name,
                phone: selectedCollaborator.phone || '',
                email: selectedCollaborator.email || '',
                role: selectedCollaborator.role || '',
              }
            : c,
        )
      : [
          ...collaborators,
          {
            id: `proj-collab-${Date.now()}`,
            collaboratorId: collaboratorForm.collaboratorId,
            responsibilities: collaboratorForm.responsibilities,
            name: selectedCollaborator.name,
            phone: selectedCollaborator.phone || '',
            email: selectedCollaborator.email || '',
            role: selectedCollaborator.role || '',
          },
        ]

    updateProject(project.id, { collaborators: updatedCollaborators })
    setCollaboratorModalOpen(false)
    setEditingCollaborator(null)
    setCollaboratorForm({ collaboratorId: '', responsibilities: [] })
    setNewResponsibility('')
  }

  const handleDeleteCollaborator = (collabId) => {
    const updatedCollaborators = collaborators.filter((c) => c.id !== collabId)
    updateProject(project.id, { collaborators: updatedCollaborators })
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <Paper shadow="xl" radius="xl" p="lg" className="project-info-card">
        <Group justify="space-between" mb="md">
          <Text fw={700} size="lg">
            Project info
          </Text>
          {!editing && (
            <Button size="xs" variant="light" radius="xl" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </Group>

        <Stack gap="md">
          {/* کارفرما */}
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">
              Client
            </Text>
            {editing ? (
              <>
                <TextInput
                  placeholder="Client name"
                  name="clientName"
                  value={form.clientName}
                  onChange={handleChange}
                />
                <TextInput
                  placeholder="Client phone"
                  name="clientPhone"
                  value={form.clientPhone}
                  onChange={handleChange}
                />
              </>
            ) : (
              <Stack gap={4}>
                {project.clientName ? (
                  <Text>{project.clientName}</Text>
                ) : (
                  <Text size="sm" c="dimmed" className="ds-text-italic">
                    Not set
                  </Text>
                )}
                {project.clientPhone && <Text size="sm" c="dimmed">{project.clientPhone}</Text>}
              </Stack>
            )}
          </Stack>

          {/* Referrer */}
          <Stack gap="xs">
            <Text fw={600} size="sm" c="dimmed">
              Referred by
            </Text>
            {editing ? (
              <>
                <TextInput
                  placeholder="Referrer name"
                  name="referredByName"
                  value={form.referredByName}
                  onChange={handleChange}
                />
                <TextInput
                  placeholder="Referrer phone"
                  name="referredByPhone"
                  value={form.referredByPhone}
                  onChange={handleChange}
                />
              </>
            ) : (
              <Stack gap={4}>
                {project.referredByName ? (
                  <Text>{project.referredByName}</Text>
                ) : (
                  <Text size="sm" c="dimmed" className="ds-text-italic">
                    Not set
                  </Text>
                )}
                {project.referredByPhone && <Text size="sm" c="dimmed">{project.referredByPhone}</Text>}
              </Stack>
            )}
          </Stack>

          {editing && (
            <Group gap="sm" mt="md">
              <Button size="sm" variant="light" radius="xl" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" variant="filled" radius="xl" onClick={handleSave}>
                Save
              </Button>
            </Group>
          )}
        </Stack>

        {/* همکاران */}
        <Stack gap="md" mt="xl">
          <Group justify="space-between">
            <Text fw={600} size="md">
              Project collaborators
            </Text>
            <Button size="xs" variant="light" radius="xl" onClick={handleAddCollaborator} disabled={availableCollaborators.length === 0}>
              + Add collaborator
            </Button>
          </Group>

          {collaborators.length === 0 ? (
            <Text size="sm" c="dimmed" className="ds-text-italic">
              No collaborators added yet
            </Text>
          ) : (
            <Stack gap="md">
              {collaborators.map((collab) => (
                <Paper
                  key={collab.id}
                  withBorder
                  radius="lg"
                  p="md"
                  className="collaborator-item ds-bg-light"
                >
                  <Group gap="md" align="flex-start" wrap="nowrap">
                    <Avatar size="lg" radius="xl" color="blue" variant="light">
                      {getInitials(collab.name || '')}
                    </Avatar>
                    <Stack gap="xs" flex={1} className="ds-min-width-0">
                      <Group gap="sm" align="center" wrap="nowrap">
                        <Text fw={700} size="md" className="ds-line-height-tight">
                          {collab.name || 'No name'}
                        </Text>
                      </Group>
                      {collab.role && (
                        <Text size="sm" c="dimmed" className="ds-line-height-normal">
                          {collab.role}
                        </Text>
                      )}
                      {collab.phone && (
                        <Text size="sm" c="dimmed" className="ds-line-height-normal">
                          {collab.phone}
                        </Text>
                      )}
                      {collab.responsibilities && (
                        <Group gap="xs" mt="xs" wrap="wrap">
                          {Array.isArray(collab.responsibilities) && collab.responsibilities.length > 0 ? (
                            collab.responsibilities.map((resp, idx) => (
                              <Badge key={idx} variant="light" color="blue" size="md" radius="xl">
                                {resp}
                              </Badge>
                            ))
                          ) : collab.responsibilities ? (
                            <Badge variant="light" color="blue" size="md" radius="xl">
                              {collab.responsibilities}
                            </Badge>
                          ) : null}
                        </Group>
                      )}
                    </Stack>
                    <Stack gap="xs" style={{ flexShrink: 0 }}>
                      <Button
                        size="xs"
                        variant="light"
                        radius="xl"
                        color="gray"
                        onClick={() => handleEditCollaborator(collab)}
                        fullWidth
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        radius="xl"
                        color="red"
                        onClick={() => handleDeleteCollaborator(collab.id)}
                        fullWidth
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Modal برای افزودن/ویرایش همکار */}
      <Modal
        opened={collaboratorModalOpen}
        onClose={() => {
          setCollaboratorModalOpen(false)
          setEditingCollaborator(null)
          setCollaboratorForm({ collaboratorId: '', responsibilities: '' })
        }}
        title={editingCollaborator ? 'Edit collaborator' : 'Add collaborator'}
        radius="lg"
      >
        <Stack gap="md">
          {!editingCollaborator && (
            <Select
              label="Select collaborator"
              placeholder="Choose a collaborator"
              data={availableCollaborators}
              value={collaboratorForm.collaboratorId}
              onChange={(value) => setCollaboratorForm((prev) => ({ ...prev, collaboratorId: value || '' }))}
              searchable
              required
              description={
                availableCollaborators.length === 0
                  ? 'All collaborators are on this project. Add a new one on the Collaborators page.'
                  : undefined
              }
            />
          )}
          {editingCollaborator && (
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Collaborator
              </Text>
              <Group gap="sm" p="sm" className="ds-bg-light ds-border-radius-sm">
                {(() => {
                  const selected = getCollaboratorById(editingCollaborator.collaboratorId || editingCollaborator.id)
                  return selected ? (
                    <>
                      <Avatar size="sm" radius="xl" color="blue">
                        {getInitials(selected.name)}
                      </Avatar>
                      <Stack gap={2}>
                        <Text size="sm" fw={600}>
                          {selected.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {selected.role}
                          {selected.email && ` • ${selected.email}`}
                          {selected.phone && ` • ${selected.phone}`}
                        </Text>
                      </Stack>
                    </>
                  ) : (
                    <Text size="sm" c="dimmed">
                      {editingCollaborator.name || 'Collaborator not found'}
                    </Text>
                  )
                })()}
              </Group>
              <Text size="xs" c="dimmed">
                To change collaborator, remove the current one and add a new one
              </Text>
            </Stack>
          )}
          {collaboratorForm.collaboratorId && (
            <Group gap="xs" p="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '8px' }}>
              {(() => {
                const selected = getCollaboratorById(collaboratorForm.collaboratorId)
                return selected ? (
                  <>
                    <Avatar size="sm" radius="xl" color="blue">
                      {getInitials(selected.name)}
                    </Avatar>
                    <Stack gap={2}>
                      <Text size="sm" fw={600}>
                        {selected.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {selected.role}
                        {selected.email && ` • ${selected.email}`}
                        {selected.phone && ` • ${selected.phone}`}
                      </Text>
                    </Stack>
                  </>
                ) : null
              })()}
            </Group>
          )}
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Responsibilities
            </Text>
            {collaboratorForm.responsibilities.length > 0 && (
              <Group gap="xs" mb="xs">
                {collaboratorForm.responsibilities.map((resp, index) => (
                  <Badge
                    key={index}
                    variant="light"
                    color="blue"
                    size="md"
                    rightSection={
                      <button
                        onClick={() => handleRemoveResponsibility(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontSize: '14px',
                          color: 'var(--mantine-color-blue-6)',
                          marginLeft: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.color = 'var(--mantine-color-red-6)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = 'var(--mantine-color-blue-6)'
                        }}
                      >
                        ×
                      </button>
                    }
                  >
                    {resp}
                  </Badge>
                ))}
              </Group>
            )}
            <Group gap="xs" align="flex-start">
              <TextInput
                placeholder="New responsibility (e.g. UI design, Backend dev)"
                value={newResponsibility}
                onChange={(e) => setNewResponsibility(e.target.value)}
                onKeyPress={handleKeyPressResponsibility}
                style={{ flex: 1 }}
                size="sm"
              />
              <Button
                size="sm"
                variant="light"
                radius="xl"
                onClick={handleAddResponsibility}
                disabled={!newResponsibility.trim()}
              >
                Add
              </Button>
            </Group>
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              radius="xl"
              onClick={() => {
                setCollaboratorModalOpen(false)
                setEditingCollaborator(null)
                setCollaboratorForm({ collaboratorId: '', responsibilities: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              radius="xl"
              onClick={handleSaveCollaborator}
              disabled={!collaboratorForm.collaboratorId || availableCollaborators.length === 0}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
