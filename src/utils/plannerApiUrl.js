export function plannerApiUrl(suffix) {
  const path = String(suffix || '')
    .replace(/^\//, '')
    .replace(/^api\//, '')
  const base = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')
  if (!base) return `/api/${path}`
  if (base.toLowerCase().endsWith('/api')) return `${base}/${path}`
  return `${base}/api/${path}`
}
