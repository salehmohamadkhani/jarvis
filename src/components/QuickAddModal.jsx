import { useMemo, useState } from 'react'
import { usePlanner } from '../state/PlannerContext.jsx'
import { useFinance } from '../features/finance/FinanceContext.jsx'

const tabs = [
  { id: 'task', label: 'Task' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'finance', label: 'Finance' },
]

const teammates = [
  { id: 'c1', name: 'Ali Zarei' },
  { id: 'c2', name: 'Sara Nouri' },
  { id: 'c3', name: 'Hamed Kian' },
]

export default function QuickAddModal({ onClose }) {
  const { state, addTask, addMeeting } = usePlanner()
  const { addTransaction } = useFinance()
  const [activeTab, setActiveTab] = useState('task')
  const [form, setForm] = useState({
    title: '',
    projectId: state.projects[0]?.id ?? '',
    notes: '',
    amount: '',
    dueAt: '',
    type: 'expense',
    kind: 'project', // 'project' or 'personal'
    category: 'Other',
    duration: 30,
    assignee: '',
    priority: 'medium',
    tags: '',
  })

  const projects = useMemo(() => state.projects, [state.projects])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const newForm = { ...prev, [name]: value }
      // Reset projectId when switching to personal
      if (name === 'kind' && value === 'personal') {
        newForm.projectId = ''
      } else if (name === 'kind' && value === 'project' && !newForm.projectId) {
        newForm.projectId = state.projects[0]?.id ?? ''
      }
      return newForm
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (activeTab === 'task') {
      const tags = form.tags.trim().length > 0
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
      addTask({
        projectId: form.projectId || null,
        title: form.title.trim(),
        notes: form.notes.trim(),
        priority: form.priority || 'medium',
        tags,
        dueAt: form.dueAt || null,
        assignedTo: form.assignee || null,
      })
    } else if (activeTab === 'meeting') {
      const tags = form.tags.trim().length > 0
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
      addMeeting({
        projectId: form.projectId || null,
        title: form.title.trim(),
        scheduledAt: form.dueAt || new Date().toISOString(),
        durationMinutes: Number(form.duration) || 30,
        participants: [],
        assignedTo: form.assignee || null,
        priority: form.priority || 'medium',
        tags,
      })
    } else {
      const amount = Number(form.amount || 0)
      if (!amount) return

      const base = {
        projectId: form.kind === 'project' ? (form.projectId || null) : null,
        type: form.type, // 'income' or 'expense'
        kind: form.kind, // 'project' or 'personal'
        money: { amount: Math.abs(amount) },
        date: form.dueAt || new Date().toISOString(),
        category: form.category || 'Other',
        description: form.title.trim(),
        notes: form.notes.trim() || undefined,
      }

      addTransaction(base)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal>
      <div className="quick-add-sheet">
        <header className="quick-add-header">
          <h2>Quick Add</h2>
          <button onClick={onClose} aria-label="Close" className="quick-close">
            ×
          </button>
        </header>
        <div className="tabs">
          {tabs.map((tab) => (
            <button key={tab.id} className={tab.id === activeTab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        <form className="quick-add-form" onSubmit={handleSubmit}>
          <label>
            <span>Title</span>
            <input name="title" value={form.title} onChange={handleChange} required />
          </label>
          {activeTab !== 'finance' && (
            <label>
              <span>Project</span>
              <select name="projectId" value={form.projectId} onChange={handleChange}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>Assignee</span>
            <select name="assignee" value={form.assignee} onChange={handleChange}>
              <option value="">No assignee</option>
              {teammates.map((mate) => (
                <option key={mate.id} value={mate.name}>
                  {mate.name}
                </option>
              ))}
            </select>
          </label>
          {activeTab === 'task' && (
            <>
              <label>
                <span>Due date</span>
                <input type="date" name="dueAt" value={form.dueAt} onChange={handleChange} />
              </label>
              <div className="field-row">
                <label className="field-label">Priority</label>
                <div className="priority-buttons">
                  {['low', 'medium', 'high'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={level === form.priority ? 'priority-chip active' : 'priority-chip'}
                      onClick={() => setForm(f => ({ ...f, priority: level }))}
                    >
                      {level === 'low' ? 'Low' : level === 'high' ? 'High' : 'Medium'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field-row">
                <label className="field-label">Tags</label>
                <input
                  type="text"
                  placeholder="e.g. ui, bug, important"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                />
              </div>
            </>
          )}
          {activeTab === 'meeting' && (
            <>
              <label>
                <span>Scheduled at</span>
                <input type="datetime-local" name="dueAt" value={form.dueAt} onChange={handleChange} />
              </label>
              <label>
                <span>Duration (min)</span>
                <input type="number" name="duration" value={form.duration} onChange={handleChange} />
              </label>
              <div className="field-row">
                <label className="field-label">Priority</label>
                <div className="priority-buttons">
                  {['low', 'medium', 'high'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={level === form.priority ? 'priority-chip active' : 'priority-chip'}
                      onClick={() => setForm(f => ({ ...f, priority: level }))}
                    >
                      {level === 'low' ? 'Low' : level === 'high' ? 'High' : 'Medium'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field-row">
                <label className="field-label">Tags</label>
                <input
                  type="text"
                  placeholder="e.g. sync, planning, urgent"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                />
              </div>
            </>
          )}
          {activeTab === 'finance' && (
            <>
              <div className="finance-grid">
                <label>
                  <span>Amount</span>
                  <input type="number" name="amount" value={form.amount} onChange={handleChange} required />
                </label>
                <label>
                  <span>Type</span>
                  <select name="type" value={form.type} onChange={handleChange}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
              </div>
              <label>
                <span>Kind</span>
                <select name="kind" value={form.kind} onChange={handleChange}>
                  <option value="project">Project</option>
                  <option value="personal">Personal</option>
                </select>
              </label>
              {form.kind === 'personal' && (
                <label>
                  <span>Category</span>
                  <select name="category" value={form.category} onChange={handleChange}>
                    <option value="Salary">Salary</option>
                    <option value="Software">Software</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Travel">Travel</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              )}
              {form.kind === 'project' && (
                <label>
                  <span>Project</span>
                  <select name="projectId" value={form.projectId} onChange={handleChange}>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          <label>
            <span>Notes</span>
            <textarea name="notes" rows={2} value={form.notes} onChange={handleChange} />
          </label>
          <button type="submit" className="primary-btn">
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
