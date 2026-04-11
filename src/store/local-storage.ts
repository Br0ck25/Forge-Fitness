import type {
  AppSettingsRecord,
  CustomMeal,
  CustomMealItem,
  FavoriteFood,
  FoodDraft,
  LogEntry,
  MealKey,
  WeightEntry,
} from '../types/domain'
import { MEAL_ORDER } from '../types/domain'

export const SETTINGS_ID = 'app-settings' as const
export const PERSISTED_STATE_KEY = 'forge-fitness:app-state:v1'

export interface PersistedAppState {
  settings: AppSettingsRecord
  favorites: FavoriteFood[]
  customMeals: CustomMeal[]
  logEntries: LogEntry[]
  weightEntries: WeightEntry[]
}

export function defaultSettings(): AppSettingsRecord {
  return {
    id: SETTINGS_ID,
    profile: {},
    goals: {
      calorieMode: 'auto',
      macroMode: 'auto',
      calorieGoal: 2000,
      proteinGoal: 150,
      carbsGoal: 200,
      fatGoal: 65,
      goalAdjustment: 'maintain',
    },
    units: {
      weight: 'kg',
      height: 'cm',
    },
    backupReminder: 'off',
    backupReminderLastShownDate: undefined,
    preferredMeal: 'snacks',
    updatedAt: Date.now(),
  }
}

