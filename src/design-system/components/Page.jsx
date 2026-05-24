import React from 'react'

export function DSPage({ title, actions, children }) {
  return (
    <div className="ds-page">
      {(title || actions) && (
        <div className="ds-page-header">
          {title && <h1 className="ds-page-title">{title}</h1>}
          {actions && <div className="ds-page-actions">{actions}</div>}
        </div>
      )}
      <div className="ds-page-content">{children}</div>
    </div>
  )
}

