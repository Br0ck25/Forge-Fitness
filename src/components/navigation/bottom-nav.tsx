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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/90 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center gap-2">
        {items.map(({ emphasized, icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium transition',
                emphasized
                  ? cn(
                      'rounded-[1.8rem] px-3 py-3 text-white shadow-xl -mt-6',
                      isActive
                        ? 'bg-slate-950 ring-4 ring-emerald-100 shadow-slate-950/20'
                        : 'bg-emerald-500 shadow-emerald-500/30',
                    )
                  : isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-400 hover:text-slate-600',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-5 w-5',
                    emphasized ? 'h-6 w-6' : '',
                    isActive && !emphasized ? 'stroke-[2.4]' : '',
                  )}
                />
                <span>{label}</span>
                {!emphasized ? (
                  <span
                    className={cn(
                      'h-1 w-1 rounded-full transition',
                      isActive ? 'bg-emerald-500' : 'bg-transparent',
                    )}
                  />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
