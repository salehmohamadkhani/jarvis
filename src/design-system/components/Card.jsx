import React from 'react'

export function DSCard({ children, clickable, onClick, className = '' }) {
  const baseClass = clickable ? 'ds-card ds-card-clickable' : 'ds-card'
  const finalClass = className ? `${baseClass} ${className}` : baseClass
  
  return (
    <div className={finalClass} onClick={clickable ? onClick : undefined} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined}>
      {children}
    </div>
  )
}

