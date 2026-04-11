import {
  Calculator,
  Download,
  RotateCcw,
  Settings2,
  Sparkles,
  Upload,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../../components/ui/card'
import { ProfileFields } from '../../components/ui/profile-fields'
import { useAppStore } from '../../store/app-store'
import { goalAdjustmentLabels } from '../../types/domain'
import type { AppSettingsRecord, GoalSettings, Profile, UnitSettings } from '../../types/domain'
import {
  calculateBmr,
  calculateMacroCalories,
  calculateSuggestedCalories,
  calculateTdee,
  isProfileComplete,
  resolveGoals,
} from '../../utils/calculations'

type AutosaveStatus = 'saved' | 'saving' | 'error'

function useAutosaveDraft<T>(
  draft: T,
  persisted: T,
  onSave: (value: T) => Promise<void>,
): AutosaveStatus {
  const [hasError, setHasError] = useState(false)
  const draftKey = JSON.stringify(draft)
  const persistedKey = JSON.stringify(persisted)
  const isDirty = draftKey !== persistedKey

  useEffect(() => {
    if (!isDirty) {
      return
    }

    let isCancelled = false

    const timeoutId = window.setTimeout(() => {
      void onSave(draft)
        .then(() => {
          if (!isCancelled) {
            setHasError(false)
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setHasError(true)
          }
        })
    }, 300)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [draft, isDirty, onSave])

  if (hasError) {
    return 'error'
  }

  return isDirty ? 'saving' : 'saved'
}

function AutosaveBadge({ status }: { status: AutosaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        Saving…
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
        Save issue
      </span>
    )
  }

  return (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
      Saved
    </span>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  disabled = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
  step?: number
  disabled?: boolean
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          type="number"
          min="0"
          step={step}
          inputMode={step === 1 ? 'numeric' : 'decimal'}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
          className="input-field pr-14 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
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
    exportBackup,
    importBackup,
    notify,
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
  const [isImporting, setIsImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setProfile(settings.profile), [settings.profile])
  useEffect(() => setGoals(settings.goals), [settings.goals])
  useEffect(() => setUnits(settings.units), [settings.units])

  const profileStatus = useAutosaveDraft(profile, settings.profile, updateProfile)
  const goalsStatus = useAutosaveDraft(goals, settings.goals, updateGoals)
  const unitsStatus = useAutosaveDraft(units, settings.units, updateUnits)

  const previewSettings = useMemo<AppSettingsRecord>(
    () => ({
      ...settings,
      profile,
      goals,
      units,
    }),
    [goals, profile, settings, units],
  )

  const resolvedGoals = useMemo(() => resolveGoals(previewSettings), [previewSettings])
  const bmr = useMemo(() => calculateBmr(profile), [profile])
  const tdee = useMemo(() => calculateTdee(profile), [profile])
  const suggestedCalories = useMemo(
    () => calculateSuggestedCalories(profile, goals.goalAdjustment),
    [goals.goalAdjustment, profile],
  )
  const manualMacroCalories = useMemo(
    () =>
      calculateMacroCalories({
        protein: goals.proteinGoal,
        carbs: goals.carbsGoal,
        fat: goals.fatGoal,
      }),
    [goals.carbsGoal, goals.fatGoal, goals.proteinGoal],
  )

  const displayedProtein =
    goals.macroMode === 'auto' ? resolvedGoals.protein : goals.proteinGoal
  const displayedCarbs = goals.macroMode === 'auto' ? resolvedGoals.carbs : goals.carbsGoal
  const displayedFat = goals.macroMode === 'auto' ? resolvedGoals.fat : goals.fatGoal
  const activeCalories = resolvedGoals.calories
  const hasProfileData = isProfileComplete(profile)
  const macroDifference = resolvedGoals.macroCalories - activeCalories

  useEffect(() => {
    if (goals.calorieMode !== 'auto' || bmr == null || goals.calorieGoal === bmr) {
      return
    }

    setGoals((current) =>
      current.calorieMode === 'auto' && current.calorieGoal !== bmr
        ? {
            ...current,
            calorieGoal: bmr,
          }
        : current,
    )
  }, [bmr, goals.calorieGoal, goals.calorieMode])

  function updateManualMacroGoals(updates: Partial<Pick<GoalSettings, 'proteinGoal' | 'carbsGoal' | 'fatGoal'>>) {
    setGoals((current) => {
      const next = {
        ...current,
        ...updates,
      }

      if (next.calorieMode === 'manual' && next.macroMode === 'manual') {
        next.calorieGoal = calculateMacroCalories({
          protein: next.proteinGoal,
          carbs: next.carbsGoal,
          fat: next.fatGoal,
        })
      }

      return next
    })
  }

  function syncCaloriesToManualMacros() {
    setGoals((current) => ({
      ...current,
      calorieMode: 'manual',
      calorieGoal: manualMacroCalories,
    }))
  }

  function copySuggestedCaloriesToManualTarget() {
    if (!suggestedCalories) {
      return
    }

    setGoals((current) => ({
      ...current,
      calorieMode: 'manual',
      calorieGoal: suggestedCalories,
    }))
  }

  function handleCalorieModeChange(mode: GoalSettings['calorieMode']) {
    setGoals((current) => {
      if (current.calorieMode === mode) {
        return current
      }

      return {
        ...current,
        calorieMode: mode,
        calorieGoal: mode === 'auto' && bmr != null ? bmr : current.calorieGoal,
      }
    })
  }

  function handleMacroModeChange(mode: GoalSettings['macroMode']) {
    setGoals((current) => {
      if (current.macroMode === mode) {
        return current
      }

      return {
        ...current,
        macroMode: mode,
        calorieGoal:
          mode === 'manual' && current.calorieMode === 'manual'
            ? calculateMacroCalories({
                protein: current.proteinGoal,
                carbs: current.carbsGoal,
                fat: current.fatGoal,
              })
            : current.calorieGoal,
      }
    })
  }

  function triggerImportPicker() {
    importInputRef.current?.click()
  }

  function handleExportBackup() {
    const backup = exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateStamp = backup.exportedAt.slice(0, 10)

    link.href = url
    link.download = `forge-fitness-backup-${dateStamp}.json`
    link.click()

    window.setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 0)

    notify({
      title: 'Backup exported',
      description:
        'Your profile, goals, saved foods, meals, logs, and setup state were downloaded as JSON.',
    })
  }

  async function handleImportBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const confirmed = window.confirm(
      'Restore this backup on the current device? This will replace your existing local data.',
    )

    if (!confirmed) {
      return
    }

    setIsImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const restoredBackup = await importBackup(parsed)

      notify({
        title: 'Backup restored',
        description: `Imported ${restoredBackup.state.favorites.length} favorites, ${restoredBackup.state.customMeals.length} meals, and ${restoredBackup.state.logEntries.length} log entries.`,
      })
    } catch (error) {
      notify({
        title: 'Import failed',
        description:
          error instanceof Error
            ? error.message
            : 'That backup could not be restored. Make sure the file is valid JSON.',
        tone: 'error',
        durationMs: 6000,
      })
    } finally {
      setIsImporting(false)
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      'Reset profile, goals, favorites, custom meals, logs, and setup state on this device? This cannot be undone.',
    )
    if (!confirmed) {
      return
    }

    await resetAllData()
    notify({
      title: 'All local data reset',
      description: 'Forge Fitness is back to a fresh start on this device.',
      tone: 'info',
    })
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Active target</p>
            <p className="text-sm text-slate-500">
              Calories and macros stay clear about what is automatic versus what you set yourself.
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-950 px-4 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Calories today</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{activeCalories}</p>
          <p className="mt-1 text-sm text-emerald-100/90">
            {resolvedGoals.source === 'auto'
              ? suggestedCalories
                ? 'Auto target from BMR, activity, and your goal focus'
                : 'Auto mode is on — using your manual fallback until the profile is complete'
              : 'Manual calorie target'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">BMR</p>
            <p className="mt-1">{bmr ?? '—'} kcal</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">TDEE</p>
            <p className="mt-1">{tdee ?? '—'} kcal</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">Macro calories</p>
            <p className="mt-1">{resolvedGoals.macroCalories} kcal</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">Optional profile</p>
              <p className="text-sm text-slate-500">
                Autosaves locally as you type. Use it for calorie estimates, or skip it entirely.
              </p>
            </div>
          </div>
          <AutosaveBadge status={profileStatus} />
        </div>

        <ProfileFields profile={profile} units={units} onChange={setProfile} />

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {hasProfileData
            ? `BMR ${bmr} kcal · TDEE ${tdee} kcal · Suggested target ${suggestedCalories} kcal`
            : 'Complete age, sex, height, weight, and activity level to unlock automatic calorie estimation.'}
        </div>

        <button
          type="button"
          onClick={openFirstVisitModal}
          className="button-secondary w-full justify-center"
        >
          Open setup modal
        </button>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">Goals</p>
              <p className="text-sm text-slate-500">
                Choose what is automatic, keep what is manual, and make the math obvious.
              </p>
            </div>
          </div>
          <AutosaveBadge status={goalsStatus} />
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
                onClick={() => handleCalorieModeChange(option.value as GoalSettings['calorieMode'])}
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

        <NumberInput
          label={
            goals.calorieMode === 'auto'
              ? 'Manual calorie fallback (matches BMR)'
              : 'Manual calories'
          }
          value={goals.calorieGoal}
          onChange={(value) => setGoals((current) => ({ ...current, calorieGoal: value }))}
          suffix="kcal"
          disabled={goals.calorieMode === 'auto'}
        />

        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
          {goals.calorieMode === 'auto'
            ? bmr
              ? `Auto mode keeps the fallback locked to your BMR of ${bmr} kcal until you switch to Manual target.`
              : `Finish your profile to calculate BMR. Until then, the fallback stays locked to your current calorie value.`
            : suggestedCalories
              ? `Auto calories suggest ${suggestedCalories} kcal based on your profile and goal focus.`
              : 'Finish your profile to unlock suggested calories.'}
        </div>

        {suggestedCalories && goals.calorieMode === 'manual' && goals.macroMode === 'auto' ? (
          <button
            type="button"
            onClick={copySuggestedCaloriesToManualTarget}
            className="button-secondary w-full justify-center"
          >
            Copy {suggestedCalories} kcal into manual target
          </button>
        ) : null}

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">Macro mode</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'auto', label: 'Auto from calories' },
              { value: 'manual', label: 'Manual grams' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleMacroModeChange(option.value as GoalSettings['macroMode'])}
                className={
                  goals.macroMode === option.value
                    ? 'rounded-2xl bg-slate-950 px-3 py-3 text-sm font-semibold text-white'
                    : 'rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700'
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput
            label="Protein"
            value={displayedProtein}
            onChange={(value) => updateManualMacroGoals({ proteinGoal: value })}
            suffix="g"
            step={0.5}
            disabled={goals.macroMode === 'auto'}
          />
          <NumberInput
            label="Carbs"
            value={displayedCarbs}
            onChange={(value) => updateManualMacroGoals({ carbsGoal: value })}
            suffix="g"
            step={0.5}
            disabled={goals.macroMode === 'auto'}
          />
          <NumberInput
            label="Fat"
            value={displayedFat}
            onChange={(value) => updateManualMacroGoals({ fatGoal: value })}
            suffix="g"
            step={0.5}
            disabled={goals.macroMode === 'auto'}
          />
        </div>

        {goals.macroMode === 'auto' ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            Auto macros stay mathematically aligned with your active calorie target and goal focus.
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            <p>
              Manual macros add up to{' '}
              <span className="font-semibold text-slate-900">{manualMacroCalories} kcal</span>.
            </p>
            <p>Editing protein, carbs, or fat updates the manual calorie total automatically.</p>
            <p>
              {Math.abs(macroDifference) <= 5
                ? 'Your calorie and macro targets are effectively in sync.'
                : `${Math.abs(macroDifference)} kcal ${macroDifference > 0 ? 'over' : 'under'} the active calorie target.`}
            </p>
            {Math.abs(macroDifference) > 5 ? (
              <button
                type="button"
                onClick={syncCaloriesToManualMacros}
                className="button-secondary w-full justify-center"
              >
                Use {manualMacroCalories} kcal as the manual calorie target
              </button>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">Units</p>
              <p className="text-sm text-slate-500">
                Switch display units anytime. Stored values stay consistent under the hood.
              </p>
            </div>
          </div>
          <AutosaveBadge status={unitsStatus} />
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
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Backup & restore</p>
            <p className="text-sm text-slate-500">
              Export everything to JSON or restore it later on the same browser or a new device.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
          Includes profile, goals, units, saved foods, custom meals, daily logs, selected date, and setup state.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="button-primary justify-center"
          >
            <Download className="h-4 w-4" />
            Export backup
          </button>
          <button
            type="button"
            onClick={triggerImportPicker}
            className="button-secondary justify-center"
            disabled={isImporting}
          >
            <Upload className="h-4 w-4" />
            {isImporting ? 'Importing…' : 'Import backup'}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImportBackup(event)}
            className="hidden"
          />
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Reset & app info</p>
            <p className="text-sm text-slate-500">
              Everything is stored locally in your browser, so resets affect only this device.
            </p>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-slate-600">
          <li>• Storage: local browser storage (`localStorage`)</li>
          <li>• Offline: view logs and add manual entries</li>
          <li>• Installable: yes, from supported mobile browsers</li>
          <li>• Food data: Search-a-licious search + Open Food Facts barcode lookup</li>
        </ul>

        <button
          type="button"
          onClick={() => void handleReset()}
          className="button-secondary w-full justify-center text-rose-600"
        >
          Reset all data
        </button>
      </Card>
    </div>
  )
}
