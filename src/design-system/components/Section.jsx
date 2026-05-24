import React from 'react'

export function DSSection({ title, description, headerRight, children, className = '' }) {
  const sectionClass = ['ds-section', className].filter(Boolean).join(' ')
  return (
    <section className={sectionClass}>
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

