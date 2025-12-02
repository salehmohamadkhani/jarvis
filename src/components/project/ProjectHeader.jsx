import { DSCard, DSPill } from '../../design-system'

export default function ProjectHeader({ project, balance }) {
  if (!project) return null
  const { name, priority, status, clientName, clientPhone, referredByName, referredByPhone } = project

  return (
    <DSCard className="ds-project-header">
      <div className="ds-project-header-left">
        <h2 className="ds-project-header-title">{name}</h2>
        <div className="ds-project-header-meta">
          <DSPill tone={status === 'archived' ? 'warning' : 'success'}>
            {status === 'archived' ? 'Archived' : 'Active'}
          </DSPill>
          <span className="ds-badge">Priority {priority ?? 3}</span>
          <DSPill tone={balance >= 0 ? 'success' : 'warning'}>
            Balance {balance.toLocaleString()} تومان
          </DSPill>
        </div>
      </div>

      <div className="ds-project-header-right">
        {(clientName || clientPhone) && (
          <div className="ds-project-header-line">
            <span className="ds-project-header-label">Client:</span>
            <span className="ds-project-header-value">{clientName || '-'}</span>
            {clientPhone && <span className="ds-project-header-value">{clientPhone}</span>}
          </div>
        )}
        {(referredByName || referredByPhone) && (
          <div className="ds-project-header-line">
            <span className="ds-project-header-label">Referred by:</span>
            <span className="ds-project-header-value">{referredByName || '-'}</span>
            {referredByPhone && <span className="ds-project-header-value">{referredByPhone}</span>}
          </div>
        )}
      </div>
    </DSCard>
  )
}


