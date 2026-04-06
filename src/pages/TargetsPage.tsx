import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Footprints, Gauge, Save, Scale, Sparkles, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { db } from '../lib/db'
import {
  ACTIVITY_LEVEL_OPTIONS,
  KETO_PROGRAMS,
  MACRO_MODE_OPTIONS,
  calculateEnergyTargetBreakdown,
  deriveMacroTargets,
  getActivityLevelMeta,
} from '../lib/targets'
import { formatWeight, roundValue } from '../lib/utils'
import type { ActivityLevel, AppSettings, KetoProgram, MacroMode } from '../types'

interface TargetsPageProps {
  settings: AppSettings
  onSaveSettings: (updates: Partial<AppSettings>) => Promise<void>
}

export function TargetsPage({ settings, onSaveSettings }: TargetsPageProps) {
  const latestWeight = useLiveQuery(() => db.weightEntries.orderBy('date').last(), [], undefined)
  const [calorieTarget, setCalorieTarget] = useState(String(settings.profile.calorieTarget))
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    settings.energySettings.activityLevel,
  )
  const [customActivityCalories, setCustomActivityCalories] = useState(
    settings.energySettings.customActivityCalories
      ? String(settings.energySettings.customActivityCalories)
      : '',
  )
  const [customBmrKcal, setCustomBmrKcal] = useState(
    settings.energySettings.customBmrKcal ? String(settings.energySettings.customBmrKcal) : '',
  )
  const [includeThermicEffect, setIncludeThermicEffect] = useState(
    settings.energySettings.includeThermicEffect,
  )
  const [macroMode, setMacroMode] = useState<MacroMode>(settings.macroSettings.mode)
  const [proteinPercent, setProteinPercent] = useState(
    String(settings.macroSettings.ratioTargets.proteinPercent),
  )
  const [carbsPercent, setCarbsPercent] = useState(
    String(settings.macroSettings.ratioTargets.carbsPercent),
  )
  const [fatPercent, setFatPercent] = useState(String(settings.macroSettings.ratioTargets.fatPercent))
  const [proteinGrams, setProteinGrams] = useState(
    String(settings.macroSettings.fixedTargets.proteinGrams),
  )
  const [carbsGrams, setCarbsGrams] = useState(String(settings.macroSettings.fixedTargets.carbsGrams))
  const [fatGrams, setFatGrams] = useState(String(settings.macroSettings.fixedTargets.fatGrams))
  const [ketoProgram, setKetoProgram] = useState<KetoProgram>(
    settings.macroSettings.ketoSettings.program,
  )
  const [proteinPerKg, setProteinPerKg] = useState(
    String(settings.macroSettings.ketoSettings.proteinPerKg),
  )
  const [carbLimitGrams, setCarbLimitGrams] = useState(
    String(settings.macroSettings.ketoSettings.carbLimitGrams),
  )
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const referenceWeightKg = latestWeight?.weightKg ?? settings.profile.startWeightKg

  const previewSettings = useMemo<AppSettings>(
    () => ({
      ...settings,
      profile: {
        ...settings.profile,
        calorieTarget: Math.max(1200, Number(calorieTarget) || settings.profile.calorieTarget),
      },
      energySettings: {
        ...settings.energySettings,
        activityLevel,
        customActivityCalories:
          activityLevel === 'custom'
            ? Number(customActivityCalories) || undefined
            : undefined,
        customBmrKcal: Number(customBmrKcal) || undefined,
        includeThermicEffect,
      },
      macroSettings: {
        ...settings.macroSettings,
        mode: macroMode,
        ratioTargets: {
          proteinPercent: Number(proteinPercent) || 0,
          carbsPercent: Number(carbsPercent) || 0,
          fatPercent: Number(fatPercent) || 0,
        },
        fixedTargets: {
          proteinGrams: Number(proteinGrams) || 0,
          carbsGrams: Number(carbsGrams) || 0,
          fatGrams: Number(fatGrams) || 0,
        },
        ketoSettings: {
          program: ketoProgram,
          proteinPerKg: Number(proteinPerKg) || settings.macroSettings.ketoSettings.proteinPerKg,
          carbLimitGrams:
            Number(carbLimitGrams) || settings.macroSettings.ketoSettings.carbLimitGrams,
        },
      },
    }),
    [
      activityLevel,
      calorieTarget,
      carbLimitGrams,
      carbsGrams,
      carbsPercent,
      customActivityCalories,
      customBmrKcal,
      fatGrams,
      fatPercent,
      includeThermicEffect,
      ketoProgram,
      macroMode,
      proteinGrams,
      proteinPerKg,
      proteinPercent,
      settings,
    ],
  )

  const energyBreakdown = useMemo(
    () => calculateEnergyTargetBreakdown(previewSettings, referenceWeightKg),
    [previewSettings, referenceWeightKg],
  )

  const macroTargets = useMemo(
    () => deriveMacroTargets(previewSettings, referenceWeightKg),
    [previewSettings, referenceWeightKg],
  )

  const ratioTotal =
    (Number(proteinPercent) || 0) + (Number(carbsPercent) || 0) + (Number(fatPercent) || 0)

  const selectedActivityMeta = getActivityLevelMeta(activityLevel)
  const selectedKetoMeta =
    KETO_PROGRAMS.find((program) => program.id === ketoProgram) ?? KETO_PROGRAMS[1]

  const handleSave = async () => {
    if (macroMode === 'ratio' && ratioTotal !== 100) {
      setFeedback({
        type: 'error',
        text: 'Ratio mode needs protein, carbs, and fat to add up to 100%.',
      })
      return
    }

    await onSaveSettings({
      onboardingComplete: true,
      profile: {
        ...settings.profile,
        calorieTarget: previewSettings.profile.calorieTarget,
        proteinTarget: macroTargets.proteinGrams,
        carbsTarget: macroTargets.carbsGrams,
        fatTarget: macroTargets.fatGrams,
      },
      energySettings: previewSettings.energySettings,
      macroSettings: previewSettings.macroSettings,
    })

    setFeedback({
      type: 'success',
      text: 'Targets updated. Your meals, dashboard, and workout energy estimates will use the new setup.',
    })
  }

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Targets"
        title="Set the engine, not just the dashboard"
        description="Dial in baseline activity, energy targets, and macro mode so Forge Fitness can show useful calorie and macro guidance instead of guesswork."
        actions={
          <Link to="/settings" className="button button-ghost">
            Back to settings
          </Link>
        }
      />

      <div className="metric-grid">
        <article className="metric-card accent-card">
          <span className="metric-label">Energy target</span>
          <strong className="metric-value">{energyBreakdown.energyTargetKcal}</strong>
          <span className="metric-hint">Calories per day</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Baseline expenditure</span>
          <strong className="metric-value">{energyBreakdown.baselineExpenditureKcal}</strong>
          <span className="metric-hint">BMR + activity + thermic effect</span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Goal adjustment</span>
          <strong className="metric-value">
            {energyBreakdown.goalAdjustmentKcal > 0 ? '+' : ''}
            {energyBreakdown.goalAdjustmentKcal}
          </strong>
          <span className="metric-hint">
            {energyBreakdown.goalAdjustmentKcal >= 0 ? 'Surplus vs baseline' : 'Deficit vs baseline'}
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Macro mode</span>
          <strong className="metric-value">{MACRO_MODE_OPTIONS.find((item) => item.id === macroMode)?.label}</strong>
          <span className="metric-hint">
            {macroTargets.proteinGrams}p / {macroTargets.carbsGrams}c / {macroTargets.fatGrams}f
          </span>
        </article>

        <article className="metric-card">
          <span className="metric-label">Reference weight</span>
          <strong className="metric-value">
            {formatWeight(energyBreakdown.referenceWeightKg, settings.profile.unit)}
          </strong>
          <span className="metric-hint">
            {latestWeight
              ? 'Using your most recent weigh-in'
              : settings.profile.startWeightKg
                ? 'Using your saved start weight'
                : 'Using your goal/default weight'}
          </span>
        </article>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.type === 'error' ? 'notice-error' : 'notice-success'}`}>
          {feedback.text}
        </div>
      ) : null}

      <div className="grid grid-two">
        <SectionCard
          title="Energy target"
          description="Pick how much baseline movement you want counted automatically before steps and workouts are added on top."
          action={
            <span className="chip">
              <Gauge size={16} /> {selectedActivityMeta.label}
            </span>
          }
        >
          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="targets-calories">Daily energy target</label>
              <input
                id="targets-calories"
                type="number"
                min="1200"
                step="25"
                value={calorieTarget}
                onChange={(event) => setCalorieTarget(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="targets-activity-level">Baseline activity</label>
              <select
                id="targets-activity-level"
                value={activityLevel}
                onChange={(event) => setActivityLevel(event.target.value as ActivityLevel)}
              >
                {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="subtle-text">{selectedActivityMeta.description}</p>
          <p className="subtle-text">Example: {selectedActivityMeta.example}</p>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="targets-custom-bmr">Custom BMR (optional)</label>
              <input
                id="targets-custom-bmr"
                type="number"
                min="0"
                step="10"
                placeholder="Auto uses 24 × bodyweight in kg"
                value={customBmrKcal}
                onChange={(event) => setCustomBmrKcal(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="targets-custom-activity">Custom activity calories</label>
              <input
                id="targets-custom-activity"
                type="number"
                min="0"
                step="10"
                disabled={activityLevel !== 'custom'}
                placeholder={activityLevel === 'custom' ? 'e.g. 350' : 'Enable custom activity first'}
                value={customActivityCalories}
                onChange={(event) => setCustomActivityCalories(event.target.value)}
              />
            </div>
          </div>

          <label className="checkbox-row" htmlFor="targets-thermic-effect">
            <input
              id="targets-thermic-effect"
              type="checkbox"
              checked={includeThermicEffect}
              onChange={(event) => setIncludeThermicEffect(event.target.checked)}
            />
            Include estimated thermic effect of food in the baseline calculation
          </label>
        </SectionCard>

        <SectionCard
          title="Energy target breakdown"
          description="A quick preview of how the daily calorie target is being assembled."
          action={
            <span className="chip">
              <Flame size={16} /> {energyBreakdown.energyTargetKcal} kcal
            </span>
          }
        >
          <div className="summary-list">
            <div className="summary-row">
              <span>BMR estimate</span>
              <strong>{energyBreakdown.bmrKcal} kcal</strong>
            </div>
            <div className="summary-row">
              <span>Baseline activity</span>
              <strong>{energyBreakdown.baselineActivityCalories} kcal</strong>
            </div>
            <div className="summary-row">
              <span>Thermic effect</span>
              <strong>{energyBreakdown.thermicEffectCalories} kcal</strong>
            </div>
            <div className="summary-row">
              <span>Baseline expenditure</span>
              <strong>{energyBreakdown.baselineExpenditureKcal} kcal</strong>
            </div>
            <div className="summary-row">
              <span>Target adjustment</span>
              <strong>
                {energyBreakdown.goalAdjustmentKcal > 0 ? '+' : ''}
                {energyBreakdown.goalAdjustmentKcal} kcal
              </strong>
            </div>
          </div>

          <div className="notice notice-success">
            <Sparkles size={18} />
            Steps and logged workouts stack on top of this baseline, which makes it easier to tell
            the difference between your default activity and deliberate exercise.
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-two">
        <SectionCard
          title="Macro target mode"
          description="Choose a flexible ratio setup, fixed grams, or a keto-style preset."
          action={
            <span className="chip">
              <Target size={16} /> {MACRO_MODE_OPTIONS.find((item) => item.id === macroMode)?.label}
            </span>
          }
        >
          <div className="segmented-control">
            {MACRO_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`segmented-button ${macroMode === option.id ? 'active' : ''}`}
                onClick={() => setMacroMode(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {macroMode === 'ratio' ? (
            <>
              <div className="field-grid three-up">
                <div className="field">
                  <label htmlFor="ratio-protein">Protein %</label>
                  <input
                    id="ratio-protein"
                    type="number"
                    min="0"
                    max="100"
                    value={proteinPercent}
                    onChange={(event) => setProteinPercent(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ratio-carbs">Carbs %</label>
                  <input
                    id="ratio-carbs"
                    type="number"
                    min="0"
                    max="100"
                    value={carbsPercent}
                    onChange={(event) => setCarbsPercent(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ratio-fat">Fat %</label>
                  <input
                    id="ratio-fat"
                    type="number"
                    min="0"
                    max="100"
                    value={fatPercent}
                    onChange={(event) => setFatPercent(event.target.value)}
                  />
                </div>
              </div>

              <div className={`notice ${ratioTotal === 100 ? 'notice-success' : 'notice-error'}`}>
                Total ratio: {ratioTotal}%
              </div>
            </>
          ) : null}

          {macroMode === 'fixed' ? (
            <div className="field-grid three-up">
              <div className="field">
                <label htmlFor="fixed-protein">Protein grams</label>
                <input
                  id="fixed-protein"
                  type="number"
                  min="0"
                  step="1"
                  value={proteinGrams}
                  onChange={(event) => setProteinGrams(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="fixed-carbs">Carbs grams</label>
                <input
                  id="fixed-carbs"
                  type="number"
                  min="0"
                  step="1"
                  value={carbsGrams}
                  onChange={(event) => setCarbsGrams(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="fixed-fat">Fat grams</label>
                <input
                  id="fixed-fat"
                  type="number"
                  min="0"
                  step="1"
                  value={fatGrams}
                  onChange={(event) => setFatGrams(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          {macroMode === 'keto' ? (
            <>
              <div className="field-grid two-up">
                <div className="field">
                  <label htmlFor="keto-program">Keto preset</label>
                  <select
                    id="keto-program"
                    value={ketoProgram}
                    onChange={(event) => {
                      const nextProgram = event.target.value as KetoProgram
                      const preset = KETO_PROGRAMS.find((item) => item.id === nextProgram)
                      setKetoProgram(nextProgram)
                      if (preset) {
                        setCarbLimitGrams(String(preset.defaultCarbLimit))
                      }
                    }}
                  >
                    {KETO_PROGRAMS.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="keto-protein-per-kg">Protein grams per kg</label>
                  <input
                    id="keto-protein-per-kg"
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={proteinPerKg}
                    onChange={(event) => setProteinPerKg(event.target.value)}
                  />
                </div>
              </div>

              <div className="field-grid two-up">
                <div className="field">
                  <label htmlFor="keto-carb-limit">Carb limit grams</label>
                  <input
                    id="keto-carb-limit"
                    type="number"
                    min="0"
                    step="1"
                    value={carbLimitGrams}
                    onChange={(event) => setCarbLimitGrams(event.target.value)}
                  />
                </div>

                <article className="option-card compact-option-card">
                  <strong>{selectedKetoMeta.label} preset</strong>
                  <p>{selectedKetoMeta.description}</p>
                  <span className="chip">Default carb limit {selectedKetoMeta.defaultCarbLimit}g</span>
                </article>
              </div>
            </>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Macro preview"
          description="What the selected mode resolves to at your current calorie target."
          action={
            <span className="chip">
              <Footprints size={16} /> Based on {formatWeight(macroTargets.referenceWeightKg, settings.profile.unit)}
            </span>
          }
        >
          <div className="macro-target-grid">
            <article className="food-card">
              <div className="food-card-top">
                <div>
                  <h3>Protein</h3>
                  <p>{roundValue(macroTargets.proteinPercent, 1)}% of calories</p>
                </div>
                <span className="chip">{macroTargets.proteinGrams} g</span>
              </div>
            </article>

            <article className="food-card">
              <div className="food-card-top">
                <div>
                  <h3>Carbs</h3>
                  <p>{roundValue(macroTargets.carbsPercent, 1)}% of calories</p>
                </div>
                <span className="chip">{macroTargets.carbsGrams} g</span>
              </div>
            </article>

            <article className="food-card">
              <div className="food-card-top">
                <div>
                  <h3>Fat</h3>
                  <p>{roundValue(macroTargets.fatPercent, 1)}% of calories</p>
                </div>
                <span className="chip">{macroTargets.fatGrams} g</span>
              </div>
            </article>
          </div>

          <div className="summary-list compact-summary-list">
            <div className="summary-row">
              <span>Total calories from macros</span>
              <strong>{macroTargets.totalCalories} kcal</strong>
            </div>
            <div className="summary-row">
              <span>Saved protein / carbs / fat targets</span>
              <strong>
                {macroTargets.proteinGrams}g / {macroTargets.carbsGrams}g / {macroTargets.fatGrams}g
              </strong>
            </div>
            <div className="summary-row">
              <span>Reference weight</span>
              <strong>
                <Scale size={16} /> {formatWeight(macroTargets.referenceWeightKg, settings.profile.unit)}
              </strong>
            </div>
          </div>

          <button type="button" className="button button-primary" onClick={() => void handleSave()}>
            <Save size={18} /> Save targets
          </button>
        </SectionCard>
      </div>
    </div>
  )
}
