/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  AppNotice,
  AppSettingsRecord,
  CustomMeal,
  FavoriteFood,
  FoodDraft,
  GoalSettings,
  LogEntry,
  MealKey,
  Profile,
  UnitSettings,
  WeightEntry,
} from '../types/domain'
import { toDateKey } from '../utils/date'
import { createBackupFile, parseBackupFile, type AppBackupFile } from '../utils/backup'
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
  weightEntries: WeightEntry[]
  notices: AppNotice[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  isFirstVisitOpen: boolean
  openFirstVisitModal: () => void
  dismissFirstVisitModal: () => void
  dismissNotice: (id: string) => void
  notify: (notice: {
    title: string
    description?: string
    tone?: AppNotice['tone']
    durationMs?: number
  }) => string
  exportBackup: () => AppBackupFile
  importBackup: (payload: unknown) => Promise<AppBackupFile>
  completeFirstVisit: (profile?: Profile) => Promise<void>
  updateProfile: (profile: Profile) => Promise<void>
  updateGoals: (goals: Partial<GoalSettings>) => Promise<void>
  updateUnits: (units: Partial<UnitSettings>) => Promise<void>
  updatePreferredMeal: (meal: MealKey) => Promise<void>
  addLogEntry: (input: AddLogEntryInput) => Promise<LogEntry>
  updateLogEntry: (id: string, updates: Partial<Pick<LogEntry, 'meal' | 'quantity' | 'item'>>) => Promise<void>
  deleteLogEntry: (id: string) => Promise<void>
  moveLogEntry: (id: string, meal: MealKey) => Promise<void>
  addWeightEntry: (input: { date?: string; weightKg: number }) => Promise<WeightEntry>
  updateWeightEntry: (id: string, updates: Partial<Pick<WeightEntry, 'weightKg'>>) => Promise<void>
  deleteWeightEntry: (id: string) => Promise<void>
  saveFavorite: (food: FoodDraft, options?: { id?: string; custom?: boolean }) => Promise<FavoriteFood>
  deleteFavorite: (id: string) => Promise<void>
  saveCustomMeal: (meal: SaveCustomMealInput) => Promise<CustomMeal>
  deleteCustomMeal: (id: string) => Promise<void>
  quickAddFavorite: (favorite: FavoriteFood) => Promise<void>
  quickAddMeal: (meal: CustomMeal) => Promise<void>
  resetAllData: () => Promise<void>
}

const AppStoreContext = createContext<AppStoreValue | undefined>(undefined)

const FIRST_VISIT_KEY = 'forge-fitness:first-visit-complete'
const DEFAULT_NOTICE_DURATION = 3200

function readFirstVisitComplete() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.localStorage.getItem(FIRST_VISIT_KEY) === 'true'
  } catch {
    return false
  }
}

function writeFirstVisitComplete(isComplete: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (isComplete) {
      window.localStorage.setItem(FIRST_VISIT_KEY, 'true')
      return
    }

    window.localStorage.removeItem(FIRST_VISIT_KEY)
  } catch {
    // Ignore storage errors.
  }
}

function upsertByUpdatedAt<T extends { id: string; updatedAt: number }>(items: T[], nextItem: T) {
  return [nextItem, ...items.filter((item) => item.id !== nextItem.id)].sort(
    (left, right) => right.updatedAt - left.updatedAt,
  )
}

function sanitizeFoodDraft(food: FoodDraft) {
  return {
    ...food,
    name: food.name.trim(),
    brand: food.brand?.trim() || undefined,
    servingSize: food.servingSize.trim() || '1 serving',
    barcode: food.barcode?.trim() || undefined,
    imageUrl: food.imageUrl?.trim() || undefined,
    notes: food.notes?.trim() || undefined,
  } satisfies FoodDraft
}

