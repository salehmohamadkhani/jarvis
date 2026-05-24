import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  IconSparkles,
  IconCalendar,
  IconFolder,
  IconCurrencyDollar,
  IconUsers,
  IconSettings,
} from "@tabler/icons-react"
import QuickAddModal from "./QuickAddModal.jsx"
import "../App.css"

const navItems = [
  { to: "/", label: "Jarvis", Icon: IconSparkles },
  { to: "/today", label: "Today", Icon: IconCalendar },
  { to: "/projects", label: "Projects", Icon: IconFolder },
  { to: "/finance", label: "Finance", Icon: IconCurrencyDollar },
  { to: "/collaborators", label: "Collaborators", Icon: IconUsers },
  { to: "/more", label: "More", Icon: IconSettings },
]

export default function Layout({ children }) {
  const [showSheet, setShowSheet] = useState(false)
  const location = useLocation()
  const isLtrShell =
    location.pathname === '/settings' ||
    location.pathname === '/finance' ||
    location.pathname === '/more'
  const shellClass = `app-shell${isLtrShell ? " app-shell--ltr" : ""}${showSheet ? " sheet-open" : ""}`

  const subtitle = (() => {
    switch (location.pathname) {
      case "/":
        return "Jarvis Assistant"
      case "/dashboard":
        return "Dashboard"
      case "/today":
        return "Today"
      case "/projects":
        return "Projects"
      case "/projects/archived":
        return "Archived Projects"
      case "/finance":
        return "Finance"
      case "/more":
        return "More"
      default:
        if (location.pathname.startsWith('/projects/')) {
          return "Project Details"
        }
        return "Dashboard"
    }
  })()

  return (
    <div className={shellClass} dir={isLtrShell ? 'ltr' : undefined}>
      <div className="app-inner" dir={isLtrShell ? 'ltr' : undefined}>
        <header className="app-header">
          <h1>Planner</h1>
          <span className="app-subtitle">{subtitle}</span>
        </header>
        <div className="app-scroll">
          <main className="app-main">{children}</main>
        </div>
      </div>
      {location.pathname !== '/' && location.pathname !== '/settings' && (
        <button className="fab" onClick={() => setShowSheet(true)} aria-label="Quick add">
          +
        </button>
      )}
      <nav className="bottom-nav" role="navigation" aria-label="Main">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to + '/'))
          const Icon = item.Icon
          return (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={isActive ? "nav-item active" : "nav-item"}
            >
              <span className="nav-icon" role="img" aria-hidden>
                <Icon size={22} stroke={1.75} aria-hidden />
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      {showSheet && <QuickAddModal onClose={() => setShowSheet(false)} />}
    </div>
  )
}
