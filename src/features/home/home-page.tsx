import {
  ChevronLeft,
  ChevronRight,
  Heart,
  PencilLine,
  Plus,
  ScanLine,
  Scale,
  Search,
  UtensilsCrossed,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FoodEditorSheet } from '../../components/ui/food-editor-sheet'
import { MacroProgress } from '../../components/ui/macro-progress'
import { MealSection } from '../../components/ui/meal-section'
import { Card } from '../../components/ui/card'
import { EmptyState } from '../../components/ui/empty-state'
import { Modal } from '../../components/ui/modal'
import { useAppStore } from '../../store/app-store'
import type { FoodDraft, LogEntry, MealKey, WeightEntry } from '../../types/domain'
import { MEAL_ORDER, mealLabels } from '../../types/domain'
import { calculateDailySummary, resolveGoals } from '../../utils/calculations'
import { formatDate, isToday, shiftDateKey, toDateKey } from '../../utils/date'
import { createBlankFood } from '../../utils/defaults'
import { formatWeight, kgToLb, lbToKg } from '../../utils/units'

interface EditorState {
  mode: 'add' | 'edit'
  meal: MealKey
  food: FoodDraft
  quantity: number
  entry?: LogEntry
}

interface QuickLogState {
  meal: MealKey
  view: 'menu' | 'favorites' | 'meals'
}

interface WeightEditorState {
  entry?: WeightEntry
  weight: number
}

