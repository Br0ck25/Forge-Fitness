import { useState } from 'react'
import { fromDisplayWeight } from '../lib/utils'
import type {
  AppSettings,
  Profile,
  ThemePreference,
  WeekStartPreference,
  WeightUnit,
} from '../types'
import { Modal } from './Modal'

interface OnboardingModalProps {
  settings: AppSettings
  onComplete: (updates: {
    profile: Profile
    theme: ThemePreference
    weekStartsOn: WeekStartPreference
  }) => Promise<void>
}

export function OnboardingModal({ settings, onComplete }: OnboardingModalProps) {
  const [name, setName] = useState(settings.profile.name)
  const [calorieTarget, setCalorieTarget] = useState(
    String(settings.profile.calorieTarget),
  )
  const [proteinTarget, setProteinTarget] = useState(
    String(settings.profile.proteinTarget),
  )
  const [weightGoal, setWeightGoal] = useState(
    settings.profile.weightGoalKg ? String(settings.profile.weightGoalKg) : '',
  )
  const [unit, setUnit] = useState<WeightUnit>(settings.profile.unit)
  const [theme, setTheme] = useState<ThemePreference>(settings.theme)
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartPreference>(
    settings.weekStartsOn,
  )
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async () => {
    setIsSaving(true)

    try {
      const profile: Profile = {
        ...settings.profile,
        name: name.trim() || 'Athlete',
        calorieTarget: Math.max(1200, Number(calorieTarget) || settings.profile.calorieTarget),
        proteinTarget: Math.max(60, Number(proteinTarget) || settings.profile.proteinTarget),
        weightGoalKg: weightGoal
          ? fromDisplayWeight(Number(weightGoal) || 0, unit)
          : undefined,
        unit,
      }

      await onComplete({
        profile,
        theme,
        weekStartsOn,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={() => undefined}
      title="Set up Forge Fitness"
      description="A quick minute here saves a lot of taps later. Pick your defaults and the app will feel tailored from the first log."
      dismissible={false}
      size="lg"
    >
      <div className="field-grid two-up">
        <div className="field">
          <label htmlFor="onboarding-name">Name</label>
          <input
            id="onboarding-name"
            placeholder="Athlete"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="onboarding-unit">Weight unit</label>
          <select
            id="onboarding-unit"
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
          <label htmlFor="onboarding-calories">Daily calorie target</label>
          <input
            id="onboarding-calories"
            type="number"
            min="1200"
            step="50"
            value={calorieTarget}
            onChange={(event) => setCalorieTarget(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="onboarding-protein">Daily protein target</label>
          <input
            id="onboarding-protein"
            type="number"
            min="60"
            step="5"
            value={proteinTarget}
            onChange={(event) => setProteinTarget(event.target.value)}
          />
        </div>
      </div>

      <div className="field-grid two-up">
        <div className="field">
          <label htmlFor="onboarding-goal">Goal weight ({unit})</label>
          <input
            id="onboarding-goal"
            type="number"
            step="0.1"
            placeholder="Optional"
            value={weightGoal}
            onChange={(event) => setWeightGoal(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="onboarding-theme">Theme</label>
          <select
            id="onboarding-theme"
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
        <label htmlFor="onboarding-week-start">Week starts on</label>
        <select
          id="onboarding-week-start"
          value={weekStartsOn}
          onChange={(event) =>
            setWeekStartsOn(event.target.value as WeekStartPreference)
          }
        >
          <option value="monday">Monday</option>
          <option value="sunday">Sunday</option>
        </select>
      </div>

      <div className="notice notice-success">
        Forge Fitness stores your data locally first, works offline, and keeps meal, weight,
        and workout tracking one tap away.
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="button button-primary stretch"
          onClick={() => {
            void handleSubmit()
          }}
          disabled={isSaving}
        >
          {isSaving ? 'Saving your setup...' : 'Start tracking'}
        </button>
      </div>
    </Modal>
  )
}