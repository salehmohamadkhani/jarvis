import React from 'react'

/**
 * DSButton - Standardized button component
 * 
 * @param {'primary' | 'secondary'} variant - Button variant
 * @param {React.ReactNode} children - Button content
 * @param {object} props - Additional button props (onClick, disabled, etc.)
 */
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

