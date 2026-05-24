import { useMemo, useState } from 'react'
import { Badge, Button, Group, Modal, Paper, Stack, Text, TextInput, Textarea, Divider, Select, Checkbox } from '@mantine/core'
import { usePlanner } from '../state/PlannerContext.jsx'
import { DSPill, DSTagPill } from '../design-system'

export default function ProjectCard({ project }) {
  const { state, toggleTask, updateTask, archiveTask, unarchiveTask, addTask } = usePlanner()
  const projectIdStr = project?.id != null ? String(project.id) : ''
  const tasks = useMemo(
    () => state.tasks.filter((t) => String(t?.projectId) === projectIdStr && t.costAmount === null && !t.archived),
    [state.tasks, projectIdStr],
  )
  const archivedTasks = useMemo(
    () => state.tasks.filter((t) => String(t?.projectId) === projectIdStr && t.costAmount === null && t.archived),
    [state.tasks, projectIdStr],
  )
  const finances = useMemo(() => state.tasks.filter((t) => String(t?.projectId) === projectIdStr && t.costAmount !== null), [state.tasks, projectIdStr])
  const meetings = useMemo(
    () => (state.meetings || []).filter((m) => String(m?.projectId) === projectIdStr),
    [state.meetings, projectIdStr],
  )
  const [selectedTask, setSelectedTask] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)
  const [archiveModal, setArchiveModal] = useState(false)
  const [expandedArchivedId, setExpandedArchivedId] = useState(null)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    notes: '',
    priority: 3,
    assignedTo: '',
    dueAt: '',
  })
  const [addTaskForm, setAddTaskForm] = useState({ title: '', notes: '', dueAt: '' })

  // باز کردن مودال و تنظیم فرم
  const handleOpenTaskModal = (task) => {
    setSelectedTask(task)
    setModalOpen(true)
    setIsEditing(false)
    setEditForm({
      title: task.title || '',
      notes: task.notes || '',
      priority: task.priority || 3,
      assignedTo: task.assignedTo || '',
      dueAt: task.dueAt ? task.dueAt.split('T')[0] : '',
    })
  }

  // ذخیره تغییرات
  const handleSaveTask = () => {
    if (!selectedTask) return
    const updates = {
      title: editForm.title.trim(),
      notes: editForm.notes.trim() || null,
      priority: Number(editForm.priority) || 3,
      assignedTo: editForm.assignedTo.trim() || null,
      dueAt: editForm.dueAt ? new Date(editForm.dueAt).toISOString() : null,
    }
    updateTask(selectedTask.id, updates)
    setIsEditing(false)
    // بروزرسانی selectedTask
    setSelectedTask({ ...selectedTask, ...updates })
  }

  // بستن مودال
  const handleCloseModal = () => {
    setModalOpen(false)
    setIsEditing(false)
    setSelectedTask(null)
  }

  const handleOpenAddTask = () => {
    setAddTaskForm({ title: '', notes: '', dueAt: '' })
    setAddTaskModalOpen(true)
  }

  const handleSubmitAddTask = async () => {
    const title = (addTaskForm.title || '').trim()
    if (!title) return
    try {
      await addTask({
        projectId: project.id,
        title,
        notes: (addTaskForm.notes || '').trim() || null,
        dueAt: addTaskForm.dueAt ? new Date(addTaskForm.dueAt).toISOString() : null,
        priority: 3,
        status: 'todo',
      })
      setAddTaskModalOpen(false)
      setAddTaskForm({ title: '', notes: '', dueAt: '' })
    } catch (e) {
      console.error('Failed to add task:', e)
    }
  }

  const totals = finances.reduce(
    (acc, entry) => {
      if (!entry.costAmount) return acc
      if (entry.costAmount >= 0) acc.income += entry.costAmount
      else acc.expense += Math.abs(entry.costAmount)
      acc.balance += entry.costAmount
      return acc
    },
    { income: 0, expense: 0, balance: 0 },
  )

  const doneTasks = tasks.filter((t) => t.status === 'done').length

  return (
    <Paper shadow="xl" radius="xl" p="lg" className="project-card-shell">
      <Group justify="space-between" align="flex-start" className="project-card-top">
        <Stack gap={6}>
          <Text fw={700} size="lg">
            {project.name}
          </Text>
          <Group gap={8}>
            <Badge color="blue" radius="xl" variant="light">
              {project.status}
            </Badge>
            <Text size="sm" c="dimmed">
              Priority {project.priority}
            </Text>
            {project.dueDate && (
              <Text size="sm" c="dimmed">
                Due {new Date(project.dueDate).toLocaleDateString()}
              </Text>
            )}
          </Group>
        </Stack>
        <Group gap="lg" justify="flex-end" className="project-card-summary">
          <Stack gap={2} align="flex-end">
            <Text size="sm" c="dimmed">
              Tasks
            </Text>
            <Text fw={700}>
              {doneTasks}/{tasks.length}
            </Text>
          </Stack>
          <Stack gap={2} align="flex-end">
            <Text size="sm" c="dimmed">
              Balance
            </Text>
            <Text fw={700} c={totals.balance >= 0 ? 'teal' : 'red'}>
              {totals.balance >= 0 ? '+' : '-'}
              {Math.abs(totals.balance).toLocaleString()} IRR
            </Text>
          </Stack>
        </Group>
      </Group>

      <Stack gap="sm" mt="md">
        <Group justify="space-between">
          <Text fw={600}>Tasks</Text>
          <Text size="sm" c="dimmed">
            {tasks.length} active
          </Text>
        </Group>
        <Button
          size="xs"
          variant="outline"
          radius="xl"
          color="gray"
          onClick={() => setArchiveModal(true)}
          disabled={!archivedTasks.length}
        >
          View archived
        </Button>
        {tasks.length === 0 && (
          <Text size="sm" c="dimmed">
            No tasks yet.
          </Text>
        )}
        {tasks.map((task) => (
          <Paper
            key={task.id}
            radius="lg"
            withBorder
            className="project-task-tile"
            onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
          >
            <Group gap="md" align="flex-start">
              <input 
                type="checkbox" 
                checked={task.status === 'done'} 
                onChange={(e) => {
                  e.stopPropagation()
                  toggleTask(task.id)
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Stack gap={4} flex={1}>
                <Group justify="space-between" align="flex-start">
                  <Text fw={600}>{task.title}</Text>
                  <Group gap="xs">
                    {(() => {
                      const priority = task.priority || 'medium'
                      const priorityLabel = priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium'
                      const priorityTone = priority === 'high' ? 'danger' : priority === 'low' ? 'info' : 'warning'
                      return (
                        <DSPill tone={priorityTone}>{priorityLabel}</DSPill>
                      )
                    })()}
                    <Button
                      size="xs"
                      variant="light"
                      radius="xl"
                      color="gray"
                      onClick={(e) => {
                        e.stopPropagation()
                        archiveTask(task.id)
                      }}
                    >
                      Archive
                    </Button>
                  </Group>
                </Group>
                <Text size="sm" c="dimmed">
                  {task.status === 'done' ? 'Done' : task.status === 'doing' ? 'In progress' : 'Todo'} {task.dueAt ? `• ${new Date(task.dueAt).toLocaleDateString()}` : ''}
                </Text>
                {task.tags && task.tags.length > 0 && (
                  <div className="ds-tags">
                    {task.tags.map(tag => (
                      <DSTagPill key={tag}>{tag}</DSTagPill>
                    ))}
                  </div>
                )}
                
                {/* جزئیات تسک به صورت expandable */}
                {expandedTaskId === task.id && (
                  <Stack gap="sm" mt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-2)', paddingTop: '12px' }}>
                    <Group gap="md" wrap="wrap">
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed" fw={500}>Status</Text>
                        <Badge
                          color={task.status === 'done' ? 'green' : task.status === 'doing' ? 'blue' : 'gray'}
                          size="sm"
                          variant="light"
                        >
                          {task.status === 'done' ? 'Done' : task.status === 'doing' ? 'In progress' : 'Todo'}
                        </Badge>
                      </Stack>
                      {task.priority && (
                        <Stack gap={4}>
                          <Text size="xs" c="dimmed" fw={500}>Priority</Text>
                          <Badge color="orange" size="sm" variant="light">
                            {task.priority} / 5
                          </Badge>
                        </Stack>
                      )}
                      {task.assignedTo && (
                        <Stack gap={4}>
                          <Text size="xs" c="dimmed" fw={500}>Assignee</Text>
                          <Text size="sm" fw={500}>{task.assignedTo}</Text>
                        </Stack>
                      )}
                      {task.dueAt && (
                        <Stack gap={4}>
                          <Text size="xs" c="dimmed" fw={500}>Due date</Text>
                          <Text size="sm" fw={500} c={new Date(task.dueAt) < new Date() ? 'red' : 'blue'}>
                            {new Date(task.dueAt).toLocaleDateString('fa-IR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                        </Stack>
                      )}
                    </Group>
                    {task.notes && (
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed" fw={500}>Notes</Text>
                        <Text size="sm" className="ds-whitespace-pre">{task.notes}</Text>
                      </Stack>
                    )}
                    {task.createdAt && (
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed" fw={500}>Created</Text>
                        <Text size="xs" c="dimmed">
                          {new Date(task.createdAt).toLocaleDateString('fa-IR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Text>
                      </Stack>
                    )}
                    <Group gap="xs" mt="xs">
                      <Button
                        size="xs"
                        variant="light"
                        radius="xl"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTaskModal(task)
                        }}
                      >
                        Full edit
                      </Button>
                    </Group>
                  </Stack>
                )}
              </Stack>
            </Group>
          </Paper>
        ))}
      </Stack>

      <Stack gap="sm" mt="lg">
        <Group justify="space-between">
          <Text fw={600}>Meetings</Text>
          <Text size="sm" c="dimmed">
            {meetings.length} scheduled
          </Text>
        </Group>
        {meetings.length === 0 ? (
          <Text size="sm" c="dimmed">
            No meetings yet.
          </Text>
        ) : (
          <Stack gap="xs">
            {meetings.map((m) => (
              <Paper key={m.id} radius="md" p="sm" withBorder>
                <Group justify="space-between">
                  <Text fw={600} size="sm">{m.title}</Text>
                  <Text size="xs" c="dimmed">
                    {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    {m.durationMinutes ? ` (${m.durationMinutes} min)` : ''}
                  </Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>

      <Stack gap="sm" mt="lg">
        <Group justify="space-between">
          <Text fw={600}>Finances</Text>
          <Text size="sm" c="dimmed">
            {finances.length} entries
          </Text>
        </Group>
        {finances.length === 0 && (
          <Text size="sm" c="dimmed">
            No entries.
          </Text>
        )}
        {finances.map((entry) => (
          <Group key={entry.id} justify="space-between" className="project-finance-tile">
            <Stack gap={0}>
              <Text fw={600}>{entry.title}</Text>
              <Text size="sm" c="dimmed">
                {Math.abs(entry.costAmount ?? 0).toLocaleString()} IRR
              </Text>
            </Stack>
            <Text fw={700} c={entry.costAmount >= 0 ? 'teal' : 'red'}>
              {entry.costAmount >= 0 ? '+' : '-'}
              {Math.abs(entry.costAmount ?? 0).toLocaleString()} تومان
            </Text>
          </Group>
        ))}
        <Group justify="space-between">
          <Stack gap={0}>
            <Text size="sm" c="dimmed">
              Income
            </Text>
            <Text fw={600} c="teal">
              +{totals.income.toLocaleString()} IRR
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="sm" c="dimmed">
              Expense
            </Text>
            <Text fw={600} c="red">
              -{totals.expense.toLocaleString()} IRR
            </Text>
          </Stack>
        </Group>
      </Stack>

      <Group justify="space-between" mt="lg" className="project-card-actions">
        <Button variant="subtle" color="gray" radius="xl">
          Archive
        </Button>
        <Button variant="filled" color="blue" radius="xl" onClick={handleOpenAddTask}>
          Add task
        </Button>
      </Group>

      <Modal
        opened={modalOpen}
        onClose={handleCloseModal}
        title={
          isEditing ? (
            <TextInput
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Task title"
              size="md"
              fw={600}
              style={{ border: 'none', padding: 0 }}
              styles={{ input: { fontWeight: 600, fontSize: '1.1rem' } }}
            />
          ) : (
            selectedTask?.title || 'Task Details'
          )
        }
        radius="xl"
        size="md"
        padding="xl"
      >
        {selectedTask ? (
          <Stack gap="md">
            {/* Action Buttons - Status Checkbox and Edit */}
            <Group justify="space-between" align="center">
              <Paper
                p="sm"
                radius="md"
                withBorder
                style={{
                  backgroundColor: selectedTask.status === 'done' ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-gray-0)',
                  borderColor: selectedTask.status === 'done' ? 'var(--mantine-color-green-3)' : 'var(--mantine-color-gray-3)',
                }}
              >
                <Checkbox
                  checked={selectedTask.status === 'done'}
                  onChange={(e) => {
                    const newStatus = e.currentTarget.checked ? 'done' : 'todo'
                    toggleTask(selectedTask.id)
                    setSelectedTask({ ...selectedTask, status: newStatus })
                  }}
                  size="md"
                  label={
                    <Text fw={600} size="md" c={selectedTask.status === 'done' ? 'green' : 'dark'}>
                      {selectedTask.status === 'done' ? 'Done' : 'Not done'}
                    </Text>
                  }
                  color={selectedTask.status === 'done' ? 'green' : 'gray'}
                  styles={{
                    label: {
                      cursor: 'pointer',
                      paddingRight: '8px',
                    },
                    input: {
                      cursor: 'pointer',
                    },
                  }}
                />
              </Paper>
              <Group gap="xs">
                {isEditing ? (
                  <>
                    <Button size="sm" radius="xl" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" radius="xl" onClick={handleSaveTask}>
                      Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" radius="xl" variant="light" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </Group>
            </Group>

            <Divider />

            {/* Status and Priority Section */}
            <Paper p="md" radius="md" withBorder className="ds-bg-light">
              <Stack gap="sm">
                <Group gap="md" align="flex-start">
                  <Stack gap={4} flex={1}>
                    <Text size="sm" c="dimmed" fw={500}>
                      Status
                    </Text>
                    <Badge
                      color={
                        selectedTask.status === 'done'
                          ? 'green'
                          : selectedTask.status === 'doing'
                            ? 'blue'
                            : 'gray'
                      }
                      size="lg"
                      radius="xl"
                      variant="light"
                      className="ds-fit-content"
                    >
                      {selectedTask.status === 'done'
                        ? 'Done'
                        : selectedTask.status === 'doing'
                          ? 'In progress'
                          : 'Todo'}
                    </Badge>
                  </Stack>
                  <Stack gap={4} flex={1}>
                    <Text size="sm" c="dimmed" fw={500}>
                      Priority
                    </Text>
                    {isEditing ? (
                      <Select
                        value={String(editForm.priority)}
                        onChange={(value) => setEditForm({ ...editForm, priority: Number(value) || 3 })}
                        data={[
                          { value: '1', label: '1 - Very low' },
                          { value: '2', label: '2 - Low' },
                          { value: '3', label: '3 - Medium' },
                          { value: '4', label: '4 - High' },
                          { value: '5', label: '5 - Very high' },
                        ]}
                        size="sm"
                      />
                    ) : (
                      <Badge color="orange" size="lg" radius="xl" variant="light" style={{ width: 'fit-content' }}>
                        {selectedTask.priority} / 5
                      </Badge>
                    )}
                  </Stack>
                </Group>
              </Stack>
            </Paper>

            <Divider />

            {/* Assignee Section */}
            <Paper p="md" radius="md" withBorder className="ds-bg-light">
              <Stack gap="sm">
                <Text size="sm" c="dimmed" fw={500}>
                  Assignee
                </Text>
                {isEditing ? (
                  <TextInput
                    value={editForm.assignedTo}
                    onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                    placeholder="Assignee name"
                    size="sm"
                  />
                ) : selectedTask.assignedTo ? (
                  <Text fw={600} size="md">
                    {selectedTask.assignedTo}
                  </Text>
                ) : (
                  <Text size="sm" c="dimmed" fs="italic">
                    No assignee
                  </Text>
                )}
              </Stack>
            </Paper>

            <Divider />

            {/* Dates Section */}
            <Paper p="md" radius="md" withBorder className="ds-bg-light">
              <Stack gap="sm">
                <Group gap="md" align="flex-start">
                  {selectedTask.createdAt && (
                    <Stack gap={4} flex={1}>
                      <Text size="sm" c="dimmed" fw={500}>
                        Created
                      </Text>
                      <Text size="sm" fw={500}>
                        {new Date(selectedTask.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Stack>
                  )}
                  <Stack gap={4} flex={1}>
                    <Text size="sm" c="dimmed" fw={500}>
                      Due date
                    </Text>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.dueAt}
                        onChange={(e) => setEditForm({ ...editForm, dueAt: e.target.value })}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid #dee2e6',
                          fontSize: '14px',
                        }}
                      />
                    ) : selectedTask.dueAt ? (
                      <Text size="sm" fw={600} c={new Date(selectedTask.dueAt) < new Date() ? 'red' : 'blue'}>
                        {new Date(selectedTask.dueAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed" fs="italic">
                        No date
                      </Text>
                    )}
                  </Stack>
                </Group>
              </Stack>
            </Paper>

            <Divider />

            {/* Notes Section */}
            <Paper p="md" radius="md" withBorder className="ds-bg-light">
              <Stack gap="sm">
                <Text size="sm" c="dimmed" fw={500}>
                  Notes
                </Text>
                {isEditing ? (
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Task notes"
                    minRows={3}
                    size="sm"
                  />
                ) : selectedTask.notes ? (
                  <Text className="ds-whitespace-pre" size="sm">
                    {selectedTask.notes}
                  </Text>
                ) : (
                  <Text size="sm" c="dimmed" fs="italic">
                    No notes
                  </Text>
                )}
              </Stack>
            </Paper>

            <Divider />

            {/* Project Info Section */}
            <Paper p="md" radius="md" withBorder className="ds-bg-light">
              <Stack gap="sm">
                <Group gap="md" align="flex-start">
                  {project && (
                    <Stack gap={4} flex={1}>
                      <Text size="sm" c="dimmed" fw={500}>
                        Project
                      </Text>
                      <Text fw={600} size="md">
                        {project.name}
                      </Text>
                    </Stack>
                  )}
                  {selectedTask.updatedAt && (
                    <Stack gap={4} flex={1}>
                      <Text size="sm" c="dimmed" fw={500}>
                        Last updated
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(selectedTask.updatedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Stack>
                  )}
                </Group>
              </Stack>
            </Paper>
          </Stack>
        ) : null}
      </Modal>

      <Modal opened={archiveModal} onClose={() => setArchiveModal(false)} title="Archived tasks" radius="lg">
        {archivedTasks.length === 0 ? (
          <Text size="sm" c="dimmed">
            No archived tasks.
          </Text>
        ) : (
          <Stack gap="sm">
            {archivedTasks.map((task) => (
              <Paper
                key={task.id}
                withBorder
                radius="md"
                p="sm"
                className="archived-task-tile"
                onClick={() => setExpandedArchivedId((prev) => (prev === task.id ? null : task.id))}
              >
                <Group justify="space-between" align="flex-start">
                  <Stack gap={2}>
                    <Text fw={600}>{task.title}</Text>
                    <Text size="sm" c="dimmed">
                      Archived {task.archivedAt ? new Date(task.archivedAt).toLocaleDateString() : ''}
                    </Text>
                  </Stack>
                  <Button
                    size="xs"
                    radius="xl"
                    onClick={(e) => {
                      e.stopPropagation()
                      unarchiveTask(task.id)
                    }}
                  >
                    Restore
                  </Button>
                </Group>
                {expandedArchivedId === task.id && (
                  <Stack gap={4} mt="sm" className="archived-detail">
                    <Text size="sm" c="dimmed">
                      Status
                    </Text>
                    <Text fw={600}>{task.status}</Text>
                    <Text size="sm" c="dimmed">
                      Priority
                    </Text>
                    <Text>{task.priority}</Text>
                    {task.dueAt && (
                      <>
                        <Text size="sm" c="dimmed">
                          Due date
                        </Text>
                        <Text>{new Date(task.dueAt).toLocaleString()}</Text>
                      </>
                    )}
                    {task.notes && (
                      <>
                        <Text size="sm" c="dimmed">
                          Notes
                        </Text>
                        <Text>{task.notes}</Text>
                      </>
                    )}
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>
        )}
      </Modal>

      <Modal opened={addTaskModalOpen} onClose={() => setAddTaskModalOpen(false)} title="Add task" radius="xl" size="md">
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder="Task title"
            value={addTaskForm.title}
            onChange={(e) => setAddTaskForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <TextInput
            label="Due date"
            type="date"
            value={addTaskForm.dueAt}
            onChange={(e) => setAddTaskForm((f) => ({ ...f, dueAt: e.target.value }))}
          />
          <Textarea
            label="Notes"
            placeholder="Optional notes"
            value={addTaskForm.notes}
            onChange={(e) => setAddTaskForm((f) => ({ ...f, notes: e.target.value }))}
            minRows={2}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setAddTaskModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAddTask} disabled={!(addTaskForm.title || '').trim()}>
              Add task
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  )
}