function toMealLogFood(meal: CustomMeal): FoodDraft {
  return {
    ...meal.totals,
    name: meal.name,
    servingSize: meal.servingSize,
    source: 'custom-meal',
    notes: `${meal.items.length} item meal`,
  }
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
  const [isFirstVisitComplete, setIsFirstVisitComplete] = useState(() => readFirstVisitComplete())
  const [isFirstVisitOpen, setIsFirstVisitOpen] = useState(() => !readFirstVisitComplete())
  const [notices, setNotices] = useState<AppNotice[]>([])
  const noticeTimeoutsRef = useRef(new Map<string, number>())
  const saveErrorShownRef = useRef(false)

  const dismissNotice = useCallback((id: string) => {
    const timeoutId = noticeTimeoutsRef.current.get(id)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      noticeTimeoutsRef.current.delete(id)
    }

    setNotices((current) => current.filter((notice) => notice.id !== id))
  }, [])

  const notify = useCallback(
    ({ description, durationMs = DEFAULT_NOTICE_DURATION, title, tone = 'success' }: {
      title: string
      description?: string
      tone?: AppNotice['tone']
      durationMs?: number
    }) => {
      const id = createId('notice')

      setNotices((current) => [...current, { id, title, description, tone }])

      if (typeof window !== 'undefined' && durationMs > 0) {
        const timeoutId = window.setTimeout(() => {
          dismissNotice(id)
        }, durationMs)

        noticeTimeoutsRef.current.set(id, timeoutId)
      }

      return id
    },
    [dismissNotice],
  )

  useEffect(() => {
    const saved = savePersistedAppState(persistedState)

    if (saved) {
      saveErrorShownRef.current = false
      return undefined
    }

    if (!saveErrorShownRef.current) {
      saveErrorShownRef.current = true
      const timeoutId = window.setTimeout(() => {
        notify({
          title: 'Could not save locally',
          description:
            'Your latest change could not be written to browser storage. Free up space and try again.',
          tone: 'error',
          durationMs: 6000,
        })
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [notify, persistedState])

  useEffect(() => {
    return subscribePersistedAppState(() => {
      setPersistedState(loadPersistedAppState())
    })
  }, [])

  useEffect(() => {
    const noticeTimeouts = noticeTimeoutsRef.current

    return () => {
      noticeTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      noticeTimeouts.clear()
    }
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
      const nextFood = sanitizeFoodDraft(food)

      setPersistedState((current) => {
        const now = Date.now()
        entry = {
          id: createId('log'),
          date,
          meal,
          quantity,
          item: nextFood,
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

        const nextItem = updates.item ? sanitizeFoodDraft(updates.item) : existing.item

        const nextEntry: LogEntry = {
          ...existing,
          ...updates,
          item: nextItem,
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

  const addWeightEntry = useCallback(
    async ({ date = toDateKey(), weightKg }: { date?: string; weightKg: number }) => {
      let entry!: WeightEntry

      setPersistedState((current) => {
        const now = Date.now()
        entry = {
          id: createId('weight'),
          date,
          weightKg,
          createdAt: now,
          updatedAt: now,
        }

        return {
          ...current,
          weightEntries: [
            entry,
            ...current.weightEntries.filter((record) => record.date !== date),
          ],
        }
      })

      return entry
    },
    [],
  )

  const updateWeightEntry = useCallback(
    async (id: string, updates: Partial<Pick<WeightEntry, 'weightKg'>>) => {
      setPersistedState((current) => {
        const existing = current.weightEntries.find((entry) => entry.id === id)
        if (!existing) {
          return current
        }

        const nextEntry: WeightEntry = {
          ...existing,
          ...updates,
          updatedAt: Date.now(),
        }

        return {
          ...current,
          weightEntries: upsertByUpdatedAt(current.weightEntries, nextEntry),
        }
      })
    },
    [],
  )

  const deleteWeightEntry = useCallback(async (id: string) => {
    setPersistedState((current) => ({
      ...current,
      weightEntries: current.weightEntries.filter((entry) => entry.id !== id),
    }))
  }, [])

  const saveFavorite = useCallback(
    async (food: FoodDraft, options?: { id?: string; custom?: boolean }) => {
      let favorite!: FavoriteFood
      const nextFood = sanitizeFoodDraft(food)

      setPersistedState((current) => {
        const existing = options?.id
          ? current.favorites.find((item) => item.id === options.id)
          : undefined
        const now = Date.now()

        favorite = {
          ...nextFood,
          id: options?.id ?? createId('fav'),
          custom: options?.custom ?? nextFood.source === 'manual',
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
        const items = meal.items
          .map((item) => ({
            ...item,
            quantity: item.quantity > 0 ? item.quantity : 1,
            food: sanitizeFoodDraft(item.food),
          }))
          .filter((item) => item.food.name)
        const totals = calculateCustomMealTotals(items)

        record = {
          id: meal.id ?? createId('meal'),
          name: meal.name.trim(),
          items,
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
      food: toMealLogFood(meal),
      quantity: 1,
      sourceType: 'meal',
      mealId: meal.id,
    })
  }, [addLogEntry, persistedState.settings.preferredMeal])

  const openFirstVisitModal = useCallback(() => {
    setIsFirstVisitOpen(true)
  }, [])

  const dismissFirstVisitModal = useCallback(() => {
    writeFirstVisitComplete(true)
    setIsFirstVisitComplete(true)
    setIsFirstVisitOpen(false)
  }, [])

  const completeFirstVisit = useCallback(async (profile?: Profile) => {
    if (profile) {
      await updateProfile(profile)
    }

    writeFirstVisitComplete(true)
    setIsFirstVisitComplete(true)
    setIsFirstVisitOpen(false)
  }, [updateProfile])

  const exportBackup = useCallback(() => {
    return createBackupFile({
      appVersion: __APP_VERSION__,
      state: persistedState,
      ui: {
        selectedDate,
        firstVisitComplete: isFirstVisitComplete,
      },
    })
  }, [isFirstVisitComplete, persistedState, selectedDate])

  const importBackup = useCallback(async (payload: unknown) => {
    const backup = parseBackupFile(payload)

    setPersistedState(backup.state)
    setSelectedDate(backup.ui.selectedDate)
    writeFirstVisitComplete(backup.ui.firstVisitComplete)
    setIsFirstVisitComplete(backup.ui.firstVisitComplete)
    setIsFirstVisitOpen(!backup.ui.firstVisitComplete)

    return backup
  }, [])

  const resetAllData = useCallback(async () => {
    clearPersistedAppState()
    setPersistedState(createDefaultPersistedState())
    writeFirstVisitComplete(false)
    setIsFirstVisitComplete(false)
    setSelectedDate(toDateKey())
    setIsFirstVisitOpen(true)
  }, [])

  const value = useMemo<AppStoreValue>(() => ({
    isReady: true,
    settings: persistedState.settings,
    favorites: persistedState.favorites,
    customMeals: persistedState.customMeals,
    logEntries: persistedState.logEntries,
    weightEntries: persistedState.weightEntries,
    notices,
    selectedDate,
    setSelectedDate,
    isFirstVisitOpen,
    openFirstVisitModal,
    dismissFirstVisitModal,
    dismissNotice,
    notify,
    exportBackup,
    importBackup,
    completeFirstVisit,
    updateProfile,
    updateGoals,
    updateUnits,
    updatePreferredMeal,
    addLogEntry,
    updateLogEntry,
    deleteLogEntry,
    moveLogEntry,
    addWeightEntry,
    updateWeightEntry,
    deleteWeightEntry,
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
    dismissNotice,
    dismissFirstVisitModal,
    exportBackup,
    importBackup,
    isFirstVisitOpen,
    moveLogEntry,
    notices,
    notify,
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
    addWeightEntry,
    updateWeightEntry,
    deleteWeightEntry,
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
