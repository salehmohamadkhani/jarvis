export function toISODate(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0]
}

export function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate()
}

export function isToday(dateStr) {
  return isSameDay(dateStr, new Date())
}

export function isOverdue(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const today = new Date()
  // strip time
  const td = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return dd < td
}


