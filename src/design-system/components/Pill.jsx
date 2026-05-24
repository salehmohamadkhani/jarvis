import React from 'react'

export function DSPill({ tone = 'info', children }) {
  return <span className={`ds-pill ds-pill-${tone}`}>{children}</span>
}

