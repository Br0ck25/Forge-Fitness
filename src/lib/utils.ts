import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  parseISO,
  subDays,
} from 'date-fns'
import type {
  LoggedExercise,
  MealEntry,
  MealType,
  WeightUnit,
} from '../types'

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

const DEFAULT_MEAL_TIMES: Record<MealType, string> = {
  breakfast: '08:00',
  lunch: '12:30',
  dinner: '18:30',
  snack: '15:30',
}

export const roundValue = (value: number, digits = 1) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export const cleanBarcode = (value: string) => value.replace(/\D/g, '')

export const toDayKey = (value: Date | string) => {
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, 'yyyy-MM-dd')
}

export const formatShortDate = (value: Date | string) => {
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, 'MMM d')
}

export const formatLongDate = (value: Date | string) => {
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, 'EEEE, MMM d')
}

export const formatDateTime = (value: Date | string) => {
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, 'MMM d, h:mm a')
}

export const friendlyRelativeTime = (value: string) =>
  formatDistanceToNow(parseISO(value), { addSuffix: true })

export const createMealTimestamp = (dayKey: string, mealType: MealType) => {
  const time = DEFAULT_MEAL_TIMES[mealType]
  return new Date(`${dayKey}T${time}:00`).toISOString()
}

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const coerceNumber = (value: string | number | undefined) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const sumMealMacros = (entries: MealEntry[]) =>
  entries.reduce(
    (totals, entry) => ({
      calories: roundValue(totals.calories + entry.calories * entry.servings),
      protein: roundValue(totals.protein + entry.protein * entry.servings),
      carbs: roundValue(totals.carbs + entry.carbs * entry.servings),
      fat: roundValue(totals.fat + entry.fat * entry.servings),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

export const toDisplayWeight = (weightKg: number, unit: WeightUnit) =>
  unit === 'lb' ? weightKg * 2.2046226218 : weightKg

export const fromDisplayWeight = (weightValue: number, unit: WeightUnit) =>
  unit === 'lb' ? weightValue / 2.2046226218 : weightValue

export const formatWeight = (
  weightKg: number,
  unit: WeightUnit,
  digits = 1,
) => `${roundValue(toDisplayWeight(weightKg, unit), digits).toFixed(digits)} ${unit}`

export const getDistanceUnit = (unit: WeightUnit) => (unit === 'lb' ? 'mi' : 'km')

export const toDisplayDistance = (distanceKm: number, unit: WeightUnit) =>
  unit === 'lb' ? distanceKm * 0.6213711922 : distanceKm

export const fromDisplayDistance = (distanceValue: number, unit: WeightUnit) =>
  unit === 'lb' ? distanceValue / 0.6213711922 : distanceValue

export const formatDistance = (
  distanceKm: number,
  unit: WeightUnit,
  digits = 1,
) => `${roundValue(toDisplayDistance(distanceKm, unit), digits).toFixed(digits)} ${getDistanceUnit(unit)}`

export const calculateWorkoutVolume = (exercises: LoggedExercise[]) =>
  roundValue(
    exercises.reduce((total, exercise) => {
      if (exercise.type !== 'strength') {
        return total
      }

      return (
        total +
        (exercise.sets ?? 0) *
          (exercise.reps ?? 0) *
          (exercise.weightKg ?? 0)
      )
    }, 0),
    0,
  )

export const calculateConsistencyStreak = (dayKeys: string[]) => {
  if (dayKeys.length === 0) {
    return 0
  }

  const uniqueDays = new Set(dayKeys)
  let cursor = new Date()
  const todayKey = toDayKey(cursor)
  const yesterday = subDays(cursor, 1)

  if (!uniqueDays.has(todayKey)) {
    if (uniqueDays.has(toDayKey(yesterday))) {
      cursor = yesterday
    } else {
      return 0
    }
  }

  let streak = 0

  while (uniqueDays.has(toDayKey(cursor))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }

  return streak
}

export const describeWeightDelta = (currentKg: number, previousKg?: number) => {
  if (previousKg === undefined) {
    return 'No previous weigh-in yet.'
  }

  const delta = roundValue(currentKg - previousKg, 1)

  if (delta === 0) {
    return 'Holding steady from the last log.'
  }

  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg from the previous log.`
}

export const describeDayGap = (currentDayKey: string, comparisonDayKey?: string) => {
  if (!comparisonDayKey) {
    return 'First data point'
  }

  const gap = Math.abs(
    differenceInCalendarDays(parseISO(currentDayKey), parseISO(comparisonDayKey)),
  )

  return gap === 0 ? 'Same day update' : `${gap} day${gap === 1 ? '' : 's'} apart`
}