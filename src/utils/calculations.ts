import type {
  AppSettingsRecord,
  DailySummary,
  GoalAdjustment,
  LogEntry,
  NutritionValues,
  Profile,
  ResolvedGoals,
} from '../types/domain'
import { emptyNutrition, getLogEntryNutrition, sanitizeNutrition } from './nutrition'

const activityMultiplierMap = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
} as const

const goalAdjustmentMap: Record<GoalAdjustment, number> = {
  lose: -350,
  maintain: 0,
  gain: 250,
}

export function isProfileComplete(profile: Profile) {
  return Boolean(
    profile.age &&
      profile.age > 0 &&
      profile.sex &&
      profile.heightCm &&
      profile.heightCm > 0 &&
      profile.weightKg &&
      profile.weightKg > 0 &&
      profile.activityLevel,
  )
}

export function calculateBmr(profile: Profile) {
  if (!isProfileComplete(profile)) {
    return undefined
  }

  const sexOffset =
    profile.sex === 'male' ? 5 : profile.sex === 'female' ? -161 : -78

  return Math.round(
    10 * profile.weightKg! + 6.25 * profile.heightCm! - 5 * profile.age! + sexOffset,
  )
}

export function calculateTdee(profile: Profile) {
  const bmr = calculateBmr(profile)
  if (!bmr || !profile.activityLevel) {
    return undefined
  }

  return Math.round(bmr * activityMultiplierMap[profile.activityLevel])
}

export function calculateSuggestedCalories(profile: Profile, goalAdjustment: GoalAdjustment) {
  const tdee = calculateTdee(profile)
  if (!tdee) {
    return undefined
  }

  return Math.max(1200, Math.round(tdee + goalAdjustmentMap[goalAdjustment]))
}

export function resolveGoals(settings: AppSettingsRecord): ResolvedGoals {
  const suggestedCalories = calculateSuggestedCalories(
    settings.profile,
    settings.goals.goalAdjustment,
  )

  const calories =
    settings.goals.calorieMode === 'auto' && suggestedCalories
      ? suggestedCalories
      : settings.goals.calorieGoal

  return {
    calories,
    protein: settings.goals.proteinGoal,
    carbs: settings.goals.carbsGoal,
    fat: settings.goals.fatGoal,
    suggestedCalories,
    source:
      settings.goals.calorieMode === 'auto' && suggestedCalories ? 'auto' : 'manual',
    goalAdjustment: settings.goals.goalAdjustment,
  }
}

function safeProgress(consumed: number, target: number) {
  if (target <= 0) {
    return 0
  }

  return Math.min(100, Math.round((consumed / target) * 100))
}

export function calculateDailySummary(
  entries: LogEntry[],
  goals: ResolvedGoals,
): DailySummary {
  const consumed = sanitizeNutrition(
    entries.reduce(
      (accumulator, entry) => {
        const nutrition = getLogEntryNutrition(entry)
        return {
          calories: accumulator.calories + nutrition.calories,
          protein: accumulator.protein + nutrition.protein,
          carbs: accumulator.carbs + nutrition.carbs,
          fat: accumulator.fat + nutrition.fat,
        }
      },
      emptyNutrition(),
    ),
  )

  const remaining = {
    calories: Math.round(goals.calories - consumed.calories),
    protein: Math.round((goals.protein - consumed.protein) * 10) / 10,
    carbs: Math.round((goals.carbs - consumed.carbs) * 10) / 10,
    fat: Math.round((goals.fat - consumed.fat) * 10) / 10,
  }

  return {
    consumed,
    remaining,
    progress: {
      calories: safeProgress(consumed.calories, goals.calories),
      protein: safeProgress(consumed.protein, goals.protein),
      carbs: safeProgress(consumed.carbs, goals.carbs),
      fat: safeProgress(consumed.fat, goals.fat),
    },
    calorieTarget: goals.calories,
  }
}

export function formatNutritionLabel(label: string, value: number, unit = 'g') {
  return `${label} ${Math.round(value * 10) / 10}${unit}`
}

export function sumNutritionValues(values: NutritionValues[]) {
  return sanitizeNutrition(
    values.reduce(
      (accumulator, value) => ({
        calories: accumulator.calories + value.calories,
        protein: accumulator.protein + value.protein,
        carbs: accumulator.carbs + value.carbs,
        fat: accumulator.fat + value.fat,
      }),
      emptyNutrition(),
    ),
  )
}
