import { useMemo } from 'react'
import { usePlanner } from '../../state/PlannerContext.jsx'
import { isToday, isOverdue } from '../../utils/date.js'
import { DSSection, DSPill, DSTagPill } from '../../design-system'

export default function TodayTasks() {
  const { state } = usePlanner()

  const { todayTasks, overdueTasks } = useMemo(() => {
    const all = state.tasks.map(t => {
      const project = state.projects.find(p => p.id === t.projectId)
      return { ...t, projectId: t.projectId, projectName: project?.name || '—' }
    })
    const open = all.filter(t => t.status !== 'done' && !t.archived)
    const today = open.filter(t => t.dueAt && isToday(t.dueAt)).slice(0, 5)
    const overdue = open.filter(t => t.dueAt && isOverdue(t.dueAt)).slice(0, 5)
    return { todayTasks: today, overdueTasks: overdue }
  }, [state.projects, state.tasks])

  const getPriorityTone = (priority) => {
    if (priority === 'high') return 'danger'
    if (priority === 'low') return 'info'
    return 'warning'
  }

  return (
    <DSSection title="Tasks Today">
      {todayTasks.length === 0 ? (
        <div className="ds-empty">تسک مشخصی برای امروز نداری.</div>
      ) : (
        <ul className="ds-list">
          {todayTasks.map(t => {
            const priority = t.priority || 'medium'
            const priorityLabel = priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium'
            return (
              <li key={t.id} className="ds-list-item">
                <div className="ds-list-item-title">{t.title}</div>
                <div className="ds-list-item-meta">
                  <DSPill tone={getPriorityTone(priority)}>{priorityLabel}</DSPill>
                  <span className="ds-badge ds-badge-project">{t.projectName}</span>
                  {t.assignedTo && <span className="ds-badge">{t.assignedTo}</span>}
                  {t.dueAt && <span className="ds-badge">{new Date(t.dueAt).toLocaleDateString()}</span>}
                </div>
                {t.tags && t.tags.length > 0 && (
                  <div className="ds-tags">
                    {t.tags.map(tag => (
                      <DSTagPill key={tag}>{tag}</DSTagPill>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {overdueTasks.length > 0 && (
        <>
          <div className="ds-subtitle">Overdue</div>
          <ul className="ds-list">
            {overdueTasks.map(t => {
              const priority = t.priority || 'medium'
              const priorityLabel = priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium'
              return (
                <li key={t.id} className="ds-list-item ds-list-item-danger">
                  <div className="ds-list-item-title">{t.title}</div>
                  <div className="ds-list-item-meta">
                    <DSPill tone={getPriorityTone(priority)}>{priorityLabel}</DSPill>
                    <span className="ds-badge ds-badge-project">{t.projectName}</span>
                    <DSPill tone="danger">Late</DSPill>
                    {t.dueAt && <span className="ds-badge">{new Date(t.dueAt).toLocaleDateString()}</span>}
                  </div>
                  {t.tags && t.tags.length > 0 && (
                    <div className="ds-tags">
                      {t.tags.map(tag => (
                        <DSTagPill key={tag}>{tag}</DSTagPill>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </DSSection>
  )
}


