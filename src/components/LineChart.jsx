import { useMemo } from 'react'

export default function LineChart({ values, positiveColor = '#0ea5e9', negativeColor = '#f43f5e' }) {
  const points = useMemo(() => {
    if (!values || values.length === 0) return []
    const min = Math.min(...values, 0)
    const max = Math.max(...values, 0)
    const range = max - min || 1
    return values.map((value, index) => ({
      x: (index / Math.max(values.length - 1, 1)) * 100,
      y: 100 - ((value - min) / range) * 100,
    }))
  }, [values])

  if (!points.length) return null

  const path = points.reduce((acc, point, index) => {
    const command = index === 0 ? 'M' : 'L'
    return `${acc} ${command} ${point.x},${point.y}`
  }, '')

  const fillPath = `${path} L 100,100 L 0,100 Z`

  return (
    <div className="line-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={fillPath} fill="rgba(14, 165, 233, 0.15)" />
        <path d={path} fill="none" stroke={positiveColor} strokeWidth="2" />
      </svg>
    </div>
  )
}

