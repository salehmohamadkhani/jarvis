export default function BarChart({ values, positiveColor = '#16a34a', negativeColor = '#ef4444' }) {
  const absMax = values.reduce((acc, v) => Math.max(acc, Math.abs(v)), 0) || 1
  return (
    <div className="bar-chart">
      {values.map((value, idx) => {
        const height = Math.abs(value) / absMax
        return (
          <div key={idx} className="bar">
            <span
              style={{
                height: `${height * 100}%`,
                backgroundColor: value >= 0 ? positiveColor : negativeColor,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
