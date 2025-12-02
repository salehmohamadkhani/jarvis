import React from 'react'

/**
 * DSCard - Generic card component for containers
 * 
 * @param {React.ReactNode} children - Card content
 * @param {boolean} clickable - Whether the card is clickable
 * @param {Function} onClick - Click handler (required if clickable)
 * @param {string} className - Additional CSS classes
 */
export function DSCard({ children, clickable, onClick, className = '' }) {
  const baseClass = clickable ? 'ds-card ds-card-clickable' : 'ds-card'
  const finalClass = className ? `${baseClass} ${className}` : baseClass
  
  return (
    <div className={finalClass} onClick={clickable ? onClick : undefined} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined}>
      {children}
    </div>
  )
}

