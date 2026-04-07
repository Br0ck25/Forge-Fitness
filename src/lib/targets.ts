import type {
  ActivityLevel,
  AppSettings,
  KetoProgram,
  MacroMode,
  WorkoutIntensity,
  WorkoutSessionType,
} from '../types'
import { roundValue } from './utils'

export const ACTIVITY_LEVEL_OPTIONS: Array<{
  id: ActivityLevel
  label: string
  description: string
  factor?: number
  example: string
}> = [
  {
    id: 'sedentary',
    label: 'Sedentary',
    description: 'Little or no physical activity, typically a desk job or minimal movement.',
    factor: 0.2,
    example: 'Office work, watching TV, and minimal walking.',
  },
  {
    id: 'lightly-active',
    label: 'Lightly active',
    description: 'Some physical activity or light training a few days per week.',
    factor: 0.375,
    example: 'Light walking, casual biking, or household chores.',
  },
  {
    id: 'moderately-active',
    label: 'Moderately active',
    description: 'On your feet more often or moderate exercise 3–5 days per week.',
    factor: 0.5,
    example: 'Gym sessions, running, or active jobs like retail.',
  },
  {
    id: 'very-active',
    label: 'Very active',
    description: 'Very physical work, hard exercise, or demanding physical training.',
    factor: 0.9,
    example: 'Athlete training blocks, construction, or manual labor.',
  },
  {
    id: 'no-activity',
    label: 'No activity',
    description: 'No baseline movement beyond the minimum resting estimate.',
    factor: 0,
    example: 'Use only when you want all activity added manually.',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Choose your own fixed daily baseline activity calories.',
    example: 'Best if you already know the activity calories you want to use.',
  },
]

export const MACRO_MODE_OPTIONS: Array<{ id: MacroMode; label: string }> = [
  { id: 'ratio', label: 'Ratios' },
  { id: 'fixed', label: 'Fixed' },
  { id: 'keto', label: 'Keto' },
]

export const KETO_PROGRAMS: Array<{
  id: KetoProgram
  label: string
  defaultCarbLimit: number
  description: string
}> = [
  {
    id: 'strict',
    label: 'Strict',
    defaultCarbLimit: 20,
    description: 'Tight carb ceiling for aggressive ketogenic tracking.',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    defaultCarbLimit: 35,
    description: 'Balanced keto setup that is easier to sustain daily.',
  },
  {
    id: 'liberal',
    label: 'Liberal',
    defaultCarbLimit: 50,
    description: 'Higher carb ceiling for training-heavy or transition phases.',
  },
]

export const WORKOUT_SESSION_TYPE_OPTIONS: Array<{
  id: WorkoutSessionType
  label: string
  description: string
  met: number
}> = [
  { id: 'strength', label: 'Strength', description: 'Weights, resistance work, lifting.', met: 5.5 },
  { id: 'cardio', label: 'Cardio', description: 'Steady-state cardio or aerobic work.', met: 7.0 },
  { id: 'hiit', label: 'HIIT', description: 'Intervals, metabolic circuits, hard hybrid classes.', met: 8.8 },
  { id: 'mobility', label: 'Mobility', description: 'Recovery flows, stretching, pilates-style mobility.', met: 2.8 },
  { id: 'mixed', label: 'Mixed', description: 'A mix of strength, cardio, and conditioning.', met: 6.2 },
]

export const WORKOUT_INTENSITY_OPTIONS: Array<{
  id: WorkoutIntensity
  label: string
  factor: number
}> = [
  { id: 'low', label: 'Low', factor: 0.9 },
  { id: 'moderate', label: 'Moderate', factor: 1 },
  { id: 'high', label: 'High', factor: 1.15 },
  { id: 'extreme', label: 'Extreme', factor: 1.3 },
]

const KCAL_PER_KG_BODYWEIGHT = 7700
const DEFAULT_GOAL_RATE_FRACTION_PER_WEEK = 0.005
const MIN_DAILY_ENERGY_TARGET_KCAL = 1200

export const getReferenceWeightKg = (
  settings: AppSettings,
  latestWeightKg?: number,
) => latestWeightKg ?? settings.profile.startWeightKg ?? settings.profile.weightGoalKg ?? 75

export const calculateBmrKcal = (weightKg: number, customBmrKcal?: number) =>
  roundValue(customBmrKcal ?? weightKg * 24, 0)

export const getActivityLevelMeta = (activityLevel: ActivityLevel) =>
  ACTIVITY_LEVEL_OPTIONS.find((option) => option.id === activityLevel) ?? ACTIVITY_LEVEL_OPTIONS[1]

