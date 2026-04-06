import {
  Cloud,
  Dumbbell,
  House,
  Scale,
  Settings,
  Target,
  UtensilsCrossed,
  WifiOff,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { AppSettings } from '../types'

interface AppShellProps {
  settings: AppSettings
  isOnline: boolean
  canInstall: boolean
  onInstall: () => Promise<void>
  children: ReactNode
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: House },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed },
  { to: '/targets', label: 'Targets', icon: Target },
  { to: '/weight', label: 'Weight', icon: Scale },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell({
  settings,
  isOnline,
  canInstall,
  onInstall,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-wrap">
          <div className="brand-mark">FF</div>

          <div className="brand-copy">
            <span className="brand-badge">Mobile-first • local-first</span>
            <strong>Forge Fitness</strong>
            <p>
              {settings.profile.name
                ? `Welcome back, ${settings.profile.name}. Keep the streak hot and the logging friction low.`
                : 'Your offline-friendly dashboard for meals, weight, and workouts.'}
            </p>
          </div>
        </div>

        <div className="header-actions">
          <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? <Cloud size={16} /> : <WifiOff size={16} />}
            {isOnline ? 'Cloudflare-ready mode' : 'Offline mode active'}
          </span>

          {canInstall ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                void onInstall()
              }}
            >
              Install app
            </button>
          ) : null}
        </div>
      </header>

      <main className="shell-main">{children}</main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`.trim()
              }
            >
              <Icon size={18} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}