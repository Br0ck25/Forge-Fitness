import type {
  AppSettingsRecord,
  CustomMeal,
  FavoriteFood,
  LogEntry,
  MealKey,
} from '../types/domain'
import { MEAL_ORDER } from '../types/domain'

export const SETTINGS_ID = 'app-settings' as const
export const PERSISTED_STATE_KEY = 'forge-fitness:app-state:v1'

export interface PersistedAppState {
  settings: AppSettingsRecord
  favorites: FavoriteFood[]
  customMeals: CustomMeal[]
  logEntries: LogEntry[]
}

export function defaultSettings(): AppSettingsRecord {
  return {
    id: SETTINGS_ID,
    profile: {},
    goals: {
      calorieMode: 'auto',
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
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toMealKey(value: unknown, fallback: MealKey) {
  return typeof value === 'string' && MEAL_ORDER.includes(value as MealKey)
    ? (value as MealKey)
    : fallback
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
      calorieGoal: toNumber(goals.calorieGoal, defaults.goals.calorieGoal),
      proteinGoal: toNumber(goals.proteinGoal, defaults.goals.proteinGoal),
      carbsGoal: toNumber(goals.carbsGoal, defaults.goals.carbsGoal),
      fatGoal: toNumber(goals.fatGoal, defaults.goals.fatGoal),
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
    preferredMeal: toMealKey(value.preferredMeal, defaults.preferredMeal),
    updatedAt: toNumber(value.updatedAt, defaults.updatedAt),
  }
}

function normalizeArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : []
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

    const parsed = JSON.parse(rawValue) as Record<string, unknown>

    return {
      settings: normalizeSettings(parsed.settings),
      favorites: normalizeArray<FavoriteFood>(parsed.favorites),
      customMeals: normalizeArray<CustomMeal>(parsed.customMeals),
      logEntries: normalizeArray<LogEntry>(parsed.logEntries),
    }
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
  } catch {
    // Ignore storage quota and access errors.
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
