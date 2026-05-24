import { useNavigate } from 'react-router-dom'
import { DSPage, DSSection, DSCard, DSButton } from '../design-system'

export default function More() {
  const navigate = useNavigate()

  const items = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      description: 'Overview of projects, tasks and finances',
      path: '/dashboard',
    },
    {
      key: 'archived-projects',
      title: 'Archived Projects',
      description: 'View and manage archived projects',
      path: '/projects/archived',
    },
    {
      key: 'settings',
      title: 'Settings',
      description: 'Workspace, integrations and account options',
      path: '/settings',
    },
  ]

  return (
    <DSPage title="More">
      <div className="ds-page-content-spacer more-page" dir="ltr" lang="en">
        <DSSection title="Tools and more pages">
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
                  Open
                </DSButton>
              </DSCard>
            ))}
          </div>
        </DSSection>
      </div>
    </DSPage>
  )
}

