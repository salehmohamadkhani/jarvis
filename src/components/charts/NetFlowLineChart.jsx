function abbreviateIrr(n) {
  const v = Math.abs(n)
  if (v >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return String(Math.round(n))
}

export default function NetFlowLineChart({ values, yFormat = abbreviateIrr }) {
  const w = 360
  const h = 140
  const padL = 44
  const padR = 8
  const padT = 10
  const padB = 22
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  if (!values?.length) return null

  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = max - min || 1

  const xAt = (i) => padL + (i / Math.max(values.length - 1, 1)) * innerW
  const yAt = (v) => padT + innerH - ((v - min) / span) * innerH

  const points = values.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ')

  const ticks = [min, max]
  if (min < 0 && max > 0) ticks.push(0)
  const gridYs = [...new Set(ticks)].sort((a, b) => a - b)
  const baseY = padT + innerH
  const firstX = xAt(0)
  const lastX = xAt(values.length - 1)
  const fillPoints = `${firstX},${baseY} ${points} ${lastX},${baseY}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="finance-netflow-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Net cash flow trend">
      {gridYs.map((gv) => {
        const y = yAt(gv)
        return (
          <g key={gv}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
            <text x={4} y={y + 4} fill="var(--color-text-secondary, #8b8fa3)" fontSize="9">
              {yFormat(gv)}
            </text>
          </g>
        )
      })}
      <polygon fill="rgba(99, 102, 241, 0.12)" points={fillPoints} />
      <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={points} strokeLinejoin="round" />
    </svg>
  )
}