function QuickShortcut({
  icon: Icon,
  label,
  subtitle,
  onClick,
  to,
}: {
  icon: typeof Search
  label: string
  subtitle: string
  to?: string
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950">{label}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      {content}
    </button>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const {
    addLogEntry,
    customMeals,
    deleteLogEntry,
    deleteWeightEntry,
    favorites,
    logEntries,
    notify,
    saveFavorite,
    selectedDate,
    setSelectedDate,
    settings,
    updateLogEntry,
    moveLogEntry,
    addWeightEntry,
    updateWeightEntry,
    weightEntries,
  } = useAppStore()
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [quickLogState, setQuickLogState] = useState<QuickLogState | null>(null)
  const [weightEditorState, setWeightEditorState] = useState<WeightEditorState | null>(null)

  const selectedWeightEntry = useMemo(
    () => weightEntries.find((entry) => entry.date === selectedDate),
    [weightEntries, selectedDate],
  )

  const dailyEntries = useMemo(
    () => logEntries.filter((entry) => entry.date === selectedDate),
    [logEntries, selectedDate],
  )
  const goals = resolveGoals(settings)
  const summary = calculateDailySummary(dailyEntries, goals)

  const favoritePreview = favorites.slice(0, 4)
  const mealPreview = customMeals.slice(0, 3)

  function openManualEntry(meal: MealKey) {
    setQuickLogState(null)
    setEditorState({
      mode: 'add',
      meal,
      food: createBlankFood(),
      quantity: 1,
    })
  }

  function openQuickLog(meal: MealKey, view: QuickLogState['view'] = 'menu') {
    setQuickLogState({ meal, view })
  }

  function closeQuickLog() {
    setQuickLogState(null)
  }

  function openWeightEntry(entry?: WeightEntry) {
    const currentWeightKg = entry?.weightKg ?? settings.profile.weightKg ?? 0
    const initialWeight = settings.units.weight === 'lb'
      ? Math.round(kgToLb(currentWeightKg) * 10) / 10
      : Math.round(currentWeightKg * 10) / 10

    setQuickLogState(null)
    setWeightEditorState({ entry, weight: initialWeight })
  }

  async function handleSubmitWeight() {
    if (!weightEditorState) {
      return
    }

    const enteredWeight = weightEditorState.weight
    if (!(enteredWeight > 0)) {
      return
    }

    const weightKg = settings.units.weight === 'lb' ? lbToKg(enteredWeight) : enteredWeight

    if (weightEditorState.entry) {
      await updateWeightEntry(weightEditorState.entry.id, { weightKg })
      notify({
        title: 'Weight updated',
        description: `${formatWeight(weightKg, settings.units.weight)} saved for ${formatDate(selectedDate)}.`,
      })
    } else {
      await addWeightEntry({ date: selectedDate, weightKg })
      notify({
        title: 'Weight logged',
        description: `${formatWeight(weightKg, settings.units.weight)} added for ${formatDate(selectedDate)}.`,
      })
    }

    setWeightEditorState(null)
  }

  async function handleDeleteWeightEntry(id: string) {
    await deleteWeightEntry(id)
    notify({
      title: 'Weight removed',
      description: `Daily weight entry deleted for ${formatDate(selectedDate)}.`,
      tone: 'info',
    })
  }

  function openSearchForMeal(meal: MealKey) {
    closeQuickLog()
    navigate(`/search?meal=${encodeURIComponent(meal)}`)
  }

  function openScanForMeal(meal: MealKey) {
    closeQuickLog()
    navigate(`/scan?meal=${encodeURIComponent(meal)}`)
  }

  async function handleSubmitEntry({
    food,
    meal,
    quantity,
    saveFavorite: shouldSaveFavorite,
  }: {
    food: FoodDraft
    meal: MealKey
    quantity: number
    saveFavorite: boolean
  }) {
    if (editorState?.mode === 'edit' && editorState.entry) {
      await updateLogEntry(editorState.entry.id, {
        item: food,
        meal,
        quantity,
      })
    } else {
      await addLogEntry({
        date: selectedDate,
        meal,
        food,
        quantity,
        sourceType: 'food',
      })
    }

    if (shouldSaveFavorite) {
      await saveFavorite(food, { custom: food.source === 'manual' })
    }

    notify({
      title: editorState?.mode === 'edit' ? 'Entry updated' : shouldSaveFavorite ? 'Added + saved favorite' : 'Food added',
      description:
        editorState?.mode === 'edit'
          ? `${food.name} was updated in ${mealLabels[meal].toLowerCase()}.`
          : shouldSaveFavorite
            ? `${food.name} was added to ${mealLabels[meal].toLowerCase()} and saved for quick reuse.`
            : `${food.name} was added to ${mealLabels[meal].toLowerCase()} on ${formatDate(selectedDate)}.`,
    })

    setEditorState(null)
  }

  async function handleQuickAddFavorite(favoriteId: string, meal = settings.preferredMeal) {
    const favorite = favorites.find((entry) => entry.id === favoriteId)
    if (!favorite) {
      return
    }

    await addLogEntry({
      date: selectedDate,
      meal,
      food: favorite,
      quantity: 1,
      sourceType: 'favorite',
      favoriteId: favorite.id,
    })

    notify({
      title: 'Favorite added',
      description: `${favorite.name} was added to ${mealLabels[meal].toLowerCase()}.`,
    })
  }

  async function handleQuickAddMeal(mealId: string, targetMeal = settings.preferredMeal) {
    const savedMeal = customMeals.find((entry) => entry.id === mealId)
    if (!savedMeal) {
      return
    }

    await addLogEntry({
      date: selectedDate,
      meal: targetMeal,
      food: {
        ...savedMeal.totals,
        name: savedMeal.name,
        servingSize: savedMeal.servingSize,
        source: 'custom-meal',
        notes: `${savedMeal.items.length} item meal`,
      },
      quantity: 1,
      sourceType: 'meal',
      mealId: savedMeal.id,
    })

    notify({
      title: 'Meal added',
      description: `${savedMeal.name} was added to ${mealLabels[targetMeal].toLowerCase()}.`,
    })
  }

  async function handleDeleteEntry(entry: LogEntry) {
    const confirmed = window.confirm(`Delete ${entry.item.name} from your log?`)
    if (!confirmed) {
      return
    }

    await deleteLogEntry(entry.id)
    notify({
      title: 'Entry deleted',
      description: `${entry.item.name} was removed from ${mealLabels[entry.meal].toLowerCase()}.`,
      tone: 'info',
    })
  }

  async function handleMoveEntry(entryId: string, nextMeal: MealKey) {
    const entry = dailyEntries.find((item) => item.id === entryId)
    if (!entry || entry.meal === nextMeal) {
      return
    }

    await moveLogEntry(entryId, nextMeal)
    notify({
      title: 'Entry moved',
      description: `${entry.item.name} was moved to ${mealLabels[nextMeal].toLowerCase()}.`,
      tone: 'info',
    })
  }

  const remainingCalories = summary.remaining.calories
  const remainingLabel =
    remainingCalories >= 0
      ? `${remainingCalories} kcal left`
      : `${Math.abs(remainingCalories)} kcal over`

  return (
    <>
      <Card className="space-y-4 overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-emerald-900 p-5 text-white shadow-xl shadow-emerald-950/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-100">Daily dashboard</p>
            <p className="text-3xl font-semibold tracking-tight">{summary.consumed.calories} kcal</p>
            <p className="mt-1 text-sm text-emerald-100/90">
              {remainingLabel} · {goals.source === 'auto' ? 'Auto calorie target' : 'Manual calorie target'}
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 px-4 py-3 text-right backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">Goal</p>
            <p className="mt-1 text-2xl font-semibold">{summary.calorieTarget}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedDate(shiftDateKey(selectedDate, -1))}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/15"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(shiftDateKey(selectedDate, 1))}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/15"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">
              {isToday(selectedDate) ? 'Today' : 'Log date'}
            </p>
            <p className="mt-1 text-base font-semibold">{formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          {!isToday(selectedDate) ? (
            <button
              type="button"
              onClick={() => setSelectedDate(toDateKey())}
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-950"
            >
              Jump to today
            </button>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-950">Macros</p>
            <p className="text-sm text-slate-500">
              {goals.macroMode === 'auto'
                ? 'Auto-balanced to match your calorie target.'
                : 'Tracking against your manual macro goals.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openQuickLog(settings.preferredMeal)}
            className="button-secondary"
          >
            <Plus className="h-4 w-4" />
            Quick add
          </button>
        </div>

        <MacroProgress
          label="Protein"
          current={summary.consumed.protein}
          target={goals.protein}
          accentClass="bg-emerald-500"
        />
        <MacroProgress
          label="Carbs"
          current={summary.consumed.carbs}
          target={goals.carbs}
          accentClass="bg-sky-500"
        />
        <MacroProgress
          label="Fat"
          current={summary.consumed.fat}
          target={goals.fat}
          accentClass="bg-amber-500"
        />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <QuickShortcut
          icon={PencilLine}
          label="Manual"
          subtitle="Quick entry"
          onClick={() => openManualEntry(settings.preferredMeal)}
        />
        <QuickShortcut
          icon={ScanLine}
          label="Scan"
          subtitle="Barcode logging"
          onClick={() => openScanForMeal(settings.preferredMeal)}
        />
        <QuickShortcut
          icon={Search}
          label="Search"
          subtitle="Find foods fast"
          onClick={() => openSearchForMeal(settings.preferredMeal)}
        />
        <QuickShortcut
          icon={Heart}
          label="Favorites"
          subtitle="One-tap repeats"
          onClick={() => openQuickLog(settings.preferredMeal, 'favorites')}
        />
        <QuickShortcut
          icon={Scale}
          label="Weight"
          subtitle="Daily progress"
          onClick={() => openWeightEntry(selectedWeightEntry)}
        />
        <QuickShortcut
          icon={UtensilsCrossed}
          label="Meals"
          subtitle="Reuse combos"
          onClick={() => openQuickLog(settings.preferredMeal, 'meals')}
        />
      </div>

      {favoritePreview.length > 0 ? (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-950">Favorite shortcuts</p>
              <p className="text-sm text-slate-500">Adds to {mealLabels[settings.preferredMeal].toLowerCase()} on {formatDate(selectedDate)}.</p>
            </div>
            <Link to="/saved" className="text-sm font-semibold text-emerald-600">
              See all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {favoritePreview.map((favorite) => (
              <button
                key={favorite.id}
                type="button"
                onClick={() => void handleQuickAddFavorite(favorite.id)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <p className="text-sm font-semibold text-slate-950">{favorite.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {favorite.calories} kcal · P {favorite.protein} · C {favorite.carbs} · F {favorite.fat}
                </p>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {mealPreview.length > 0 ? (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-950">Reusable meals</p>
              <p className="text-sm text-slate-500">Perfect for shakes, bowls, and your usuals.</p>
            </div>
            <Link to="/saved" className="text-sm font-semibold text-emerald-600">
              Edit meals
            </Link>
          </div>
          <div className="space-y-3">
            {mealPreview.map((meal) => (
              <button
                key={meal.id}
                type="button"
                onClick={() => void handleQuickAddMeal(meal.id)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{meal.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {meal.items.length} items · {meal.servingSize}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{meal.totals.calories} kcal</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-slate-950">Weight</p>
            <p className="text-sm text-slate-500">Record your daily weight for progress tracking.</p>
          </div>
          <button
            type="button"
            onClick={() => openWeightEntry(selectedWeightEntry)}
            className="button-secondary text-sm"
          >
            {selectedWeightEntry ? 'Update weight' : 'Log weight'}
          </button>
        </div>

        {selectedWeightEntry ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-3xl font-semibold text-slate-950">
                  {formatWeight(selectedWeightEntry.weightKg, settings.units.weight)}
                </p>
                <p className="mt-1 text-sm text-slate-500">Logged for {formatDate(selectedDate)}.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openWeightEntry(selectedWeightEntry)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteWeightEntry(selectedWeightEntry.id)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-rose-600 transition hover:border-rose-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No weight logged today"
            description="Add your daily weight to track progress."
          />
        )}
      </Card>

      <div className="space-y-4">
        {MEAL_ORDER.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={dailyEntries.filter((entry) => entry.meal === meal)}
            onAdd={() => openQuickLog(meal)}
            onEdit={(entry) =>
              setEditorState({
                mode: 'edit',
                meal: entry.meal,
                food: entry.item,
                quantity: entry.quantity,
                entry,
              })
            }
            onDelete={(entryId) => {
              const entry = dailyEntries.find((item) => item.id === entryId)
              if (entry) {
                void handleDeleteEntry(entry)
              }
            }}
            onMove={(entryId, nextMeal) => void handleMoveEntry(entryId, nextMeal)}
          />
        ))}
      </div>

      {editorState ? (
        <FoodEditorSheet
          open={Boolean(editorState)}
          title={editorState.mode === 'edit' ? 'Edit log entry' : 'Quick manual entry'}
          initialFood={editorState.food}
          defaultMeal={editorState.meal}
          initialQuantity={editorState.quantity}
          allowSaveFavorite
          submitLabel={editorState.mode === 'edit' ? 'Save changes' : 'Add to log'}
          onClose={() => setEditorState(null)}
          onSubmit={handleSubmitEntry}
        />
      ) : null}

      {quickLogState?.view === 'menu' ? (
        <Modal
          open={Boolean(quickLogState)}
          title={`Quick log for ${mealLabels[quickLogState.meal]}`}
          onClose={closeQuickLog}
          footer={
            <button type="button" onClick={closeQuickLog} className="button-secondary w-full justify-center">
              Cancel
            </button>
          }
        >
          <p className="text-sm text-slate-500">
            Choose the fastest way to add something to {mealLabels[quickLogState.meal].toLowerCase()}.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => openManualEntry(quickLogState.meal)} className="button-secondary min-h-24 flex-col text-center">
              <PencilLine className="h-5 w-5" />
              Manual entry
            </button>
            <button type="button" onClick={() => openScanForMeal(quickLogState.meal)} className="button-secondary min-h-24 flex-col text-center">
              <ScanLine className="h-5 w-5" />
              Barcode scanner
            </button>
            <button type="button" onClick={() => openSearchForMeal(quickLogState.meal)} className="button-secondary min-h-24 flex-col text-center">
              <Search className="h-5 w-5" />
              Search foods
            </button>
            <button type="button" onClick={() => openQuickLog(quickLogState.meal, 'favorites')} className="button-secondary min-h-24 flex-col text-center">
              <Heart className="h-5 w-5" />
              Choose favorite
            </button>
            <button type="button" onClick={() => { closeQuickLog(); openWeightEntry(selectedWeightEntry) }} className="button-secondary min-h-24 flex-col text-center">
              <Scale className="h-5 w-5" />
              Log weight
            </button>
            <button type="button" onClick={() => openQuickLog(quickLogState.meal, 'meals')} className="button-secondary col-span-2 min-h-24 flex-col text-center">
              <UtensilsCrossed className="h-5 w-5" />
              Choose meal
            </button>
          </div>
        </Modal>
      ) : null}

      {weightEditorState ? (
        <Modal
          open={Boolean(weightEditorState)}
          title={weightEditorState.entry ? 'Update weight' : 'Log weight'}
          onClose={() => setWeightEditorState(null)}
          footer={
            <div className="flex gap-3">
              <button type="button" onClick={() => setWeightEditorState(null)} className="button-secondary flex-1 justify-center">
                Cancel
              </button>
              <button type="button" onClick={handleSubmitWeight} className="button-primary flex-1 justify-center">
                Save weight
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-500">
            Enter your weight for {formatDate(selectedDate)}.
          </p>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-medium text-slate-700">
              Weight ({settings.units.weight === 'lb' ? 'lb' : 'kg'})
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={weightEditorState.weight}
              onChange={(event) => setWeightEditorState({
                ...weightEditorState,
                weight: Number(event.target.value),
              })}
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </Modal>
      ) : null}

      {quickLogState?.view === 'favorites' ? (
        <Modal
          open={Boolean(quickLogState)}
          title={`Favorites for ${mealLabels[quickLogState.meal]}`}
          onClose={closeQuickLog}
          footer={
            <div className="flex gap-3">
              <button type="button" onClick={() => openQuickLog(quickLogState.meal)} className="button-secondary flex-1 justify-center">
                Back
              </button>
              <button type="button" onClick={closeQuickLog} className="button-secondary flex-1 justify-center">
                Close
              </button>
            </div>
          }
        >
          {favorites.length === 0 ? (
            <EmptyState
              title="No favorites saved yet"
              description="Save foods first, then you can add them here in one tap."
              action={
                <button
                  type="button"
                  onClick={() => {
                    closeQuickLog()
                    navigate('/saved')
                  }}
                  className="button-primary"
                >
                  Open Saved
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {favorites.map((favorite) => (
                <button
                  key={favorite.id}
                  type="button"
                  onClick={() =>
                    void (async () => {
                      await handleQuickAddFavorite(favorite.id, quickLogState.meal)
                      closeQuickLog()
                    })()
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{favorite.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {favorite.brand || 'Saved favorite'} · {favorite.servingSize}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{favorite.calories} kcal</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    P {favorite.protein} · C {favorite.carbs} · F {favorite.fat}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Modal>
      ) : null}

      {quickLogState?.view === 'meals' ? (
        <Modal
          open={Boolean(quickLogState)}
          title={`Meals for ${mealLabels[quickLogState.meal]}`}
          onClose={closeQuickLog}
          footer={
            <div className="flex gap-3">
              <button type="button" onClick={() => openQuickLog(quickLogState.meal)} className="button-secondary flex-1 justify-center">
                Back
              </button>
              <button type="button" onClick={closeQuickLog} className="button-secondary flex-1 justify-center">
                Close
              </button>
            </div>
          }
        >
          {customMeals.length === 0 ? (
            <EmptyState
              title="No reusable meals yet"
              description="Build a saved meal first, then you can add it here in one tap."
              action={
                <button
                  type="button"
                  onClick={() => {
                    closeQuickLog()
                    navigate('/saved')
                  }}
                  className="button-primary"
                >
                  Open Saved
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {customMeals.map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() =>
                    void (async () => {
                      await handleQuickAddMeal(meal.id, quickLogState.meal)
                      closeQuickLog()
                    })()
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{meal.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {meal.items.length} items · {meal.servingSize}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{meal.totals.calories} kcal</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    P {meal.totals.protein} · C {meal.totals.carbs} · F {meal.totals.fat}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Modal>
      ) : null}
    </>
  )
}
