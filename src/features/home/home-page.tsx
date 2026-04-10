import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Plus,
  ScanLine,
  Search,
  UtensilsCrossed,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FoodEditorSheet } from '../../components/ui/food-editor-sheet'
import { MacroProgress } from '../../components/ui/macro-progress'
import { MealSection } from '../../components/ui/meal-section'
import { Card } from '../../components/ui/card'
import { useAppStore } from '../../store/app-store'
import type { FoodDraft, LogEntry, MealKey } from '../../types/domain'
import { MEAL_ORDER, mealLabels } from '../../types/domain'
import { calculateDailySummary, resolveGoals } from '../../utils/calculations'
import { formatDate, isToday, shiftDateKey, toDateKey } from '../../utils/date'
import { createBlankFood } from '../../utils/defaults'

interface EditorState {
  mode: 'add' | 'edit'
  meal: MealKey
  food: FoodDraft
  quantity: number
  entry?: LogEntry
}

function QuickShortcut({
  icon: Icon,
  label,
  subtitle,
  to,
}: {
  icon: typeof Search
  label: string
  subtitle: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950">{label}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
    </Link>
  )
}

export function HomePage() {
  const {
    addLogEntry,
    customMeals,
    deleteLogEntry,
    favorites,
    logEntries,
    saveFavorite,
    selectedDate,
    setSelectedDate,
    settings,
    updateLogEntry,
    moveLogEntry,
  } = useAppStore()
  const [editorState, setEditorState] = useState<EditorState | null>(null)

  const dailyEntries = useMemo(
    () => logEntries.filter((entry) => entry.date === selectedDate),
    [logEntries, selectedDate],
  )
  const goals = resolveGoals(settings)
  const summary = calculateDailySummary(dailyEntries, goals)

  const favoritePreview = favorites.slice(0, 4)
  const mealPreview = customMeals.slice(0, 3)

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

    setEditorState(null)
  }

  async function handleQuickAddFavorite(favoriteId: string) {
    const favorite = favorites.find((entry) => entry.id === favoriteId)
    if (!favorite) {
      return
    }

    await addLogEntry({
      date: selectedDate,
      meal: settings.preferredMeal,
      food: favorite,
      quantity: 1,
      sourceType: 'favorite',
      favoriteId: favorite.id,
    })
  }

  async function handleQuickAddMeal(mealId: string) {
    const meal = customMeals.find((entry) => entry.id === mealId)
    if (!meal) {
      return
    }

    await addLogEntry({
      date: selectedDate,
      meal: settings.preferredMeal,
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
            <p className="mt-1 text-sm text-emerald-100/90">{remainingLabel}</p>
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
            <p className="text-sm text-slate-500">Stay on target without the spreadsheet vibes.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEditorState({
                mode: 'add',
                meal: settings.preferredMeal,
                food: createBlankFood(),
                quantity: 1,
              })
            }
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
          to="/scan"
          icon={ScanLine}
          label="Scan"
          subtitle="Barcode logging"
        />
        <QuickShortcut
          to="/search"
          icon={Search}
          label="Search"
          subtitle="Find foods fast"
        />
        <QuickShortcut
          to="/saved"
          icon={Heart}
          label="Favorites"
          subtitle="One-tap repeats"
        />
        <QuickShortcut
          to="/saved"
          icon={UtensilsCrossed}
          label="Meals"
          subtitle="Reuse combos"
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

      <div className="space-y-4">
        {MEAL_ORDER.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={dailyEntries.filter((entry) => entry.meal === meal)}
            onAdd={() =>
              setEditorState({
                mode: 'add',
                meal,
                food: createBlankFood(),
                quantity: 1,
              })
            }
            onEdit={(entry) =>
              setEditorState({
                mode: 'edit',
                meal: entry.meal,
                food: entry.item,
                quantity: entry.quantity,
                entry,
              })
            }
            onDelete={(entryId) => void deleteLogEntry(entryId)}
            onMove={(entryId, nextMeal) => void moveLogEntry(entryId, nextMeal)}
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
    </>
  )
}