export const calculateBaselineActivityCalories = (
  bmrKcal: number,
  activityLevel: ActivityLevel,
  customActivityCalories?: number,
) => {
  if (activityLevel === 'custom') {
    return roundValue(customActivityCalories ?? 0, 0)
  }

  const factor = getActivityLevelMeta(activityLevel).factor ?? 0
  return roundValue(bmrKcal * factor, 0)
}

export const calculateThermicEffectCalories = (
  bmrKcal: number,
  baselineActivityCalories: number,
  includeThermicEffect: boolean,
) => {
  if (!includeThermicEffect) {
    return 0
  }

  return roundValue((bmrKcal + baselineActivityCalories) * 0.1, 0)
}

export const calculateGoalWeeklyChangeKg = (
  referenceWeightKg: number,
  goalWeightKg?: number,
) => {
  if (goalWeightKg === undefined) {
    return 0
  }

  const remainingChangeKg = roundValue(goalWeightKg - referenceWeightKg, 2)

  if (remainingChangeKg === 0) {
    return 0
  }

  const moderateWeeklyChangeKg = referenceWeightKg * DEFAULT_GOAL_RATE_FRACTION_PER_WEEK

  return roundValue(
    Math.sign(remainingChangeKg) * Math.min(Math.abs(remainingChangeKg), moderateWeeklyChangeKg),
    2,
  )
}

export const calculateGoalAdjustmentKcal = (weeklyGoalChangeKg: number) =>
  roundValue((weeklyGoalChangeKg * KCAL_PER_KG_BODYWEIGHT) / 7, 0)

export const calculateEnergyTargetBreakdown = (
  settings: AppSettings,
  latestWeightKg?: number,
) => {
  const referenceWeightKg = getReferenceWeightKg(settings, latestWeightKg)
  const bmrKcal = calculateBmrKcal(referenceWeightKg, settings.energySettings.customBmrKcal)
  const baselineActivityCalories = calculateBaselineActivityCalories(
    bmrKcal,
    settings.energySettings.activityLevel,
    settings.energySettings.customActivityCalories,
  )
  const thermicEffectCalories = calculateThermicEffectCalories(
    bmrKcal,
    baselineActivityCalories,
    settings.energySettings.includeThermicEffect,
  )
  const baselineExpenditureKcal = roundValue(
    bmrKcal + baselineActivityCalories + thermicEffectCalories,
    0,
  )
  const weeklyGoalChangeKg =
    settings.energySettings.targetMode === 'goal'
      ? calculateGoalWeeklyChangeKg(referenceWeightKg, settings.profile.weightGoalKg)
      : 0
  const goalBasedTargetKcal = roundValue(
    Math.max(
      MIN_DAILY_ENERGY_TARGET_KCAL,
      baselineExpenditureKcal + calculateGoalAdjustmentKcal(weeklyGoalChangeKg),
    ),
    0,
  )
  const isGoalBasedTarget =
    settings.energySettings.targetMode === 'goal' && settings.profile.weightGoalKg !== undefined
  const energyTargetKcal = isGoalBasedTarget
    ? goalBasedTargetKcal
    : roundValue(settings.profile.calorieTarget, 0)
  const goalAdjustmentKcal = roundValue(energyTargetKcal - baselineExpenditureKcal, 0)

  return {
    referenceWeightKg,
    goalWeightKg: settings.profile.weightGoalKg,
    targetMode: settings.energySettings.targetMode,
    isGoalBasedTarget,
    weeklyGoalChangeKg,
    bmrKcal,
    baselineActivityCalories,
    thermicEffectCalories,
    baselineExpenditureKcal,
    energyTargetKcal,
    goalAdjustmentKcal,
  }
}

