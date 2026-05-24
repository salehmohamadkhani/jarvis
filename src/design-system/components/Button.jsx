import React from 'react'

export function DSButton({ variant = 'primary', children, ...props }) {
  const cls = variant === 'secondary'
    ? 'ds-btn ds-btn-secondary'
    : 'ds-btn ds-btn-primary'
  
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  )
}

