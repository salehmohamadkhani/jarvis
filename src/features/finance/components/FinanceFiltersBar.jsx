const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
]

export default function FinanceFiltersBar({ period, projectId, projects, onChange }) {
  return (
    <div className="finance-filters-ds">
      <div className="finance-filters-ds__col finance-filters-ds__col--period">
        <span className="finance-filters-ds__kicker" id="finance-period-label">
          Period
        </span>
        <div
          className="finance-filters-ds__segment-wrap"
          role="tablist"
          aria-labelledby="finance-period-label"
        >
          {PERIODS.map(({ value, label }) => {
            const active = period === value
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                className={`finance-filters-ds__segment${active ? ' finance-filters-ds__segment--active' : ''}`}
                onClick={() => onChange({ period: value, projectId })}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="finance-filters-ds__col finance-filters-ds__col--project">
        <label className="finance-filters-ds__kicker" htmlFor="finance-project-select">
          Project
        </label>
        <div className="finance-filters-ds__select-shell">
          <select
            id="finance-project-select"
            className="finance-filters-ds__select"
            value={projectId ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onChange({ period, projectId: v === '' ? null : v })
            }}
          >
            <option value="">All projects</option>
            {(projects || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
