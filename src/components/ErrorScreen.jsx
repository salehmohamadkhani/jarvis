// src/components/ErrorScreen.jsx
import { Button, Alert, List } from '@mantine/core'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'

export default function ErrorScreen({ error, onRetry }) {
  // Extract error message safely (don't expose sensitive info)
  const errorMessage = error && typeof error === 'string' 
    ? error 
    : error?.message || 'Database connection failed'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Server connection error"
          color="red"
          mb="md"
        >
          <div style={{ marginBottom: '1rem' }}>
            {errorMessage}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            If the problem persists, check server and database connection settings.
          </div>
        </Alert>
        {onRetry && (
          <Button
            leftSection={<IconRefresh size="1rem" />}
            onClick={onRetry}
            fullWidth
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}

