export default function BucketedCashChart({ buckets }) {
  const w = 360
  const h = 160
  const padL = 36
  const padR = 8
  const padT = 12
  const padB = 28
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  if (!buckets?.length) return null

  const maxVal = Math.max(
    1,
    ...buckets.flatMap((b) => [b.income || 0, b.expense || 0]),
  )

  const gap = 4
  const groupW = innerW / buckets.length - gap
  const barW = Math.max(4, (groupW - 2) / 2)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="finance-bucket-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Income and expense by period">
      <line x1={padL} x2={w - padR} y1={padT + innerH} y2={padT + innerH} stroke="rgba(255,255,255,0.12)" />
      {buckets.map((b, i) => {
        const gx = padL + i * (innerW / buckets.length) + gap / 2
        const incomeH = ((b.income || 0) / maxVal) * innerH
        const expenseH = ((b.expense || 0) / maxVal) * innerH
        const baseY = padT + innerH
        return (
          <g key={b.key}>
            <rect
              x={gx}
              y={baseY - incomeH}
              width={barW}
              height={incomeH}
              rx={2}
              fill="#10b981"
              opacity={0.9}
            />
            <rect
              x={gx + barW + 2}
              y={baseY - expenseH}
              width={barW}
              height={expenseH}
              rx={2}
              fill="#ef4444"
              opacity={0.9}
            />
            <text
              x={gx + barW}
              y={h - 6}
              textAnchor="middle"
              fill="var(--color-text-secondary, #8b8fa3)"
              fontSize="8"
            >
              {b.label}
            </text>
          </g>
        )
      })}
      <text x={padL} y={10} fill="#10b981" fontSize="9">
        Income
      </text>
      <text x={padL + 44} y={10} fill="#ef4444" fontSize="9">
        Expense
      </text>
    </svg>
  )
}
