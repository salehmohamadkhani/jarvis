import React from 'react'

/**
 * DSPage - Page layout wrapper
 * 
 * @param {string} title - Page title
 * @param {React.ReactNode} actions - Action buttons/elements to show in header
 * @param {React.ReactNode} children - Page content
 */
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

