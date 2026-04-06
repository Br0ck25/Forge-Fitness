import { Download, Rocket, Target, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { exportBackup, importBackup } from '../lib/db'
import { toDisplayWeight } from '../lib/utils'
import type { AppSettings, ThemePreference, WeekStartPreference, WeightUnit } from '../types'

interface SettingsPageProps {
  settings: AppSettings
  canInstall: boolean
  onInstall: () => Promise<void>
  onSaveSettings: (updates: Partial<AppSettings>) => Promise<void>
}

export function SettingsPage({
  settings,
  canInstall,
  onInstall,
  onSaveSettings,
}: SettingsPageProps) {
  const [name, setName] = useState(settings.profile.name)
  const [startWeight, setStartWeight] = useState(
    settings.profile.startWeightKg
      ? String(toDisplayWeight(settings.profile.startWeightKg, settings.profile.unit))
      : '',
  )
  const [goalWeight, setGoalWeight] = useState(
    settings.profile.weightGoalKg
      ? String(toDisplayWeight(settings.profile.weightGoalKg, settings.profile.unit))
      : '',
  )
  const [unit, setUnit] = useState<WeightUnit>(settings.profile.unit)
  const [theme, setTheme] = useState<ThemePreference>(settings.theme)
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartPreference>(settings.weekStartsOn)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleSave = async () => {
    await onSaveSettings({
      theme,
      weekStartsOn,
      onboardingComplete: true,
      profile: {
        ...settings.profile,
        name: name.trim(),
        startWeightKg: startWeight
          ? unit === 'lb'
            ? Number(startWeight) / 2.2046226218
            : Number(startWeight)
          : undefined,
        weightGoalKg: goalWeight
          ? unit === 'lb'
            ? Number(goalWeight) / 2.2046226218
            : Number(goalWeight)
          : undefined,
        unit,
      },
    })

    setFeedback({ type: 'success', text: 'Preferences saved.' })
  }

  const handleExport = async () => {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `forge-fitness-backup-${backup.exportedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(objectUrl)
    setFeedback({ type: 'success', text: 'Backup exported successfully.' })
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      await importBackup(text)
      setFeedback({ type: 'success', text: 'Backup imported. Your screens will refresh automatically.' })
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Import failed.',
      })
    }
  }

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Settings"
        title="Tune the experience"
        description="Adjust your targets, theme, install behavior, and backup settings without leaving the app."
        actions={
          canInstall ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                void onInstall()
              }}
            >
              Install now
            </button>
          ) : null
        }
      />

      {feedback ? (
        <div className={`notice ${feedback.type === 'error' ? 'notice-error' : 'notice-success'}`}>
          {feedback.text}
        </div>
      ) : null}

      <div className="settings-grid">
        <SectionCard
          title="Profile & preferences"
          description="These settings drive the dashboard copy, weight displays, and overall app feel."
        >
          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="settings-name">Name</label>
              <input
                id="settings-name"
                value={name}
                placeholder="Athlete"
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="settings-unit">Weight unit</label>
              <select
                id="settings-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value as WeightUnit)}
              >
                <option value="kg">Kilograms</option>
                <option value="lb">Pounds</option>
              </select>
            </div>
          </div>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="settings-start-weight">Start weight ({unit})</label>
              <input
                id="settings-start-weight"
                type="number"
                step="0.1"
                placeholder="Optional"
                value={startWeight}
                onChange={(event) => setStartWeight(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="settings-goal-weight">Goal weight ({unit})</label>
              <input
                id="settings-goal-weight"
                type="number"
                step="0.1"
                value={goalWeight}
                onChange={(event) => setGoalWeight(event.target.value)}
              />
            </div>
          </div>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="settings-theme">Theme</label>
              <select
                id="settings-theme"
                value={theme}
                onChange={(event) => setTheme(event.target.value as ThemePreference)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="settings-week-start">Week starts on</label>
            <select
              id="settings-week-start"
              value={weekStartsOn}
              onChange={(event) =>
                setWeekStartsOn(event.target.value as WeekStartPreference)
              }
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>

          <button type="button" className="button button-primary" onClick={() => void handleSave()}>
            Save settings
          </button>
        </SectionCard>

        <div className="content-stack">
          <SectionCard
            title="Targets & expenditure"
            description="Use the dedicated targets screen for baseline activity, calorie targets, macro modes, and breakdown previews."
            action={
              <Link to="/targets" className="button button-primary">
                <Target size={18} /> Open targets
              </Link>
            }
          >
            <div className="summary-list compact-summary-list">
              <div className="summary-row">
                <span>Daily energy target</span>
                <strong>{settings.profile.calorieTarget} kcal</strong>
              </div>
              <div className="summary-row">
                <span>Protein / Carbs / Fat</span>
                <strong>
                  {settings.profile.proteinTarget}g / {settings.profile.carbsTarget}g / {settings.profile.fatTarget}g
                </strong>
              </div>
              <div className="summary-row">
                <span>Start & goal</span>
                <strong>
                  {settings.profile.startWeightKg
                    ? `${toDisplayWeight(settings.profile.startWeightKg, settings.profile.unit).toFixed(1)} ${settings.profile.unit}`
                    : 'Unset'}
                  {' → '}
                  {settings.profile.weightGoalKg
                    ? `${toDisplayWeight(settings.profile.weightGoalKg, settings.profile.unit).toFixed(1)} ${settings.profile.unit}`
                    : 'Unset'}
                </strong>
              </div>
            </div>

            <p className="subtle-text">
              This is where ratio, fixed, and keto setups live now, along with the baseline
              activity model and daily energy target breakdown.
            </p>
          </SectionCard>

          <SectionCard
            title="Backup & restore"
            description="Export a portable JSON backup or import one to restore everything locally."
          >
            <div className="inline-row">
              <button type="button" className="button button-secondary" onClick={() => void handleExport()}>
                <Download size={18} /> Export backup
              </button>

              <label className="button button-ghost" htmlFor="backup-import">
                <Upload size={18} /> Import backup
              </label>

              <input
                id="backup-import"
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(event) => {
                  void handleImport(event.target.files?.[0])
                }}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Cloudflare deployment notes"
            description="This build is ready for Cloudflare Pages on the frontend and a Wrangler-managed Worker for barcode lookup."
            action={
              <span className="chip">
                <Rocket size={16} /> Pages + Workers
              </span>
            }
          >
            <div className="stack-sm">
              <p className="subtle-text">
                Frontend: build with <code>npm run build</code> and publish the <code>dist</code>
                directory on Cloudflare Pages.
              </p>
              <p className="subtle-text">
                Barcode API: deploy the Worker with <code>npm run worker:deploy</code>. You can
                optionally point <code>VITE_BARCODE_API_BASE_URL</code> at the Worker URL.
              </p>
              <p className="subtle-text">
                Camera scanning needs HTTPS on phones, which Cloudflare Pages provides automatically.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="PWA status"
            description="Install prompts appear only when the browser considers the app installable."
          >
            <div className="stack-sm">
              <p className="subtle-text">
                Service worker registration, manifest metadata, and install icons are bundled with
                this project.
              </p>
              <p className="subtle-text">
                If the install button does not appear, load the production build over HTTPS and visit
                the site a couple of times so the browser decides it trusts you. Browsers are picky
                roommates.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}