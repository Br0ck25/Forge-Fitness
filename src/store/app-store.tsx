/* eslint-disable react-refresh/only-export-components */

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
import {
  clearPersistedAppState,
  createDefaultPersistedState,
  defaultSettings,
  loadPersistedAppState,
  savePersistedAppState,
  SETTINGS_ID,
  subscribePersistedAppState,
  type PersistedAppState,
} from './local-storage'

const FIRST_VISIT_KEY = 'forge-fitness:first-visit-complete'

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

function upsertByUpdatedAt<T extends { id: string; updatedAt: number }>(items: T[], nextItem: T) {
  return [nextItem, ...items.filter((item) => item.id !== nextItem.id)].sort(
    (left, right) => right.updatedAt - left.updatedAt,
  )
}

function updatePreferredMealInState(state: PersistedAppState, meal: MealKey) {
  return {
    ...state,
    settings: {
      ...state.settings,
      id: SETTINGS_ID,
      preferredMeal: meal,
      updatedAt: Date.now(),
    },
  }
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [selectedDate, setSelectedDate] = useState(toDateKey())
  const [persistedState, setPersistedState] = useState<PersistedAppState>(() =>
    loadPersistedAppState(),
  )
  const [isFirstVisitOpen, setIsFirstVisitOpen] = useState(() => {
    try {
      return localStorage.getItem(FIRST_VISIT_KEY) !== 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    savePersistedAppState(persistedState)
  }, [persistedState])

  useEffect(() => {
    return subscribePersistedAppState(() => {
      setPersistedState(loadPersistedAppState())
    })
  }, [])

  const mutateSettings = useCallback(
    async (mutator: (current: PersistedAppState['settings']) => PersistedAppState['settings']) => {
      let nextSettings = defaultSettings()

      setPersistedState((current) => {
        nextSettings = {
          ...mutator(current.settings),
          id: SETTINGS_ID,
          updatedAt: Date.now(),
        }

        return {
          ...current,
          settings: nextSettings,
        }
      })

      return nextSettings
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
      let entry!: LogEntry

      setPersistedState((current) => {
        const now = Date.now()
        entry = {
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

        return updatePreferredMealInState(
          {
            ...current,
            logEntries: upsertByUpdatedAt(current.logEntries, entry),
          },
          meal,
        )
      })

      return entry
    },
    [],
  )

  const updateLogEntry = useCallback(
    async (
      id: string,
      updates: Partial<Pick<LogEntry, 'meal' | 'quantity' | 'item'>>,
    ) => {
      setPersistedState((current) => {
        const existing = current.logEntries.find((entry) => entry.id === id)
        if (!existing) {
          return current
        }

        const nextEntry: LogEntry = {
          ...existing,
          ...updates,
          updatedAt: Date.now(),
        }

        return updatePreferredMealInState(
          {
            ...current,
            logEntries: upsertByUpdatedAt(current.logEntries, nextEntry),
          },
          nextEntry.meal,
        )
      })
    },
    [],
  )

  const moveLogEntry = useCallback(
    async (id: string, meal: MealKey) => {
      await updateLogEntry(id, { meal })
    },
    [updateLogEntry],
  )

  const deleteLogEntry = useCallback(async (id: string) => {
    setPersistedState((current) => ({
      ...current,
      logEntries: current.logEntries.filter((entry) => entry.id !== id),
    }))
  }, [])

  const saveFavorite = useCallback(
    async (food: FoodDraft, options?: { id?: string; custom?: boolean }) => {
      let favorite!: FavoriteFood

      setPersistedState((current) => {
        const existing = options?.id
          ? current.favorites.find((item) => item.id === options.id)
          : undefined
        const now = Date.now()

        favorite = {
          ...food,
          id: options?.id ?? createId('fav'),
          custom: options?.custom ?? food.source === 'manual',
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          source: 'favorite',
        }

        return {
          ...current,
          favorites: upsertByUpdatedAt(current.favorites, favorite),
        }
      })

      return favorite
    },
    [],
  )

  const deleteFavorite = useCallback(async (id: string) => {
    setPersistedState((current) => ({
      ...current,
      favorites: current.favorites.filter((favorite) => favorite.id !== id),
    }))
  }, [])

  const saveCustomMeal = useCallback(
    async (meal: SaveCustomMealInput) => {
      let record!: CustomMeal

      setPersistedState((current) => {
        const existing = meal.id
          ? current.customMeals.find((item) => item.id === meal.id)
          : undefined
        const now = Date.now()
        const totals = calculateCustomMealTotals(meal.items)

        record = {
          id: meal.id ?? createId('meal'),
          name: meal.name,
          items: meal.items,
          totals,
          servingSize: meal.servingSize?.trim() || '1 meal',
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }

        return {
          ...current,
          customMeals: upsertByUpdatedAt(current.customMeals, record),
        }
      })

      return record
    },
    [],
  )

  const deleteCustomMeal = useCallback(async (id: string) => {
    setPersistedState((current) => ({
      ...current,
      customMeals: current.customMeals.filter((meal) => meal.id !== id),
    }))
  }, [])

  const quickAddFavorite = useCallback(async (favorite: FavoriteFood) => {
    await addLogEntry({
      meal: persistedState.settings.preferredMeal,
      food: favorite,
      quantity: 1,
      sourceType: 'favorite',
      favoriteId: favorite.id,
    })
  }, [addLogEntry, persistedState.settings.preferredMeal])

  const quickAddMeal = useCallback(async (meal: CustomMeal) => {
    await addLogEntry({
      meal: persistedState.settings.preferredMeal,
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
  }, [addLogEntry, persistedState.settings.preferredMeal])

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
    clearPersistedAppState()
    setPersistedState(createDefaultPersistedState())

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
    settings: persistedState.settings,
    favorites: persistedState.favorites,
    customMeals: persistedState.customMeals,
    logEntries: persistedState.logEntries,
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
    deleteCustomMeal,
    deleteFavorite,
    deleteLogEntry,
    dismissFirstVisitModal,
    isFirstVisitOpen,
    moveLogEntry,
    openFirstVisitModal,
    persistedState,
    quickAddFavorite,
    quickAddMeal,
    resetAllData,
    saveCustomMeal,
    saveFavorite,
    selectedDate,
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
