import {
  Heart,
  House,
  type LucideIcon,
  ScanLine,
  Search,
  Settings,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../utils/cn'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  emphasized?: boolean
}

const items: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/scan', label: 'Scan', icon: ScanLine, emphasized: true },
  { to: '/saved', label: 'Saved', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/90 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-2">
        {items.map(({ emphasized, icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition',
                emphasized
                  ? 'rounded-[1.6rem] bg-emerald-500 px-3 py-3 text-white shadow-lg shadow-emerald-500/30 -translate-y-4'
                  : isActive
                    ? 'text-emerald-600'
                    : 'text-slate-400',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', emphasized ? 'h-6 w-6' : '', isActive && !emphasized ? 'stroke-[2.4]' : '')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
