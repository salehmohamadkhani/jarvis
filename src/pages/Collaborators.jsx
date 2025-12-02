import { useState } from 'react'
import { Modal, TextInput, Avatar } from '@mantine/core'
import { usePlanner } from '../state/PlannerContext.jsx'
import { DSPage, DSSection, DSCard, DSButton } from '../design-system'

export default function Collaborators() {
  const { state, addCollaborator, updateCollaborator, deleteCollaborator } = usePlanner()
  const [editingId, setEditingId] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '' })

  const members = state.collaborators || []

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const startEdit = (member) => {
    setEditingId(member.id)
    setForm({ name: member.name, role: member.role, email: member.email || '', phone: member.phone || '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!editingId) return
    updateCollaborator(editingId, form)
    setEditingId(null)
    setForm({ name: '', role: '', email: '', phone: '' })
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm({ name: '', role: '', email: '', phone: '' })
  }

  const handleAddNew = () => {
    setForm({ name: '', role: '', email: '', phone: '' })
    setAddModalOpen(true)
  }

  const handleAddSubmit = (e) => {
    e.preventDefault()
    addCollaborator(form)
    setAddModalOpen(false)
    setForm({ name: '', role: '', email: '', phone: '' })
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
      <DSPage
        title="Collaborators"
        actions={<DSButton onClick={handleAddNew}>+ Add</DSButton>}
      >
        <DSSection description="Tap a person to edit their info.">
          <div className="ds-collaborators-list">
            {members.length === 0 ? (
              <div className="ds-empty ds-empty-italic">
                No collaborators yet. Click "+ Add" to add one.
              </div>
            ) : (
              members.map((member) => (
                <DSCard
                  key={member.id}
                  clickable
                  onClick={() => startEdit(member)}
                  className="ds-collaborator-item"
                >
                {editingId === member.id ? (
                  <form onSubmit={handleSubmit}>
                    <div className="ds-form-stack">
                      <TextInput
                        label="Name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        autoFocus
                      />
                      <TextInput label="Role" name="role" value={form.role} onChange={handleChange} required />
                      <TextInput
                        label="Email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                      />
                      <TextInput
                        label="Phone"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="09123456789"
                      />
                      <div className="ds-form-actions">
                        <DSButton variant="secondary" type="button" onClick={handleCancel}>
                          Cancel
                        </DSButton>
                        <DSButton type="submit">
                          Save changes
                        </DSButton>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="ds-collaborator-row">
                    <Avatar size="md" radius="xl" color="blue">
                      {getInitials(member.name)}
                    </Avatar>
                    <div className="ds-collaborator-info">
                      <div className="ds-collaborator-name">{member.name}</div>
                      <div className="ds-collaborator-meta">
                        {member.role}
                        {member.email && ` • ${member.email}`}
                        {member.phone && ` • ${member.phone}`}
                      </div>
                    </div>
                    <span className="ds-badge">Edit</span>
                  </div>
                )}
                </DSCard>
              ))
            )}
          </div>
        </DSSection>
      </DSPage>

      {/* Modal برای افزودن همکار جدید */}
      <Modal
        opened={addModalOpen}
        onClose={() => {
          setAddModalOpen(false)
          setForm({ name: '', role: '', email: '', phone: '' })
        }}
        title="Add New Collaborator"
        radius="lg"
      >
        <form onSubmit={handleAddSubmit}>
          <div className="ds-form-stack">
            <TextInput
              label="Name"
              placeholder="Collaborator name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              autoFocus
            />
            <TextInput
              label="Role"
              placeholder="Role (e.g., Designer, Developer)"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            />
            <TextInput
              label="Email"
              type="email"
              placeholder="email@example.com"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
            <TextInput
              label="Phone"
              placeholder="09123456789"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />
            <div className="ds-form-actions">
              <DSButton
                variant="secondary"
                type="button"
                onClick={() => {
                  setAddModalOpen(false)
                  setForm({ name: '', role: '', email: '', phone: '' })
                }}
              >
                Cancel
              </DSButton>
              <DSButton type="submit" disabled={!form.name.trim() || !form.role.trim()}>
                Add
              </DSButton>
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}
