/* eslint-disable react-refresh/only-export-components */

import { useLiveQuery } from 'dexie-react-hooks'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type {
  AppSettingsRecord,
  CustomMeal,
  FavoriteFood,
  FoodDraft,
  GoalSettings,
  LogEntry,
  MealKey,
  Profile,
  UnitSettings,
} from '../types/domain'
import { toDateKey } from '../utils/date'
import { createId } from '../utils/id'
import { calculateCustomMealTotals } from '../utils/nutrition'
import { SETTINGS_ID, db } from './db'

const FIRST_VISIT_KEY = 'forge-fitness:first-visit-complete'

const defaultSettings = (): AppSettingsRecord => ({
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
})

async function ensureSettings() {
  const existing = await db.settings.get(SETTINGS_ID)
  if (existing) {
    return existing
  }

  const seeded = defaultSettings()
  await db.settings.put(seeded)
  return seeded
}

interface AddLogEntryInput {
  date?: string
  meal: MealKey
  food: FoodDraft
  quantity?: number
  sourceType?: LogEntry['sourceType']
  favoriteId?: string
  mealId?: string
}

interface SaveCustomMealInput {
  id?: string
  name: string
  items: CustomMeal['items']
  servingSize?: string
}

interface AppStoreValue {
  isReady: boolean
  settings: AppSettingsRecord
  favorites: FavoriteFood[]
  customMeals: CustomMeal[]
  logEntries: LogEntry[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  isFirstVisitOpen: boolean
  openFirstVisitModal: () => void
  dismissFirstVisitModal: () => void
  completeFirstVisit: (profile?: Profile) => Promise<void>
  updateProfile: (profile: Profile) => Promise<void>
  updateGoals: (goals: Partial<GoalSettings>) => Promise<void>
  updateUnits: (units: Partial<UnitSettings>) => Promise<void>
  updatePreferredMeal: (meal: MealKey) => Promise<void>
  addLogEntry: (input: AddLogEntryInput) => Promise<LogEntry>
  updateLogEntry: (id: string, updates: Partial<Pick<LogEntry, 'meal' | 'quantity' | 'item'>>) => Promise<void>
  deleteLogEntry: (id: string) => Promise<void>
  moveLogEntry: (id: string, meal: MealKey) => Promise<void>
  saveFavorite: (food: FoodDraft, options?: { id?: string; custom?: boolean }) => Promise<FavoriteFood>
  deleteFavorite: (id: string) => Promise<void>
  saveCustomMeal: (meal: SaveCustomMealInput) => Promise<CustomMeal>
  deleteCustomMeal: (id: string) => Promise<void>
  quickAddFavorite: (favorite: FavoriteFood) => Promise<void>
  quickAddMeal: (meal: CustomMeal) => Promise<void>
  resetAllData: () => Promise<void>
}

const AppStoreContext = createContext<AppStoreValue | undefined>(undefined)

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [selectedDate, setSelectedDate] = useState(toDateKey())
  const [isFirstVisitOpen, setIsFirstVisitOpen] = useState(() => {
    try {
      return localStorage.getItem(FIRST_VISIT_KEY) !== 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    void ensureSettings()
  }, [])

  const settingsRecord = useLiveQuery(
    () => db.settings.get(SETTINGS_ID),
    [],
    defaultSettings(),
  )
  const favorites = useLiveQuery(
    () => db.favorites.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )
  const customMeals = useLiveQuery(
    () => db.customMeals.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )
  const logEntries = useLiveQuery(
    () => db.logEntries.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )

  const mutateSettings = useCallback(
    async (mutator: (current: AppSettingsRecord) => AppSettingsRecord) => {
      const current = await ensureSettings()
      const next = mutator(current)
      const record: AppSettingsRecord = {
        ...next,
        id: SETTINGS_ID,
        updatedAt: Date.now(),
      }
      await db.settings.put(record)
      return record
    },
    [],
  )

  const updateProfile = useCallback(
    async (profile: Profile) => {
      await mutateSettings((current) => ({ ...current, profile }))
    },
    [mutateSettings],
  )

  const updateGoals = useCallback(
    async (goals: Partial<GoalSettings>) => {
      await mutateSettings((current) => ({
        ...current,
        goals: {
          ...current.goals,
          ...goals,
        },
      }))
    },
    [mutateSettings],
  )

  const updateUnits = useCallback(
    async (units: Partial<UnitSettings>) => {
      await mutateSettings((current) => ({
        ...current,
        units: {
          ...current.units,
          ...units,
        },
      }))
    },
    [mutateSettings],
  )

  const updatePreferredMeal = useCallback(
    async (meal: MealKey) => {
      await mutateSettings((current) => ({ ...current, preferredMeal: meal }))
    },
    [mutateSettings],
  )

  const addLogEntry = useCallback(
    async ({
      date = toDateKey(),
      meal,
      food,
      quantity = 1,
      sourceType = 'food',
      favoriteId,
      mealId,
    }: AddLogEntryInput) => {
      const now = Date.now()
      const entry: LogEntry = {
        id: createId('log'),
        date,
        meal,
        quantity,
        item: food,
        sourceType,
        favoriteId,
        mealId,
        createdAt: now,
        updatedAt: now,
      }

      await db.logEntries.put(entry)
      await updatePreferredMeal(meal)
      return entry
    },
    [updatePreferredMeal],
  )

  const updateLogEntry = useCallback(async (
    id: string,
    updates: Partial<Pick<LogEntry, 'meal' | 'quantity' | 'item'>>,
  ) => {
    const existing = await db.logEntries.get(id)
    if (!existing) {
      return
    }

    const nextMeal = updates.meal ?? existing.meal

    await db.logEntries.put({
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    })

    await updatePreferredMeal(nextMeal)
  }, [updatePreferredMeal])

  const moveLogEntry = useCallback(
    async (id: string, meal: MealKey) => {
      await updateLogEntry(id, { meal })
    },
    [updateLogEntry],
  )

  const deleteLogEntry = useCallback(async (id: string) => {
    await db.logEntries.delete(id)
  }, [])

  const saveFavorite = useCallback(async (
    food: FoodDraft,
    options?: { id?: string; custom?: boolean },
  ) => {
    const now = Date.now()
    const favorite: FavoriteFood = {
      ...food,
      id: options?.id ?? createId('fav'),
      custom: options?.custom ?? food.source === 'manual',
      createdAt: now,
      updatedAt: now,
      source: 'favorite',
    }

    const existing = options?.id ? await db.favorites.get(options.id) : undefined

    await db.favorites.put({
      ...favorite,
      createdAt: existing?.createdAt ?? favorite.createdAt,
    })

    return favorite
  }, [])

  const deleteFavorite = useCallback(async (id: string) => {
    await db.favorites.delete(id)
  }, [])

  const saveCustomMeal = useCallback(async (meal: SaveCustomMealInput) => {
    const now = Date.now()
    const existing = meal.id ? await db.customMeals.get(meal.id) : undefined
    const totals = calculateCustomMealTotals(meal.items)
    const record: CustomMeal = {
      id: meal.id ?? createId('meal'),
      name: meal.name,
      items: meal.items,
      totals,
      servingSize: meal.servingSize?.trim() || '1 meal',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    await db.customMeals.put(record)
    return record
  }, [])

  const deleteCustomMeal = useCallback(async (id: string) => {
    await db.customMeals.delete(id)
  }, [])

  const quickAddFavorite = useCallback(async (favorite: FavoriteFood) => {
    const currentSettings = settingsRecord ?? (await ensureSettings())
    await addLogEntry({
      meal: currentSettings.preferredMeal,
      food: favorite,
      quantity: 1,
      sourceType: 'favorite',
      favoriteId: favorite.id,
    })
  }, [addLogEntry, settingsRecord])

  const quickAddMeal = useCallback(async (meal: CustomMeal) => {
    const currentSettings = settingsRecord ?? (await ensureSettings())
    await addLogEntry({
      meal: currentSettings.preferredMeal,
      food: {
        ...meal.totals,
        name: meal.name,
        servingSize: meal.servingSize,
        source: 'custom-meal',
        notes: `${meal.items.length} item meal`,
      },
      quantity: 1,
      sourceType: 'meal',
      mealId: meal.id,
    })
  }, [addLogEntry, settingsRecord])

  const openFirstVisitModal = useCallback(() => {
    setIsFirstVisitOpen(true)
  }, [])

  const dismissFirstVisitModal = useCallback(() => {
    try {
      localStorage.setItem(FIRST_VISIT_KEY, 'true')
    } catch {
      // Ignore storage errors.
    }
    setIsFirstVisitOpen(false)
  }, [])

  const completeFirstVisit = useCallback(async (profile?: Profile) => {
    if (profile) {
      await updateProfile(profile)
    }

    try {
      localStorage.setItem(FIRST_VISIT_KEY, 'true')
    } catch {
      // Ignore storage errors.
    }

    setIsFirstVisitOpen(false)
  }, [updateProfile])

  const resetAllData = useCallback(async () => {
    await Promise.all([
      db.logEntries.clear(),
      db.customMeals.clear(),
      db.favorites.clear(),
      db.settings.clear(),
    ])

    await db.settings.put(defaultSettings())

    try {
      localStorage.removeItem(FIRST_VISIT_KEY)
    } catch {
      // Ignore storage errors.
    }

    setSelectedDate(toDateKey())
    setIsFirstVisitOpen(true)
  }, [])

  const value = useMemo<AppStoreValue>(() => ({
    isReady: true,
    settings: settingsRecord ?? defaultSettings(),
    favorites: favorites ?? [],
    customMeals: customMeals ?? [],
    logEntries: logEntries ?? [],
    selectedDate,
    setSelectedDate,
    isFirstVisitOpen,
    openFirstVisitModal,
    dismissFirstVisitModal,
    completeFirstVisit,
    updateProfile,
    updateGoals,
    updateUnits,
    updatePreferredMeal,
    addLogEntry,
    updateLogEntry,
    deleteLogEntry,
    moveLogEntry,
    saveFavorite,
    deleteFavorite,
    saveCustomMeal,
    deleteCustomMeal,
    quickAddFavorite,
    quickAddMeal,
    resetAllData,
  }), [
    addLogEntry,
    completeFirstVisit,
    customMeals,
    deleteCustomMeal,
    deleteFavorite,
    deleteLogEntry,
    dismissFirstVisitModal,
    favorites,
    isFirstVisitOpen,
    logEntries,
    moveLogEntry,
    openFirstVisitModal,
    quickAddFavorite,
    quickAddMeal,
    resetAllData,
    saveCustomMeal,
    saveFavorite,
    selectedDate,
    settingsRecord,
    updateGoals,
    updateLogEntry,
    updateProfile,
    updatePreferredMeal,
    updateUnits,
  ])

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const context = useContext(AppStoreContext)
  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider')
  }

  return context
}
