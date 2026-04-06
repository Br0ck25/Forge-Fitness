export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodSource = 'seeded' | 'custom' | 'barcode'
export type ThemePreference = 'system' | 'light' | 'dark'
export type WeekStartPreference = 'monday' | 'sunday'
export type WeightUnit = 'kg' | 'lb'
export type ExerciseType = 'strength' | 'cardio' | 'mobility'

export interface Food {
  id: string
  name: string
  brand?: string
  barcode?: string
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
  notes?: string
  source: FoodSource
  favorite: boolean
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
}

export interface FoodDraft {
  id?: string
  name: string
  brand?: string
  barcode?: string
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
  notes?: string
  source: FoodSource
  favorite?: boolean
  lastUsedAt?: string
}

export interface MealEntry {
  id: string
  dayKey: string
  occurredAt: string
  mealType: MealType
  servings: number
  foodId?: string
  foodName: string
  brand?: string
  barcode?: string
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WeightEntry {
  id: string
  date: string
  weightKg: number
  note?: string
  createdAt: string
  updatedAt: string
}

export interface WorkoutExerciseTemplate {
  id: string
  name: string
  type: ExerciseType
  target?: string
  defaultSets?: number
  defaultReps?: number
  defaultWeightKg?: number
  defaultDurationMinutes?: number
  note?: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  focus: string
  exercises: WorkoutExerciseTemplate[]
  createdAt: string
  updatedAt: string
}

export interface LoggedExercise {
  id: string
  name: string
  type: ExerciseType
  sets?: number
  reps?: number
  weightKg?: number
  durationMinutes?: number
  distanceKm?: number
  note?: string
}

export interface WorkoutSession {
  id: string
  templateId?: string
  name: string
  focus: string
  occurredAt: string
  exercises: LoggedExercise[]
  durationMinutes: number
  energyLevel: number
  note?: string
  totalVolumeKg: number
  createdAt: string
}

export interface Profile {
  name: string
  calorieTarget: number
  proteinTarget: number
  weightGoalKg?: number
  unit: WeightUnit
}

export interface AppSettings {
  theme: ThemePreference
  weekStartsOn: WeekStartPreference
  onboardingComplete: boolean
  profile: Profile
}

export interface SettingRecord<TValue> {
  key: string
  value: TValue
  updatedAt: string
}

export interface AddMealEntryInput {
  food: Food
  mealType: MealType
  servings: number
  occurredAt: string
  notes?: string
}

export interface WeightEntryDraft {
  date: string
  weightKg: number
  note?: string
}

export interface WorkoutTemplateDraft {
  id?: string
  name: string
  focus: string
  exercises: WorkoutExerciseTemplate[]
}

export interface WorkoutSessionDraft {
  id?: string
  templateId?: string
  name: string
  focus: string
  occurredAt: string
  exercises: LoggedExercise[]
  durationMinutes: number
  energyLevel: number
  note?: string
}

export interface AppBackup {
  version: number
  exportedAt: string
  foods: Food[]
  mealEntries: MealEntry[]
  weightEntries: WeightEntry[]
  workoutTemplates: WorkoutTemplate[]
  workoutSessions: WorkoutSession[]
  settings: SettingRecord<AppSettings>
}