// src/components/LoadingScreen.jsx
import { Loader } from '@mantine/core'

export default function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <Loader size="lg" />
      <p style={{ color: '#666', fontSize: '0.9rem' }}>در حال بارگذاری...</p>
    </div>
  )
}

