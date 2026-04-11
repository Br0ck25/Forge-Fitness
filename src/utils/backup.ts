import type { PersistedAppState } from '../store/local-storage'
import { normalizePersistedAppState } from '../store/local-storage'
import { toDateKey } from './date'

export const BACKUP_VERSION = '1' as const

export interface AppBackupFile {
  backupVersion: typeof BACKUP_VERSION
  appVersion: string
  exportedAt: string
  state: PersistedAppState
  ui: {
    selectedDate: string
    firstVisitComplete: boolean
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeUiState(value: unknown) {
  if (!isPlainObject(value)) {
    return {
      selectedDate: toDateKey(),
      firstVisitComplete: true,
    }
  }

  return {
    selectedDate: isDateKey(value.selectedDate) ? value.selectedDate : toDateKey(),
    firstVisitComplete:
      typeof value.firstVisitComplete === 'boolean' ? value.firstVisitComplete : true,
  }
}

export function createBackupFile({
  appVersion,
  state,
  ui,
}: {
  appVersion: string
  state: PersistedAppState
  ui: {
    selectedDate: string
    firstVisitComplete: boolean
  }
}): AppBackupFile {
  return {
    backupVersion: BACKUP_VERSION,
    appVersion: appVersion.trim() || '0.0.0',
    exportedAt: new Date().toISOString(),
    state: normalizePersistedAppState(state),
    ui: normalizeUiState(ui),
  }
}

export function parseBackupFile(value: unknown): AppBackupFile {
  if (!isPlainObject(value)) {
    throw new Error('Backup JSON must be an object.')
  }

  if ('state' in value) {
    return {
      backupVersion: BACKUP_VERSION,
      appVersion:
        typeof value.appVersion === 'string' && value.appVersion.trim()
          ? value.appVersion.trim()
          : 'unknown',
      exportedAt:
        typeof value.exportedAt === 'string' && !Number.isNaN(Date.parse(value.exportedAt))
          ? value.exportedAt
          : new Date().toISOString(),
      state: normalizePersistedAppState(value.state),
      ui: normalizeUiState(value.ui),
    }
  }

  if (
    'settings' in value ||
    'favorites' in value ||
    'customMeals' in value ||
    'logEntries' in value
  ) {
    return {
      backupVersion: BACKUP_VERSION,
      appVersion: 'legacy-import',
      exportedAt: new Date().toISOString(),
      state: normalizePersistedAppState(value),
      ui: normalizeUiState(undefined),
    }
  }

  throw new Error('Backup format not recognized.')
}