// src/components/ErrorScreen.jsx
import { Button, Alert } from '@mantine/core'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'

export default function ErrorScreen({ error, onRetry }) {
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
          امکان اتصال به سرور وجود ندارد. لطفاً چند لحظه بعد دوباره تلاش کنید.
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
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          <p>اگر مشکل ادامه داشت، تنظیمات سرور و اتصال به دیتابیس را بررسی کنید.</p>
        </div>
      </div>
    </div>
  )
}

