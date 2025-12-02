import React from 'react'

/**
 * DSPill - Status/priority pill component
 * 
 * @param {'info' | 'success' | 'warning' | 'danger'} tone - Visual tone/variant
 * @param {React.ReactNode} children - Pill content
 */
export function DSPill({ tone = 'info', children }) {
  return <span className={`ds-pill ds-pill-${tone}`}>{children}</span>
}

