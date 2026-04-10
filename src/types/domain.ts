export const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks'] as const

export type MealKey = (typeof MEAL_ORDER)[number]
export type Sex = 'female' | 'male' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'athlete'
export type GoalAdjustment = 'lose' | 'maintain' | 'gain'
export type WeightUnit = 'kg' | 'lb'
export type HeightUnit = 'cm' | 'ft-in'
export type CalorieMode = 'auto' | 'manual'
export type FoodSource = 'manual' | 'api' | 'favorite' | 'custom-meal'
export type LogSourceType = 'food' | 'favorite' | 'meal'

export interface NutritionValues {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface FoodDraft extends NutritionValues {
  name: string
  brand?: string
  servingSize: string
  barcode?: string
  imageUrl?: string
  source: FoodSource
  incompleteNutrition?: boolean
  notes?: string
}

export interface FavoriteFood extends FoodDraft {
  id: string
  custom: boolean
  createdAt: number
  updatedAt: number
}

export interface CustomMealItem {
  id: string
  quantity: number
  food: FoodDraft
}

export interface CustomMeal {
  id: string
  name: string
  items: CustomMealItem[]
  totals: NutritionValues
  servingSize: string
  createdAt: number
  updatedAt: number
}

export interface LogEntry {
  id: string
  date: string
  meal: MealKey
  quantity: number
  item: FoodDraft
  sourceType: LogSourceType
  favoriteId?: string
  mealId?: string
  createdAt: number
  updatedAt: number
}

export interface Profile {
  age?: number
  sex?: Sex
  heightCm?: number
  weightKg?: number
  activityLevel?: ActivityLevel
}

export interface GoalSettings {
  calorieMode: CalorieMode
  calorieGoal: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
  goalAdjustment: GoalAdjustment
}

export interface UnitSettings {
  weight: WeightUnit
  height: HeightUnit
}

export interface AppSettingsRecord {
  id: 'app-settings'
  profile: Profile
  goals: GoalSettings
  units: UnitSettings
  preferredMeal: MealKey
  updatedAt: number
}

export interface ResolvedGoals extends NutritionValues {
  source: CalorieMode
  suggestedCalories?: number
  goalAdjustment: GoalAdjustment
}

export interface DailySummary {
  consumed: NutritionValues
  remaining: NutritionValues
  progress: NutritionValues
  calorieTarget: number
}

export const mealLabels: Record<MealKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

export const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  very: 'Very active',
  athlete: 'Athlete / intense training',
}

export const goalAdjustmentLabels: Record<GoalAdjustment, string> = {
  lose: 'Lose fat',
  maintain: 'Maintain',
  gain: 'Gain muscle',
}
