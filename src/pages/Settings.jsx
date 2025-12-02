import { DSPage, DSSection, DSCard } from '../design-system'

export default function Settings() {
  return (
    <DSPage title="تنظیمات">
      <DSSection title="تنظیمات">
        <DSCard>
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>
            فضای آینده برای تنظیمات فضای کاری، یکپارچه‌سازی‌ها و گزینه‌های حساب کاربری.
          </p>
        </DSCard>
      </DSSection>
    </DSPage>
  )
}
