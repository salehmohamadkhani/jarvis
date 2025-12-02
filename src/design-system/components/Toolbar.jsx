import React from 'react'

/**
 * DSToolbar - Toolbar component with title and right area
 * Useful for filters, period selectors, etc.
 * 
 * @param {string} title - Toolbar title
 * @param {React.ReactNode} right - Content for right side (filters, buttons, etc.)
 */
export function DSToolbar({ title, right }) {
  return (
    <div className="ds-toolbar">
      <h2 className="ds-toolbar-title">{title}</h2>
      {right && <div className="ds-toolbar-right">{right}</div>}
    </div>
  )
}

