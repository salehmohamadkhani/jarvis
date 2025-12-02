import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import QuickAddModal from "./QuickAddModal.jsx"
import "../App.css"

const navItems = [
  { to: "/", label: "Jarvis", icon: "\u{1F4A1}" },
  { to: "/today", label: "Today", icon: "\u{1F4C5}" },
  { to: "/projects", label: "پروژه‌ها", icon: "\u{1F4C1}" },
  { to: "/finance", label: "مالی", icon: "\u{1F4B0}" },
  { to: "/collaborators", label: "همکاران", icon: "\u{1F465}" },
  { to: "/more", label: "بیشتر", icon: "\u2699\uFE0F" },
]

export default function Layout({ children }) {
  const [showSheet, setShowSheet] = useState(false)
  const location = useLocation()
  const shellClass = `app-shell${showSheet ? " sheet-open" : ""}`

  const subtitle = (() => {
    switch (location.pathname) {
      case "/":
        return "دستیار Jarvis"
      case "/dashboard":
        return "داشبورد"
      case "/today":
        return "امروز"
      case "/projects":
        return "پروژه‌ها"
      case "/projects/archived":
        return "پروژه‌های بایگانی شده"
      default:
        // بررسی برای route های dynamic مثل /projects/:id
        if (location.pathname.startsWith('/projects/')) {
          return "جزئیات پروژه"
        }
        return "داشبورد"
    }
  })()

  return (
    <div className={shellClass}>
      <div className="app-inner">
        <header className="app-header">
          <h1>Planner</h1>
          <span className="app-subtitle">{subtitle}</span>
        </header>
        <div className="app-scroll">
          <main className="app-main">{children}</main>
        </div>
      </div>
      {location.pathname !== '/' && (
        <button className="fab" onClick={() => setShowSheet(true)} aria-label="Quick add">
          +
        </button>
      )}
      <nav className="bottom-nav" role="navigation" aria-label="Main">
        {navItems.map((item) => {
          // برای route های nested مثل /projects/:id، باید بررسی کنیم که آیا pathname با item.to شروع می‌شود
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to + '/'))
          
          return (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={isActive ? "nav-item active" : "nav-item"}
            >
              <span className="nav-icon" role="img" aria-hidden>
                {item.icon}
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
