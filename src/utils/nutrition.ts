import type { CustomMealItem, FoodDraft, LogEntry, NutritionValues } from '../types/domain'

export function emptyNutrition(): NutritionValues {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 }
}

export function sanitizeNutrition(values: NutritionValues): NutritionValues {
  return {
    calories: Math.max(0, Math.round(values.calories)),
    protein: Math.max(0, Math.round(values.protein * 10) / 10),
    carbs: Math.max(0, Math.round(values.carbs * 10) / 10),
    fat: Math.max(0, Math.round(values.fat * 10) / 10),
  }
}

export function scaleNutrition(values: NutritionValues, quantity: number): NutritionValues {
  return sanitizeNutrition({
    calories: values.calories * quantity,
    protein: values.protein * quantity,
    carbs: values.carbs * quantity,
    fat: values.fat * quantity,
  })
}

export function sumNutrition(values: NutritionValues[]) {
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

export function getLogEntryNutrition(entry: LogEntry) {
  return scaleNutrition(entry.item, entry.quantity)
}

export function calculateCustomMealTotals(items: CustomMealItem[]) {
  return sumNutrition(items.map((item) => scaleNutrition(item.food, item.quantity)))
}

export function hasAnyNutrition(food: FoodDraft) {
  return food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fat > 0
}

export function parsePositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}
