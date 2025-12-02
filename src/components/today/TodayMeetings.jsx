import { useMemo } from 'react'
import { usePlanner } from '../../state/PlannerContext.jsx'
import { isSameDay } from '../../utils/date.js'
import { DSSection } from '../../design-system'

export default function TodayMeetings() {
  const { state } = usePlanner()

  const meetings = useMemo(() => {
    const all = state.meetings.map(m => {
      const project = state.projects.find(p => p.id === m.projectId)
      return { ...m, projectName: project?.name || '—' }
    })
    const today = all.filter(m => m.scheduledAt && isSameDay(m.scheduledAt, new Date()))
    // sort by time
    today.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    return today.slice(0, 6)
  }, [state.projects, state.meetings])

  return (
    <DSSection title="Meetings Today">
      {meetings.length === 0 ? (
        <div className="ds-empty">امروز جلسه‌ای ثبت نشده.</div>
      ) : (
        <ul className="ds-list">
          {meetings.map(m => {
            const dt = new Date(m.scheduledAt)
            const hh = String(dt.getHours()).padStart(2, '0')
            const mm = String(dt.getMinutes()).padStart(2, '0')
            return (
              <li key={m.id} className="ds-list-item">
                <div className="ds-list-item-title">{m.title || 'Meeting'}</div>
                <div className="ds-list-item-meta">
                  <span className="ds-badge">{`${hh}:${mm}`}</span>
                  <span className="ds-badge ds-badge-project">{m.projectName}</span>
                  {m.durationMinutes && <span className="ds-badge">{m.durationMinutes}m</span>}
                  {m.participants && m.participants.length > 0 && <span className="ds-badge">{m.participants[0]}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </DSSection>
  )
}


