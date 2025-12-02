import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from 'date-fns'

export default function CalendarCard({ anchor, tasks, onAnchorChange, onSelectDay }) {
  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const pad = monthStart.getDay()
  const cells = Array.from({ length: pad }, (_, i) => ({ key: `p-${i}`, label: '' }))
  const projectColor = (projectId) => {
    if (!projectId) return '#999'
    const hue = (projectId.length * 57) % 360
    return `hsl(${hue} 70% 45%)`
  }

  days.forEach((day) => {
    const dayTasks = tasks.filter((t) => t.dueAt && isSameDay(new Date(t.dueAt), day))
    cells.push({
      key: day.toISOString(),
      label: day.getDate(),
      markers: [...new Set(dayTasks.map((t) => projectColor(t.projectId)))].slice(0, 3),
      date: day,
    })
  })

  const header = format(anchor, 'yyyy/MM')

  return (
    <div className="card calendar-card">
      <div className="calendar-header">
        <button onClick={() => onAnchorChange(subMonths(anchor, 1))} aria-label="Previous month">
          ‹
        </button>
        <span>{header}</span>
        <button onClick={() => onAnchorChange(addMonths(anchor, 1))} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {cells.map((cell) => (
          <button key={cell.key} className={cell.date ? 'calendar-cell active' : 'calendar-cell'} onClick={() => cell.date && onSelectDay(cell.date)} disabled={!cell.date}>
            <span>{cell.label}</span>
            {cell.markers && (
              <div className="markers">
                {cell.markers.map((color) => (
                  <span key={color} style={{ backgroundColor: color }} />
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
