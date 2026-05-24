export default function DonutChart({
  segments,
  size = 200,
  strokeWidth = 14,
  centerTitle = '',
  centerSubtitle = '',
}) {
  const total = segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
  const vb = 100
  const cx = vb / 2
  const cy = vb / 2
  const r = (vb / 2) * 0.72 - strokeWidth / 2
  const circ = 2 * Math.PI * r

  if (total <= 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} className="finance-donut-svg" aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      </svg>
    )
  }

  let cumulative = 0
  const arcs = segments
    .filter((s) => (Number(s.value) || 0) > 0)
    .map((s, i) => {
      const len = (s.value / total) * circ
      const dash = `${len} ${circ}`
      const offset = -cumulative
      cumulative += len
      return (
        <circle
          key={`${s.label}-${i}`}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      )
    })

  return (
    <div className="finance-donut-root" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} className="finance-donut-svg" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        {arcs}
      </svg>
      {(centerTitle || centerSubtitle) && (
        <div className="finance-donut-center">
          {centerTitle ? <span className="finance-donut-center-title">{centerTitle}</span> : null}
          {centerSubtitle ? <span className="finance-donut-center-sub">{centerSubtitle}</span> : null}
        </div>
      )}
    </div>
  )
}