export const deriveMacroTargets = (
  settings: AppSettings,
  latestWeightKg?: number,
) => {
  const { energyTargetKcal, referenceWeightKg } = calculateEnergyTargetBreakdown(
    settings,
    latestWeightKg,
  )

  if (settings.macroSettings.mode === 'fixed') {
    const proteinGrams = roundValue(settings.macroSettings.fixedTargets.proteinGrams, 0)
    const carbsGrams = roundValue(settings.macroSettings.fixedTargets.carbsGrams, 0)
    const fatGrams = roundValue(settings.macroSettings.fixedTargets.fatGrams, 0)
    const proteinCalories = roundValue(proteinGrams * 4, 0)
    const carbsCalories = roundValue(carbsGrams * 4, 0)
    const fatCalories = roundValue(fatGrams * 9, 0)
    const totalCalories = roundValue(proteinCalories + carbsCalories + fatCalories, 0)

    return {
      mode: settings.macroSettings.mode,
      proteinGrams,
      carbsGrams,
      fatGrams,
      proteinCalories,
      carbsCalories,
      fatCalories,
      proteinPercent: energyTargetKcal ? roundValue((proteinCalories / energyTargetKcal) * 100, 1) : 0,
      carbsPercent: energyTargetKcal ? roundValue((carbsCalories / energyTargetKcal) * 100, 1) : 0,
      fatPercent: energyTargetKcal ? roundValue((fatCalories / energyTargetKcal) * 100, 1) : 0,
      ratioTotalPercent: energyTargetKcal
        ? roundValue((totalCalories / energyTargetKcal) * 100, 1)
        : 0,
      totalCalories,
      energyTargetKcal,
      referenceWeightKg,
    }
  }

  if (settings.macroSettings.mode === 'keto') {
    const proteinGrams = roundValue(referenceWeightKg * settings.macroSettings.ketoSettings.proteinPerKg, 0)
    const carbsGrams = roundValue(settings.macroSettings.ketoSettings.carbLimitGrams, 0)
    const remainingCalories = Math.max(0, energyTargetKcal - proteinGrams * 4 - carbsGrams * 4)
    const fatGrams = roundValue(remainingCalories / 9, 0)
    const proteinCalories = roundValue(proteinGrams * 4, 0)
    const carbsCalories = roundValue(carbsGrams * 4, 0)
    const fatCalories = roundValue(fatGrams * 9, 0)
    const totalCalories = roundValue(proteinCalories + carbsCalories + fatCalories, 0)

    return {
      mode: settings.macroSettings.mode,
      proteinGrams,
      carbsGrams,
      fatGrams,
      proteinCalories,
      carbsCalories,
      fatCalories,
      proteinPercent: energyTargetKcal ? roundValue((proteinCalories / energyTargetKcal) * 100, 1) : 0,
      carbsPercent: energyTargetKcal ? roundValue((carbsCalories / energyTargetKcal) * 100, 1) : 0,
      fatPercent: energyTargetKcal ? roundValue((fatCalories / energyTargetKcal) * 100, 1) : 0,
      ratioTotalPercent: energyTargetKcal
        ? roundValue((totalCalories / energyTargetKcal) * 100, 1)
        : 0,
      totalCalories,
      energyTargetKcal,
      referenceWeightKg,
    }
  }

  const proteinPercent = settings.macroSettings.ratioTargets.proteinPercent
  const carbsPercent = settings.macroSettings.ratioTargets.carbsPercent
  const fatPercent = settings.macroSettings.ratioTargets.fatPercent
  const proteinCalories = roundValue(energyTargetKcal * (proteinPercent / 100), 0)
  const carbsCalories = roundValue(energyTargetKcal * (carbsPercent / 100), 0)
  const fatCalories = roundValue(energyTargetKcal * (fatPercent / 100), 0)

  return {
    mode: settings.macroSettings.mode,
    proteinGrams: roundValue(proteinCalories / 4, 0),
    carbsGrams: roundValue(carbsCalories / 4, 0),
    fatGrams: roundValue(fatCalories / 9, 0),
    proteinCalories,
    carbsCalories,
    fatCalories,
    proteinPercent,
    carbsPercent,
    fatPercent,
    ratioTotalPercent: roundValue(proteinPercent + carbsPercent + fatPercent, 1),
    totalCalories: energyTargetKcal,
    energyTargetKcal,
    referenceWeightKg,
  }
}

export const calculateStepsDistanceKm = (steps: number, stepLengthMeters = 0.762) =>
  roundValue((steps * stepLengthMeters) / 1000, 2)

export const calculateStepsCaloriesBurned = (
  steps: number,
  weightKg: number,
  stepLengthMeters = 0.762,
) => {
  const distanceKm = calculateStepsDistanceKm(steps, stepLengthMeters)
  return roundValue(weightKg * distanceKm * 0.57, 0)
}

export const calculateWorkoutCaloriesBurned = (
  durationMinutes: number,
  weightKg: number,
  sessionType: WorkoutSessionType,
  intensity: WorkoutIntensity,
) => {
  const met =
    (WORKOUT_SESSION_TYPE_OPTIONS.find((option) => option.id === sessionType)?.met ?? 6.2) *
    (WORKOUT_INTENSITY_OPTIONS.find((option) => option.id === intensity)?.factor ?? 1)

  return roundValue((met * 3.5 * weightKg) / 200 * durationMinutes, 0)
}

export const getMacroModeLabel = (mode: MacroMode) =>
  MACRO_MODE_OPTIONS.find((option) => option.id === mode)?.label ?? 'Ratios'

export const getKetoProgramMeta = (program: KetoProgram) =>
  KETO_PROGRAMS.find((option) => option.id === program) ?? KETO_PROGRAMS[1]

export const calculateProgressPercent = (current: number, target: number) => {
  if (target <= 0) {
    return 0
  }

  return Math.min(100, roundValue((current / target) * 100, 0))
}