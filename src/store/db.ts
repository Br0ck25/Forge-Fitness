import Dexie, { type Table } from 'dexie'
import type { AppSettingsRecord, CustomMeal, FavoriteFood, LogEntry } from '../types/domain'

export const SETTINGS_ID = 'app-settings'

class ForgeFitnessDatabase extends Dexie {
  settings!: Table<AppSettingsRecord, string>
  favorites!: Table<FavoriteFood, string>
  customMeals!: Table<CustomMeal, string>
  logEntries!: Table<LogEntry, string>

  constructor() {
    super('forge-fitness-db')

    this.version(1).stores({
      settings: 'id, updatedAt',
      favorites: 'id, name, updatedAt, barcode',
      customMeals: 'id, name, updatedAt',
      logEntries: 'id, date, meal, [date+meal], updatedAt',
    })
  }
}

export const db = new ForgeFitnessDatabase()
