import { Download, WifiOff } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { BottomNav } from '../navigation/bottom-nav'
import { ToastStack } from '../ui/toast-stack'
import { useInstallPrompt } from '../../hooks/use-install-prompt'
import { useOnlineStatus } from '../../hooks/use-online-status'
import { usePwaUpdates } from '../../hooks/use-pwa-updates'
import { useAppStore } from '../../store/app-store'

const pageMeta = {
  '/': {
    title: 'Daily dashboard',
    subtitle: 'Calories, macros, and quick logging.',
  },
  '/search': {
    title: 'Search foods',
    subtitle: 'Find, review, and log nutrition fast.',
  },
  '/scan': {
    title: 'Scan barcode',
    subtitle: 'Fastest path from wrapper to log.',
  },
  '/saved': {
    title: 'Saved items',
    subtitle: 'Favorites and reusable meals.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Optional profile, goals, and app controls.',
  },
} as const

export function AppShell({ children }: PropsWithChildren) {
  const isOnline = useOnlineStatus()
  const location = useLocation()
  const { dismissNotice, notices } = useAppStore()
  const { canInstall, promptInstall } = useInstallPrompt()
  const {
    dismissOfflineReady,
    dismissRefresh,
    needRefresh,
    offlineReady,
    updateServiceWorker,
  } = usePwaUpdates()
  const meta = pageMeta[location.pathname as keyof typeof pageMeta] ?? pageMeta['/']

  return (
    <div className="mx-auto min-h-svh max-w-lg bg-transparent pb-28">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-[rgba(247,248,252,0.92)] px-4 pb-3 pt-5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500">
              Forge Fitness
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-950">{meta.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{meta.subtitle}</p>
          </div>
          {canInstall ? (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm"
            >
              <Download className="h-4 w-4" />
              Install
            </button>
          ) : null}
        </div>

        {!isOnline ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Offline mode is on. You can still view logs and add manual entries.</span>
          </div>
        ) : null}
      </header>

      <main className="space-y-4 px-4 py-4">{children}</main>

      <ToastStack notices={notices} onDismiss={dismissNotice} />

      {offlineReady ? (
        <div className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-md rounded-3xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <span>Offline support is ready.</span>
            <button type="button" onClick={dismissOfflineReady} className="text-emerald-300">
              Nice
            </button>
          </div>
        </div>
      ) : null}

      {needRefresh ? (
        <div className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-md rounded-3xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <span>An update is ready.</span>
            <div className="flex gap-2">
              <button type="button" onClick={dismissRefresh} className="text-slate-300">
                Later
              </button>
              <button
                type="button"
                onClick={() => void updateServiceWorker(true)}
                className="text-emerald-300"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  )
}
