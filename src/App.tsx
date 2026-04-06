import { useLiveQuery } from 'dexie-react-hooks'
import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import {
  DEFAULT_SETTINGS,
  getAppSettings,
  saveAppSettings,
  seedDatabase,
} from './lib/db'
import type { AppSettings, Profile, ThemePreference, WeekStartPreference } from './types'

const DashboardPage = lazy(async () => ({
  default: (await import('./pages/DashboardPage')).DashboardPage,
}))

const MealsPage = lazy(async () => ({
  default: (await import('./pages/MealsPage')).MealsPage,
}))

const WeightPage = lazy(async () => ({
  default: (await import('./pages/WeightPage')).WeightPage,
}))

const WorkoutsPage = lazy(async () => ({
  default: (await import('./pages/WorkoutsPage')).WorkoutsPage,
}))

const SettingsPage = lazy(async () => ({
  default: (await import('./pages/SettingsPage')).SettingsPage,
}))

const OnboardingModal = lazy(async () => ({
  default: (await import('./components/OnboardingModal')).OnboardingModal,
}))

function App() {
  const settings = useLiveQuery(() => getAppSettings(), [], DEFAULT_SETTINGS)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine)
  const settingsDraftKey = [
    settings.theme,
    settings.weekStartsOn,
    settings.profile.name,
    settings.profile.calorieTarget,
    settings.profile.proteinTarget,
    settings.profile.unit,
    settings.profile.weightGoalKg ?? 'none',
  ].join(':')

  useEffect(() => {
    void seedDatabase()
  }, [])

  useEffect(() => {
    const syncOnlineState = () => setIsOnline(navigator.onLine)

    window.addEventListener('online', syncOnlineState)
    window.addEventListener('offline', syncOnlineState)

    return () => {
      window.removeEventListener('online', syncOnlineState)
      window.removeEventListener('offline', syncOnlineState)
    }
  }, [])

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt as EventListener)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleInstallPrompt as EventListener,
      )
    }
  }, [])

  useEffect(() => {
    const resolvedTheme =
      settings.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : settings.theme

    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [settings.theme])

  const handleInstallApp = async () => {
    if (!installPrompt) {
      return
    }

    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    await saveAppSettings(updates)
  }

  const handleCompleteOnboarding = async (updates: {
    profile: Profile
    theme: ThemePreference
    weekStartsOn: WeekStartPreference
  }) => {
    await saveAppSettings({
      onboardingComplete: true,
      profile: updates.profile,
      theme: updates.theme,
      weekStartsOn: updates.weekStartsOn,
    })
  }

  return (
    <BrowserRouter>
      <AppShell
        settings={settings}
        isOnline={isOnline}
        canInstall={Boolean(installPrompt)}
        onInstall={handleInstallApp}
      >
        <Suspense fallback={<div className="section-card">Loading Forge Fitness…</div>}>
          <Routes>
            <Route path="/" element={<DashboardPage settings={settings} />} />
            <Route path="/meals" element={<MealsPage settings={settings} />} />
            <Route path="/weight" element={<WeightPage settings={settings} />} />
            <Route path="/workouts" element={<WorkoutsPage settings={settings} />} />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  key={settingsDraftKey}
                  settings={settings}
                  canInstall={Boolean(installPrompt)}
                  onInstall={handleInstallApp}
                  onSaveSettings={handleUpdateSettings}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>

      {!settings.onboardingComplete ? (
        <Suspense fallback={null}>
          <OnboardingModal
            key={`onboarding:${settingsDraftKey}`}
            settings={settings}
            onComplete={handleCompleteOnboarding}
          />
        </Suspense>
      ) : null}
    </BrowserRouter>
  )
}

export default App
