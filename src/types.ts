export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodSource = 'seeded' | 'custom' | 'barcode' | 'search'
export type ThemePreference = 'system' | 'light' | 'dark'
export type WeekStartPreference = 'monday' | 'sunday'
export type WeightUnit = 'kg' | 'lb'
export type ExerciseType = 'strength' | 'cardio' | 'mobility'
export type ActivityLevel =
  | 'no-activity'
  | 'sedentary'
  | 'lightly-active'
  | 'moderately-active'
  | 'very-active'
  | 'custom'
export type EnergyTargetMode = 'manual' | 'goal'
export type MacroMode = 'ratio' | 'fixed' | 'keto'
export type KetoProgram = 'strict' | 'moderate' | 'liberal'
export type WorkoutSessionType = 'strength' | 'cardio' | 'hiit' | 'mobility' | 'mixed'
export type WorkoutIntensity = 'low' | 'moderate' | 'high' | 'extreme'

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
  programName?: string
  phaseName?: string
  dayLabel?: string
  sessionType?: WorkoutSessionType
  intensity?: WorkoutIntensity
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
  programName?: string
  phaseName?: string
  dayLabel?: string
  sessionType?: WorkoutSessionType
  intensity?: WorkoutIntensity
  occurredAt: string
  exercises: LoggedExercise[]
  durationMinutes: number
  energyLevel: number
  caloriesBurned?: number
  note?: string
  totalVolumeKg: number
  createdAt: string
}

export interface Profile {
  name: string
  calorieTarget: number
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
  startWeightKg?: number
  weightGoalKg?: number
  unit: WeightUnit
}

export interface EnergySettings {
  targetMode: EnergyTargetMode
  activityLevel: ActivityLevel
  customActivityCalories?: number
  customBmrKcal?: number
  includeThermicEffect: boolean
}

export interface MacroRatioTargets {
  proteinPercent: number
  carbsPercent: number
  fatPercent: number
}

export interface FixedMacroTargets {
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

export interface KetoMacroSettings {
  program: KetoProgram
  proteinPerKg: number
  carbLimitGrams: number
}

export interface MacroSettings {
  mode: MacroMode
  ratioTargets: MacroRatioTargets
  fixedTargets: FixedMacroTargets
  ketoSettings: KetoMacroSettings
}

export interface AppSettings {
  theme: ThemePreference
  weekStartsOn: WeekStartPreference
  onboardingComplete: boolean
  profile: Profile
  energySettings: EnergySettings
  macroSettings: MacroSettings
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

export interface StepsEntry {
  id: string
  date: string
  steps: number
  caloriesBurned: number
  note?: string
  createdAt: string
  updatedAt: string
}

export interface StepsEntryDraft {
  date: string
  steps: number
  note?: string
  referenceWeightKg?: number
  stepLengthMeters?: number
}

export interface WorkoutTemplateDraft {
  id?: string
  name: string
  focus: string
  programName?: string
  phaseName?: string
  dayLabel?: string
  sessionType?: WorkoutSessionType
  intensity?: WorkoutIntensity
  exercises: WorkoutExerciseTemplate[]
}

export interface WorkoutSessionDraft {
  id?: string
  templateId?: string
  name: string
  focus: string
  programName?: string
  phaseName?: string
  dayLabel?: string
  sessionType?: WorkoutSessionType
  intensity?: WorkoutIntensity
  occurredAt: string
  exercises: LoggedExercise[]
  durationMinutes: number
  energyLevel: number
  calorieOverride?: number
  referenceWeightKg?: number
  note?: string
}

export interface AppBackup {
  version: number
  exportedAt: string
  foods: Food[]
  mealEntries: MealEntry[]
  weightEntries: WeightEntry[]
  stepsEntries: StepsEntry[]
  workoutTemplates: WorkoutTemplate[]
  workoutSessions: WorkoutSession[]
  settings: SettingRecord<AppSettings>
}