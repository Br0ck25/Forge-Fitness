import Dexie, { type Table } from 'dexie'
import type {
  AddMealEntryInput,
  AppBackup,
  AppSettings,
  Food,
  FoodDraft,
  MealEntry,
  SettingRecord,
  StepsEntry,
  StepsEntryDraft,
  WeightEntry,
  WeightEntryDraft,
  WorkoutExerciseTemplate,
  WorkoutSession,
  WorkoutSessionDraft,
  WorkoutTemplate,
  WorkoutTemplateDraft,
} from '../types'
import {
  calculateStepsCaloriesBurned,
  calculateWorkoutCaloriesBurned,
} from './targets'
import { calculateWorkoutVolume, cleanBarcode, roundValue, toDayKey } from './utils'

const nowIso = () => new Date().toISOString()
const createId = () => crypto.randomUUID()

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  weekStartsOn: 'monday',
  onboardingComplete: false,
  profile: {
    name: '',
    calorieTarget: 2200,
    proteinTarget: 160,
    carbsTarget: 220,
    fatTarget: 75,
    startWeightKg: undefined,
    weightGoalKg: 75,
    unit: 'kg',
  },
  energySettings: {
    targetMode: 'manual',
    activityLevel: 'lightly-active',
    customActivityCalories: undefined,
    customBmrKcal: undefined,
    includeThermicEffect: false,
  },
  macroSettings: {
    mode: 'ratio',
    ratioTargets: {
      proteinPercent: 30,
      carbsPercent: 40,
      fatPercent: 30,
    },
    fixedTargets: {
      proteinGrams: 160,
      carbsGrams: 220,
      fatGrams: 75,
    },
    ketoSettings: {
      program: 'moderate',
      proteinPerKg: 1.6,
      carbLimitGrams: 35,
    },
  },
}

