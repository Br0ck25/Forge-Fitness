import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/app-shell'
import { SetupModal } from './components/ui/setup-modal'
import { AppStoreProvider, useAppStore } from './store/app-store'

const HomePage = lazy(async () => ({
  default: (await import('./features/home/home-page')).HomePage,
}))

const SearchPage = lazy(async () => ({
  default: (await import('./features/search/search-page')).SearchPage,
}))

const ScanPage = lazy(async () => ({
  default: (await import('./features/scan/scan-page')).ScanPage,
}))

const SavedPage = lazy(async () => ({
  default: (await import('./features/saved/saved-page')).SavedPage,
}))

const SettingsPage = lazy(async () => ({
  default: (await import('./features/settings/settings-page')).SettingsPage,
}))

function AppLayout() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="rounded-4xl border border-white/70 bg-white/90 p-5 text-center shadow-xl shadow-slate-950/5 backdrop-blur">
            <p className="text-sm font-semibold text-slate-950">Opening screen…</p>
            <p className="mt-2 text-sm text-slate-500">
              Loading just what this part of the app needs.
            </p>
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AppShell>
  )
}

function AppRouter() {
  const {
    completeFirstVisit,
    dismissFirstVisitModal,
    isFirstVisitOpen,
    settings,
  } = useAppStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <SetupModal
        open={isFirstVisitOpen}
        initialProfile={settings.profile}
        units={settings.units}
        onSkip={dismissFirstVisitModal}
        onSave={completeFirstVisit}
      />
    </BrowserRouter>
  )
}

function App() {
  return (
    <AppStoreProvider>
      <AppRouter />
    </AppStoreProvider>
  )
}

export default App