export function createDefaultPersistedState(): PersistedAppState {
  return {
    settings: defaultSettings(),
    favorites: [],
    customMeals: [],
    logEntries: [],
    weightEntries: [],
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toNonNegativeNumber(value: unknown, fallback: number) {
  const parsed = toNumber(value, fallback)
  return parsed >= 0 ? parsed : fallback
}

function toPositiveNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function toRequiredText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function toMealKey(value: unknown, fallback: MealKey) {
  return typeof value === 'string' && MEAL_ORDER.includes(value as MealKey)
    ? (value as MealKey)
    : fallback
}

function toFoodSource(value: unknown, fallback: FoodDraft['source']) {
  return value === 'api' || value === 'favorite' || value === 'custom-meal' || value === 'manual'
    ? value
    : fallback
}

function toLogSourceType(value: unknown, fallback: LogEntry['sourceType']) {
  return value === 'favorite' || value === 'meal' || value === 'food' ? value : fallback
}

function normalizeSettings(value: unknown): AppSettingsRecord {
  const defaults = defaultSettings()
  if (!isPlainObject(value)) {
    return defaults
  }

  const goals = isPlainObject(value.goals) ? value.goals : {}
  const units = isPlainObject(value.units) ? value.units : {}
  const profile = isPlainObject(value.profile) ? value.profile : {}

  return {
    id: SETTINGS_ID,
    profile: {
      age: typeof profile.age === 'number' ? profile.age : undefined,
      sex:
        profile.sex === 'female' || profile.sex === 'male' || profile.sex === 'other'
          ? profile.sex
          : undefined,
      heightCm: typeof profile.heightCm === 'number' ? profile.heightCm : undefined,
      weightKg: typeof profile.weightKg === 'number' ? profile.weightKg : undefined,
      activityLevel:
        profile.activityLevel === 'sedentary' ||
        profile.activityLevel === 'light' ||
        profile.activityLevel === 'moderate' ||
        profile.activityLevel === 'very' ||
        profile.activityLevel === 'athlete'
          ? profile.activityLevel
          : undefined,
    },
    goals: {
      calorieMode: goals.calorieMode === 'manual' ? 'manual' : 'auto',
      macroMode: goals.macroMode === 'manual' ? 'manual' : 'auto',
      calorieGoal: toNumber(goals.calorieGoal, defaults.goals.calorieGoal),
      proteinGoal: toNonNegativeNumber(goals.proteinGoal, defaults.goals.proteinGoal),
      carbsGoal: toNonNegativeNumber(goals.carbsGoal, defaults.goals.carbsGoal),
      fatGoal: toNonNegativeNumber(goals.fatGoal, defaults.goals.fatGoal),
      goalAdjustment:
        goals.goalAdjustment === 'lose' ||
        goals.goalAdjustment === 'maintain' ||
        goals.goalAdjustment === 'gain'
          ? goals.goalAdjustment
          : defaults.goals.goalAdjustment,
    },
    units: {
      weight: units.weight === 'lb' ? 'lb' : 'kg',
      height: units.height === 'ft-in' ? 'ft-in' : 'cm',
    },
    backupReminder:
      value.backupReminder === 'daily' ||
      value.backupReminder === 'weekly' ||
      value.backupReminder === 'monthly'
        ? value.backupReminder
        : defaults.backupReminder,
    backupReminderLastShownDate:
      typeof value.backupReminderLastShownDate === 'string'
        ? value.backupReminderLastShownDate
        : undefined,
    preferredMeal: toMealKey(value.preferredMeal, defaults.preferredMeal),
    updatedAt: toNumber(value.updatedAt, defaults.updatedAt),
  }
}

function normalizeFoodDraft(value: unknown, fallbackSource: FoodDraft['source']) {
  if (!isPlainObject(value)) {
    return undefined
  }

  const name = toRequiredText(value.name)
  if (!name) {
    return undefined
  }

  return {
    name,
    brand: toOptionalText(value.brand),
    servingSize: toOptionalText(value.servingSize) ?? '1 serving',
    calories: toNonNegativeNumber(value.calories, 0),
    protein: toNonNegativeNumber(value.protein, 0),
    carbs: toNonNegativeNumber(value.carbs, 0),
    fat: toNonNegativeNumber(value.fat, 0),
    barcode: toOptionalText(value.barcode),
    imageUrl: toOptionalText(value.imageUrl),
    source: toFoodSource(value.source, fallbackSource),
    incompleteNutrition: typeof value.incompleteNutrition === 'boolean' ? value.incompleteNutrition : undefined,
    notes: toOptionalText(value.notes),
  } satisfies FoodDraft
}

function normalizeFavoriteFood(value: unknown) {
  if (!isPlainObject(value)) {
    return undefined
  }

  const id = toRequiredText(value.id)
  const food = normalizeFoodDraft(value, 'favorite')

  if (!id || !food) {
    return undefined
  }

  return {
    ...food,
    id,
    custom: typeof value.custom === 'boolean' ? value.custom : food.source === 'manual',
    createdAt: toNumber(value.createdAt, Date.now()),
    updatedAt: toNumber(value.updatedAt, Date.now()),
    source: 'favorite',
  } satisfies FavoriteFood
}

function normalizeCustomMealItem(value: unknown) {
  if (!isPlainObject(value)) {
    return undefined
  }

  const id = toRequiredText(value.id)
  const food = normalizeFoodDraft(value.food, 'manual')

  if (!id || !food) {
    return undefined
  }

  return {
    id,
    quantity: Math.max(0.25, toNonNegativeNumber(value.quantity, 1)),
    food,
  } satisfies CustomMealItem
}

function normalizeCustomMeal(value: unknown) {
  if (!isPlainObject(value)) {
    return undefined
  }

  const id = toRequiredText(value.id)
  const name = toRequiredText(value.name)
  const items = normalizeCollection(value.items, normalizeCustomMealItem)

  if (!id || !name || items.length === 0) {
    return undefined
  }

  const totals = isPlainObject(value.totals)
    ? {
        calories: toNonNegativeNumber(value.totals.calories, 0),
        protein: toNonNegativeNumber(value.totals.protein, 0),
        carbs: toNonNegativeNumber(value.totals.carbs, 0),
        fat: toNonNegativeNumber(value.totals.fat, 0),
      }
    : {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }

  return {
    id,
    name,
    items,
    totals,
    servingSize: toOptionalText(value.servingSize) ?? '1 meal',
    createdAt: toNumber(value.createdAt, Date.now()),
    updatedAt: toNumber(value.updatedAt, Date.now()),
  } satisfies CustomMeal
}

function normalizeLogEntry(value: unknown) {
  if (!isPlainObject(value)) {
    return undefined
  }

  const id = toRequiredText(value.id)
  const food = normalizeFoodDraft(value.item, 'manual')
  const date = toRequiredText(value.date)

  if (!id || !food || !date) {
    return undefined
  }

  return {
    id,
    date,
    meal: toMealKey(value.meal, 'snacks'),
    quantity: Math.max(0.25, toNonNegativeNumber(value.quantity, 1)),
    item: food,
    sourceType: toLogSourceType(value.sourceType, 'food'),
    favoriteId: toOptionalText(value.favoriteId),
    mealId: toOptionalText(value.mealId),
    createdAt: toNumber(value.createdAt, Date.now()),
    updatedAt: toNumber(value.updatedAt, Date.now()),
  } satisfies LogEntry
}

function normalizeWeightEntry(value: unknown) {
  if (!isPlainObject(value)) {
    return undefined
  }

  const id = toRequiredText(value.id)
  const date = toRequiredText(value.date)
  const weightKg = toPositiveNumber(value.weightKg)

  if (!id || !date || typeof weightKg !== 'number') {
    return undefined
  }

  return {
    id,
    date,
    weightKg,
    createdAt: toNumber(value.createdAt, Date.now()),
    updatedAt: toNumber(value.updatedAt, Date.now()),
  } satisfies WeightEntry
}

function normalizeCollection<T>(value: unknown, normalizer: (item: unknown) => T | undefined) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    const normalized = normalizer(item)
    return normalized ? [normalized] : []
  })
}

export function normalizePersistedAppState(value: unknown): PersistedAppState {
  if (!isPlainObject(value)) {
    return createDefaultPersistedState()
  }

  return {
    settings: normalizeSettings(value.settings),
    favorites: normalizeCollection(value.favorites, normalizeFavoriteFood),
    customMeals: normalizeCollection(value.customMeals, normalizeCustomMeal),
    logEntries: normalizeCollection(value.logEntries, normalizeLogEntry),
    weightEntries: normalizeCollection(value.weightEntries, normalizeWeightEntry),
  }
}

export function loadPersistedAppState(): PersistedAppState {
  if (typeof window === 'undefined') {
    return createDefaultPersistedState()
  }

  try {
    const rawValue = window.localStorage.getItem(PERSISTED_STATE_KEY)
    if (!rawValue) {
      return createDefaultPersistedState()
    }

    return normalizePersistedAppState(JSON.parse(rawValue))
  } catch {
    return createDefaultPersistedState()
  }
}

export function savePersistedAppState(state: PersistedAppState) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(PERSISTED_STATE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearPersistedAppState() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(PERSISTED_STATE_KEY)
  } catch {
    // Ignore storage access errors.
  }
}

export function subscribePersistedAppState(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PERSISTED_STATE_KEY) {
      callback()
    }
  }

  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}