const createSeedFood = (
  id: string,
  name: string,
  values: Pick<
    Food,
    'calories' | 'protein' | 'carbs' | 'fat' | 'servingLabel' | 'brand' | 'notes'
  >,
): Food => {
  const timestamp = nowIso()

  return {
    id,
    name,
    brand: values.brand,
    servingLabel: values.servingLabel,
    calories: values.calories,
    protein: values.protein,
    carbs: values.carbs,
    fat: values.fat,
    notes: values.notes,
    source: 'seeded',
    favorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const createSeedExercise = (
  name: string,
  type: WorkoutExerciseTemplate['type'],
  defaults: Omit<WorkoutExerciseTemplate, 'id' | 'name' | 'type'>,
): WorkoutExerciseTemplate => ({
  id: createId(),
  name,
  type,
  ...defaults,
})

const defaultFoods: Food[] = [
  createSeedFood('food-greek-yogurt', 'Greek Yogurt Cup', {
    brand: 'Forge Starter Pantry',
    servingLabel: '1 cup',
    calories: 120,
    protein: 15,
    carbs: 5,
    fat: 3,
    notes: 'Easy high-protein breakfast win.',
  }),
  createSeedFood('food-protein-shake', 'Protein Shake', {
    brand: 'Forge Starter Pantry',
    servingLabel: '1 bottle',
    calories: 180,
    protein: 30,
    carbs: 8,
    fat: 3,
    notes: 'Great backup for busy days.',
  }),
  createSeedFood('food-chicken-rice-bowl', 'Chicken Rice Bowl', {
    brand: 'Forge Starter Pantry',
    servingLabel: '1 bowl',
    calories: 520,
    protein: 42,
    carbs: 54,
    fat: 12,
    notes: 'Balanced meal template for lunch or dinner.',
  }),
  createSeedFood('food-overnight-oats', 'Overnight Oats', {
    brand: 'Forge Starter Pantry',
    servingLabel: '1 jar',
    calories: 360,
    protein: 22,
    carbs: 45,
    fat: 10,
    notes: 'High-fiber breakfast option.',
  }),
  createSeedFood('food-apple', 'Apple', {
    brand: 'Forge Starter Pantry',
    servingLabel: '1 medium apple',
    calories: 95,
    protein: 0.5,
    carbs: 25,
    fat: 0.3,
    notes: 'Crunchy snack. Zero prep, zero drama.',
  }),
]

const createTemplate = (
  id: string,
  name: string,
  focus: string,
  sessionType: WorkoutTemplate['sessionType'],
  intensity: WorkoutTemplate['intensity'],
  exercises: WorkoutExerciseTemplate[],
): WorkoutTemplate => {
  const timestamp = nowIso()

  return {
    id,
    name,
    focus,
    sessionType,
    intensity,
    exercises,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const defaultTemplates: WorkoutTemplate[] = [
  createTemplate('template-full-body', 'Full Body Strength', 'Strength', 'strength', 'moderate', [
    createSeedExercise('Back Squat', 'strength', {
      target: 'Lower body power',
      defaultSets: 4,
      defaultReps: 6,
      defaultWeightKg: 80,
    }),
    createSeedExercise('Dumbbell Bench Press', 'strength', {
      target: 'Upper push',
      defaultSets: 4,
      defaultReps: 8,
      defaultWeightKg: 22.5,
    }),
    createSeedExercise('Single-Arm Row', 'strength', {
      target: 'Upper pull',
      defaultSets: 3,
      defaultReps: 10,
      defaultWeightKg: 24,
    }),
    createSeedExercise('Plank', 'mobility', {
      target: 'Core stability',
      defaultDurationMinutes: 3,
    }),
  ]),
  createTemplate('template-conditioning', 'Sprint + Core Reset', 'Conditioning', 'hiit', 'high', [
    createSeedExercise('Bike Sprint Intervals', 'cardio', {
      target: 'Anaerobic conditioning',
      defaultDurationMinutes: 20,
    }),
    createSeedExercise('Hanging Knee Raise', 'strength', {
      target: 'Core',
      defaultSets: 3,
      defaultReps: 12,
      defaultWeightKg: 0,
    }),
    createSeedExercise('Dead Bug', 'mobility', {
      target: 'Control and breathing',
      defaultDurationMinutes: 5,
    }),
  ]),
  createTemplate('template-recovery', 'Recovery Flow', 'Mobility', 'mobility', 'low', [
    createSeedExercise('Treadmill Walk', 'cardio', {
      target: 'Low-intensity movement',
      defaultDurationMinutes: 25,
    }),
    createSeedExercise('Hip Mobility Flow', 'mobility', {
      target: 'Recovery and range of motion',
      defaultDurationMinutes: 10,
    }),
    createSeedExercise('Thoracic Rotation', 'mobility', {
      target: 'Upper back mobility',
      defaultDurationMinutes: 6,
    }),
  ]),
]

class ForgeFitnessDb extends Dexie {
  foods!: Table<Food, string>
  mealEntries!: Table<MealEntry, string>
  weightEntries!: Table<WeightEntry, string>
  stepsEntries!: Table<StepsEntry, string>
  workoutTemplates!: Table<WorkoutTemplate, string>
  workoutSessions!: Table<WorkoutSession, string>
  settings!: Table<SettingRecord<AppSettings>, string>

  constructor() {
    super('forge-fitness-db')

    this.version(1).stores({
      foods: 'id, name, barcode, updatedAt, lastUsedAt, favorite',
      mealEntries: 'id, dayKey, occurredAt, mealType, createdAt',
      weightEntries: 'id, date, updatedAt',
      workoutTemplates: 'id, name, focus, updatedAt',
      workoutSessions: 'id, occurredAt, templateId, createdAt',
      settings: 'key',
    })

    this.version(2).stores({
      foods: 'id, name, barcode, updatedAt, lastUsedAt, favorite',
      mealEntries: 'id, dayKey, occurredAt, mealType, createdAt',
      weightEntries: 'id, date, updatedAt',
      stepsEntries: 'id, date, updatedAt',
      workoutTemplates: 'id, name, focus, updatedAt',
      workoutSessions: 'id, occurredAt, templateId, createdAt',
      settings: 'key',
    })
  }
}

export const db = new ForgeFitnessDb()

const mergeSettings = (
  current: AppSettings,
  updates: Partial<AppSettings>,
): AppSettings => ({
  ...current,
  ...updates,
  profile: {
    ...current.profile,
    ...(updates.profile ?? {}),
  },
  energySettings: {
    ...current.energySettings,
    ...(updates.energySettings ?? {}),
  },
  macroSettings: {
    ...current.macroSettings,
    ...(updates.macroSettings ?? {}),
    ratioTargets: {
      ...current.macroSettings.ratioTargets,
      ...(updates.macroSettings?.ratioTargets ?? {}),
    },
    fixedTargets: {
      ...current.macroSettings.fixedTargets,
      ...(updates.macroSettings?.fixedTargets ?? {}),
    },
    ketoSettings: {
      ...current.macroSettings.ketoSettings,
      ...(updates.macroSettings?.ketoSettings ?? {}),
    },
  },
})

export async function seedDatabase() {
  await db.transaction(
    'rw',
    db.foods,
    db.workoutTemplates,
    db.settings,
    async () => {
      const settingsRecord = await db.settings.get('app')

      if (!settingsRecord) {
        await db.settings.put({
          key: 'app',
          value: DEFAULT_SETTINGS,
          updatedAt: nowIso(),
        })
      }

      if ((await db.foods.count()) === 0) {
        await db.foods.bulkAdd(defaultFoods)
      }

      if ((await db.workoutTemplates.count()) === 0) {
        await db.workoutTemplates.bulkAdd(defaultTemplates)
      }
    },
  )
}

export async function getAppSettings(): Promise<AppSettings> {
  const record = await db.settings.get('app')
  return record ? mergeSettings(DEFAULT_SETTINGS, record.value) : DEFAULT_SETTINGS
}

export async function saveAppSettings(
  updates: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getAppSettings()
  const next = mergeSettings(current, updates)

  await db.settings.put({
    key: 'app',
    value: next,
    updatedAt: nowIso(),
  })

  return next
}

export async function saveFood(draft: FoodDraft): Promise<Food> {
  const cleanedBarcode = draft.barcode ? cleanBarcode(draft.barcode) : undefined
  const timestamp = nowIso()
  const existingById = draft.id ? await db.foods.get(draft.id) : undefined
  const existingByBarcode =
    !existingById && cleanedBarcode
      ? await db.foods.where('barcode').equals(cleanedBarcode).first()
      : undefined
  const existing = existingById ?? existingByBarcode

  const food: Food = {
    id: existing?.id ?? createId(),
    name: draft.name.trim(),
    brand: draft.brand?.trim() || undefined,
    barcode: cleanedBarcode || undefined,
    servingLabel: draft.servingLabel.trim() || '1 serving',
    calories: roundValue(draft.calories, 1),
    protein: roundValue(draft.protein, 1),
    carbs: roundValue(draft.carbs, 1),
    fat: roundValue(draft.fat, 1),
    notes: draft.notes?.trim() || undefined,
    source: draft.source,
    favorite: draft.favorite ?? existing?.favorite ?? false,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    lastUsedAt: draft.lastUsedAt ?? existing?.lastUsedAt,
  }

  await db.foods.put(food)
  return food
}

export async function toggleFoodFavorite(id: string, favorite: boolean) {
  await db.foods.update(id, {
    favorite,
    updatedAt: nowIso(),
  })
}

export async function addMealEntry(input: AddMealEntryInput) {
  const timestamp = nowIso()
  const servings = Math.max(0.25, roundValue(input.servings, 2))

  const entry = {
    id: createId(),
    dayKey: toDayKey(input.occurredAt),
    occurredAt: input.occurredAt,
    mealType: input.mealType,
    servings,
    foodId: input.food.id,
    foodName: input.food.name,
    brand: input.food.brand,
    barcode: input.food.barcode,
    servingLabel: input.food.servingLabel,
    calories: input.food.calories,
    protein: input.food.protein,
    carbs: input.food.carbs,
    fat: input.food.fat,
    notes: input.notes?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.transaction('rw', db.mealEntries, db.foods, async () => {
    await db.mealEntries.add(entry)
    await db.foods.update(input.food.id, {
      lastUsedAt: timestamp,
    })
  })

  return entry
}

export async function deleteMealEntry(id: string) {
  await db.mealEntries.delete(id)
}

export async function saveWeightEntry(draft: WeightEntryDraft): Promise<WeightEntry> {
  const timestamp = nowIso()
  const existing = await db.weightEntries.where('date').equals(draft.date).first()

  const entry: WeightEntry = {
    id: existing?.id ?? createId(),
    date: draft.date,
    weightKg: roundValue(draft.weightKg, 2),
    note: draft.note?.trim() || undefined,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }

  await db.weightEntries.put(entry)
  return entry
}

export async function saveStepsEntry(draft: StepsEntryDraft): Promise<StepsEntry> {
  const timestamp = nowIso()
  const existing = await db.stepsEntries.where('date').equals(draft.date).first()
  const caloriesBurned = calculateStepsCaloriesBurned(
    Math.max(0, Math.round(draft.steps)),
    draft.referenceWeightKg ?? DEFAULT_SETTINGS.profile.weightGoalKg ?? 75,
    draft.stepLengthMeters,
  )

  const entry: StepsEntry = {
    id: existing?.id ?? createId(),
    date: draft.date,
    steps: Math.max(0, Math.round(draft.steps)),
    caloriesBurned,
    note: draft.note?.trim() || undefined,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }

  await db.stepsEntries.put(entry)
  return entry
}

export async function deleteStepsEntry(id: string) {
  await db.stepsEntries.delete(id)
}

export async function deleteWeightEntry(id: string) {
  await db.weightEntries.delete(id)
}

export async function saveWorkoutTemplate(
  draft: WorkoutTemplateDraft,
): Promise<WorkoutTemplate> {
  const timestamp = nowIso()
  const existing = draft.id ? await db.workoutTemplates.get(draft.id) : undefined
  const template: WorkoutTemplate = {
    id: existing?.id ?? createId(),
    name: draft.name.trim(),
    focus: draft.focus.trim(),
    programName: draft.programName?.trim() || undefined,
    phaseName: draft.phaseName?.trim() || undefined,
    dayLabel: draft.dayLabel?.trim() || undefined,
    sessionType: draft.sessionType ?? existing?.sessionType ?? 'mixed',
    intensity: draft.intensity ?? existing?.intensity ?? 'moderate',
    exercises: draft.exercises.map((exercise) => ({
      ...exercise,
      id: exercise.id || createId(),
      name: exercise.name.trim(),
      target: exercise.target?.trim() || undefined,
      note: exercise.note?.trim() || undefined,
    })),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }

  await db.workoutTemplates.put(template)
  return template
}

export async function deleteWorkoutTemplate(id: string) {
  await db.workoutTemplates.delete(id)
}

export async function saveWorkoutSession(
  draft: WorkoutSessionDraft,
): Promise<WorkoutSession> {
  const timestamp = nowIso()
  const existing = draft.id ? await db.workoutSessions.get(draft.id) : undefined
  const roundedDurationMinutes = Math.max(1, roundValue(draft.durationMinutes, 0))
  const sessionType = draft.sessionType ?? 'mixed'
  const intensity = draft.intensity ?? 'moderate'
  const session: WorkoutSession = {
    id: existing?.id ?? draft.id ?? createId(),
    templateId: draft.templateId ?? existing?.templateId,
    name: draft.name.trim(),
    focus: draft.focus.trim(),
    programName: draft.programName?.trim() || undefined,
    phaseName: draft.phaseName?.trim() || undefined,
    dayLabel: draft.dayLabel?.trim() || undefined,
    sessionType,
    intensity,
    occurredAt: draft.occurredAt,
    exercises: draft.exercises.map((exercise) => ({
      ...exercise,
      id: exercise.id || createId(),
      name: exercise.name.trim(),
      note: exercise.note?.trim() || undefined,
      sets: exercise.sets ? Math.round(exercise.sets) : undefined,
      reps: exercise.reps ? Math.round(exercise.reps) : undefined,
      weightKg: exercise.weightKg ? roundValue(exercise.weightKg, 2) : undefined,
      durationMinutes: exercise.durationMinutes
        ? roundValue(exercise.durationMinutes, 1)
        : undefined,
      distanceKm: exercise.distanceKm ? roundValue(exercise.distanceKm, 2) : undefined,
    })),
    durationMinutes: roundedDurationMinutes,
    energyLevel: Math.min(5, Math.max(1, Math.round(draft.energyLevel))),
    caloriesBurned:
      draft.calorieOverride ??
      calculateWorkoutCaloriesBurned(
        roundedDurationMinutes,
        draft.referenceWeightKg ?? DEFAULT_SETTINGS.profile.weightGoalKg ?? 75,
        sessionType,
        intensity,
      ),
    note: draft.note?.trim() || undefined,
    totalVolumeKg: calculateWorkoutVolume(draft.exercises),
    createdAt: existing?.createdAt ?? timestamp,
  }

  await db.workoutSessions.put(session)
  return session
}

export async function deleteWorkoutSession(id: string) {
  await db.workoutSessions.delete(id)
}

export async function exportBackup(): Promise<AppBackup> {
  const [foods, mealEntries, weightEntries, stepsEntries, workoutTemplates, workoutSessions, settings] =
    await Promise.all([
      db.foods.toArray(),
      db.mealEntries.toArray(),
      db.weightEntries.toArray(),
      db.stepsEntries.toArray(),
      db.workoutTemplates.toArray(),
      db.workoutSessions.toArray(),
      db.settings.get('app'),
    ])

  return {
    version: 1,
    exportedAt: nowIso(),
    foods,
    mealEntries,
    weightEntries,
    stepsEntries,
    workoutTemplates,
    workoutSessions,
    settings:
      settings ?? {
        key: 'app',
        value: DEFAULT_SETTINGS,
        updatedAt: nowIso(),
      },
  }
}

export async function importBackup(rawText: string) {
  const parsed = JSON.parse(rawText) as Partial<AppBackup>

  if (!Array.isArray(parsed.foods) || !Array.isArray(parsed.mealEntries)) {
    throw new Error('This backup file is missing meal or food data.')
  }

  if (
    !Array.isArray(parsed.weightEntries) ||
    !Array.isArray(parsed.workoutTemplates) ||
    !Array.isArray(parsed.workoutSessions)
  ) {
    throw new Error('This backup file is missing required fitness records.')
  }

  const settingsRecord =
    parsed.settings && typeof parsed.settings === 'object' && parsed.settings.key === 'app'
      ? (parsed.settings as SettingRecord<AppSettings>)
      : {
          key: 'app',
          value: DEFAULT_SETTINGS,
          updatedAt: nowIso(),
        }

  const foods = parsed.foods
  const mealEntries = parsed.mealEntries
  const weightEntries = parsed.weightEntries
  const stepsEntries = Array.isArray(parsed.stepsEntries) ? parsed.stepsEntries : []
  const workoutTemplates = parsed.workoutTemplates
  const workoutSessions = parsed.workoutSessions

  await db.transaction(
    'rw',
    [
      db.foods,
      db.mealEntries,
      db.weightEntries,
      db.stepsEntries,
      db.workoutTemplates,
      db.workoutSessions,
      db.settings,
    ],
    async () => {
      await Promise.all([
        db.foods.clear(),
        db.mealEntries.clear(),
        db.weightEntries.clear(),
        db.stepsEntries.clear(),
        db.workoutTemplates.clear(),
        db.workoutSessions.clear(),
        db.settings.clear(),
      ])

      if (foods.length > 0) {
        await db.foods.bulkPut(foods)
      }

      if (mealEntries.length > 0) {
        await db.mealEntries.bulkPut(mealEntries)
      }

      if (weightEntries.length > 0) {
        await db.weightEntries.bulkPut(weightEntries)
      }

      if (stepsEntries.length > 0) {
        await db.stepsEntries.bulkPut(stepsEntries)
      }

      if (workoutTemplates.length > 0) {
        await db.workoutTemplates.bulkPut(workoutTemplates)
      }

      if (workoutSessions.length > 0) {
        await db.workoutSessions.bulkPut(workoutSessions)
      }

      await db.settings.put(settingsRecord)
    },
  )
}