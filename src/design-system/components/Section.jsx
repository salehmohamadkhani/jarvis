import React from 'react'

/**
 * DSSection - Section container for grouping related content
 * Replaces the .today-card pattern
 * 
 * @param {string} title - Section title
 * @param {string} description - Optional section description
 * @param {React.ReactNode} headerRight - Optional content for right side of header
 * @param {React.ReactNode} children - Section content
 */
export function DSSection({ title, description, headerRight, children }) {
  return (
    <section className="ds-section">
      {(title || description || headerRight) && (
        <header className="ds-section-header">
          <div>
            {title && <h2 className="ds-section-title">{title}</h2>}
            {description && (
              <p className="ds-section-description">{description}</p>
            )}
          </div>
          {headerRight && <div className="ds-section-right">{headerRight}</div>}
        </header>
      )}
      <div className="ds-section-body">{children}</div>
    </section>
  )
}

