import React from 'react'

export function DSToolbar({ title, right }) {
  return (
    <div className="ds-toolbar">
      <h2 className="ds-toolbar-title">{title}</h2>
      {right && <div className="ds-toolbar-right">{right}</div>}
    </div>
  )
}

