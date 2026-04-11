import { Calculator, RotateCcw, Settings2, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/ui/card'
import { ProfileFields } from '../../components/ui/profile-fields'
import { useAppStore } from '../../store/app-store'
import { goalAdjustmentLabels } from '../../types/domain'
import type { GoalSettings, Profile, UnitSettings } from '../../types/domain'
import {
  calculateBmr,
  calculateSuggestedCalories,
  calculateTdee,
  isProfileComplete,
} from '../../utils/calculations'

function NumberInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
          className="input-field pr-14"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  )
}

export function SettingsPage() {
  const {
    openFirstVisitModal,
    resetAllData,
    settings,
    updateGoals,
    updateProfile,
    updateUnits,
  } = useAppStore()
  const [profile, setProfile] = useState<Profile>(settings.profile)
  const [goals, setGoals] = useState<GoalSettings>(settings.goals)
  const [units, setUnits] = useState<UnitSettings>(settings.units)
  const [savingSection, setSavingSection] = useState<'profile' | 'goals' | 'units' | null>(null)

  useEffect(() => setProfile(settings.profile), [settings.profile])
  useEffect(() => setGoals(settings.goals), [settings.goals])
  useEffect(() => setUnits(settings.units), [settings.units])

  const bmr = useMemo(() => calculateBmr(profile), [profile])
  const tdee = useMemo(() => calculateTdee(profile), [profile])
  const suggestedCalories = useMemo(
    () => calculateSuggestedCalories(profile, goals.goalAdjustment),
    [goals.goalAdjustment, profile],
  )
  const activeCalories =
    goals.calorieMode === 'auto' && suggestedCalories ? suggestedCalories : goals.calorieGoal

  async function saveProfile() {
    setSavingSection('profile')
    try {
      await updateProfile(profile)
    } finally {
      setSavingSection(null)
    }
  }

  async function saveGoals() {
    setSavingSection('goals')
    try {
      await updateGoals(goals)
    } finally {
      setSavingSection(null)
    }
  }

  async function saveUnits() {
    setSavingSection('units')
    try {
      await updateUnits(units)
    } finally {
      setSavingSection(null)
    }
  }

  async function handleReset() {
    const confirmed = window.confirm('Reset profile, goals, favorites, meals, and logs? This cannot be undone.')
    if (!confirmed) {
      return
    }

    await resetAllData()
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Active target</p>
            <p className="text-sm text-slate-500">Manual goals always win when you want them to.</p>
          </div>
        </div>
        <div className="rounded-3xl bg-slate-950 px-4 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Calories today</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{activeCalories}</p>
          <p className="mt-1 text-sm text-emerald-100/90">
            {goals.calorieMode === 'auto' && suggestedCalories
              ? 'Using BMR + activity estimate'
              : 'Using your manual calorie goal'}
          </p>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Optional profile</p>
            <p className="text-sm text-slate-500">Use it for calorie estimates, or skip it entirely.</p>
          </div>
        </div>

        <ProfileFields profile={profile} units={units} onChange={setProfile} />

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {isProfileComplete(profile)
            ? `BMR ${bmr} kcal · TDEE ${tdee} kcal · Suggested target ${suggestedCalories} kcal`
            : 'Complete age, sex, height, weight, and activity level to unlock automatic calorie estimation.'}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => void saveProfile()} className="button-primary flex-1">
            {savingSection === 'profile' ? 'Saving…' : 'Save profile'}
          </button>
          <button type="button" onClick={openFirstVisitModal} className="button-secondary flex-1">
            Open setup modal
          </button>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Goals</p>
            <p className="text-sm text-slate-500">Automatic calorie suggestions, manual overrides, and editable macros.</p>
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">Goal focus</span>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(goalAdjustmentLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setGoals((current) => ({
                    ...current,
                    goalAdjustment: value as GoalSettings['goalAdjustment'],
                  }))
                }
                className={
                  goals.goalAdjustment === value
                    ? 'rounded-2xl bg-slate-950 px-3 py-3 text-sm font-semibold text-white'
                    : 'rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">Calorie mode</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'auto', label: 'Auto from BMR' },
              { value: 'manual', label: 'Manual target' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setGoals((current) => ({
                    ...current,
                    calorieMode: option.value as GoalSettings['calorieMode'],
                  }))
                }
                className={
                  goals.calorieMode === option.value
                    ? 'rounded-2xl bg-emerald-500 px-3 py-3 text-sm font-semibold text-white'
                    : 'rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700'
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Manual calories"
            value={goals.calorieGoal}
            onChange={(value) => setGoals((current) => ({ ...current, calorieGoal: value }))}
            suffix="kcal"
          />
          <NumberInput
            label="Protein"
            value={goals.proteinGoal}
            onChange={(value) => setGoals((current) => ({ ...current, proteinGoal: value }))}
            suffix="g"
          />
          <NumberInput
            label="Carbs"
            value={goals.carbsGoal}
            onChange={(value) => setGoals((current) => ({ ...current, carbsGoal: value }))}
            suffix="g"
          />
          <NumberInput
            label="Fat"
            value={goals.fatGoal}
            onChange={(value) => setGoals((current) => ({ ...current, fatGoal: value }))}
            suffix="g"
          />
        </div>

        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
          Suggested calories: {suggestedCalories ?? 'Unavailable until profile is complete'}.
          Manual macros are always editable.
        </div>

        <button type="button" onClick={() => void saveGoals()} className="button-primary w-full justify-center">
          {savingSection === 'goals' ? 'Saving…' : 'Save goals'}
        </button>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Units</p>
            <p className="text-sm text-slate-500">Switch display units anytime. Stored values remain consistent.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Weight</span>
            <select
              value={units.weight}
              onChange={(event) =>
                setUnits((current) => ({
                  ...current,
                  weight: event.target.value as UnitSettings['weight'],
                }))
              }
              className="input-field"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Height</span>
            <select
              value={units.height}
              onChange={(event) =>
                setUnits((current) => ({
                  ...current,
                  height: event.target.value as UnitSettings['height'],
                }))
              }
              className="input-field"
            >
              <option value="cm">cm</option>
              <option value="ft-in">ft / in</option>
            </select>
          </label>
        </div>

        <button type="button" onClick={() => void saveUnits()} className="button-primary w-full justify-center">
          {savingSection === 'units' ? 'Saving…' : 'Save units'}
        </button>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Reset & app info</p>
            <p className="text-sm text-slate-500">Local-first storage, installable PWA, and offline logging for manual entries.</p>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-slate-600">
          <li>• Storage: local browser storage (`localStorage`)</li>
          <li>• Offline: view logs and add manual entries</li>
          <li>• Installable: yes, from supported mobile browsers</li>
          <li>• Food data: Open Food Facts search + barcode lookup</li>
        </ul>

        <button type="button" onClick={() => void handleReset()} className="button-secondary w-full justify-center text-rose-600">
          Reset all data
        </button>
      </Card>
    </div>
  )
}
