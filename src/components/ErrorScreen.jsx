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
          title="خطا در اتصال به سرور"
          color="red"
          mb="md"
        >
          <div style={{ marginBottom: '1rem' }}>
            <strong>Database connection failed</strong>
          </div>
          <List size="sm" spacing="xs" style={{ marginTop: '0.5rem' }}>
            <List.Item>اتصال اینترنت خود را بررسی کنید.</List.Item>
            <List.Item>اگر مشکل ادامه داشت، چند دقیقه بعد دوباره امتحان کنید.</List.Item>
            <List.Item>در صورت تداوم خطا، با پشتیبان پروژه تماس بگیرید.</List.Item>
          </List>
        </Alert>
        {onRetry && (
          <Button
            leftSection={<IconRefresh size="1rem" />}
            onClick={onRetry}
            fullWidth
          >
            تلاش مجدد
          </Button>
        )}
      </div>
    </div>
  )
}

