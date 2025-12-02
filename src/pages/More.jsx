import { useNavigate } from 'react-router-dom'
import { DSPage, DSSection, DSCard, DSButton } from '../design-system'

export default function More() {
  const navigate = useNavigate()

  const items = [
    {
      key: 'dashboard',
      title: 'داشبورد',
      description: 'نمای کلی پروژه‌ها، تسک‌ها و امور مالی',
      path: '/dashboard',
    },
    {
      key: 'archived-projects',
      title: 'پروژه‌های بایگانی شده',
      description: 'مشاهده و مدیریت پروژه‌های بایگانی شده',
      path: '/projects/archived',
    },
    {
      key: 'settings',
      title: 'تنظیمات',
      description: 'تنظیمات فضای کاری، یکپارچه‌سازی‌ها و گزینه‌های حساب کاربری',
      path: '/settings',
    },
  ]

  return (
    <DSPage title="بیشتر">
      <DSSection title="ابزارها و صفحات بیشتر">
        <div className="more-grid">
          {items.map((item) => (
            <DSCard
              key={item.key}
              clickable
              onClick={() => navigate(item.path)}
            >
              <h3 className="more-item-title">{item.title}</h3>
              <p className="more-item-description">{item.description}</p>
              <DSButton
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(item.path)
                }}
              >
                باز کردن
              </DSButton>
            </DSCard>
          ))}
        </div>
      </DSSection>
    </DSPage>
  )
}

