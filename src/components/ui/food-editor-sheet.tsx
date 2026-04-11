import { useEffect, useState } from 'react'
import type { FoodDraft, MealKey } from '../../types/domain'
import { MEAL_ORDER, mealLabels } from '../../types/domain'
import { calculateMacroCalories } from '../../utils/calculations'
import { Modal } from './modal'

interface FoodEditorSheetProps {
  open: boolean
  title: string
  initialFood: FoodDraft
  defaultMeal?: MealKey
  initialQuantity?: number
  submitLabel?: string
  showMealPicker?: boolean
  showQuantity?: boolean
  allowSaveFavorite?: boolean
  onClose: () => void
  onSubmit: (payload: {
    food: FoodDraft
    meal: MealKey
    quantity: number
    saveFavorite: boolean
  }) => Promise<void> | void
}

export function FoodEditorSheet({
  allowSaveFavorite = false,
  defaultMeal = 'snacks',
  initialFood,
  initialQuantity = 1,
  onClose,
  onSubmit,
  open,
  showMealPicker = true,
  showQuantity = true,
  submitLabel = 'Add to log',
  title,
}: FoodEditorSheetProps) {
  const [food, setFood] = useState<FoodDraft>(initialFood)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [meal, setMeal] = useState<MealKey>(defaultMeal)
  const [saveFavorite, setSaveFavorite] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const macroCalories = calculateMacroCalories(food)
  const calorieDifference = macroCalories - food.calories
  const hasMacroInput = food.protein > 0 || food.carbs > 0 || food.fat > 0

  useEffect(() => {
    if (!open) {
      return
    }

    setFood(initialFood)
    setMeal(defaultMeal)
    setQuantity(initialQuantity)
    setSaveFavorite(false)
  }, [defaultMeal, initialFood, initialQuantity, open])

  async function handleSubmit() {
    if (!food.name.trim()) {
      return
    }

    setIsSaving(true)
    try {
      await onSubmit({
        food: {
          ...food,
          name: food.name.trim(),
          brand: food.brand?.trim() || undefined,
          servingSize: food.servingSize.trim() || '1 serving',
        },
        meal,
        quantity: quantity > 0 ? quantity : 1,
        saveFavorite,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  function updateNumberField(field: 'calories' | 'protein' | 'carbs' | 'fat', value: string) {
    setFood((current) => ({
      ...current,
      [field]: Math.max(0, Number(value) || 0),
    }))
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="button-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving || !food.name.trim()}
            className="button-primary flex-1 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : submitLabel}
          </button>
        </div>
      }
    >
      {food.notes ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          {food.notes}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">Food name</span>
          <input
            value={food.name}
            onChange={(event) => setFood((current) => ({ ...current, name: event.target.value }))}
            className="input-field"
            placeholder="Chicken wrap"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Brand</span>
          <input
            value={food.brand ?? ''}
            onChange={(event) => setFood((current) => ({ ...current, brand: event.target.value }))}
            className="input-field"
            placeholder="Optional"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Serving size</span>
          <input
            value={food.servingSize}
            onChange={(event) =>
              setFood((current) => ({ ...current, servingSize: event.target.value }))
            }
            className="input-field"
            placeholder="1 serving"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Calories</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={food.calories}
            onChange={(event) => updateNumberField('calories', event.target.value)}
            className="input-field"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Protein (g)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={food.protein}
            onChange={(event) => updateNumberField('protein', event.target.value)}
            className="input-field"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Carbs (g)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={food.carbs}
            onChange={(event) => updateNumberField('carbs', event.target.value)}
            className="input-field"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Fat (g)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={food.fat}
            onChange={(event) => updateNumberField('fat', event.target.value)}
            className="input-field"
          />
        </label>

        {hasMacroInput ? (
          <div className="sm:col-span-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">Macro math</p>
                <p className="mt-1 text-sm text-slate-600">
                  Protein, carbs, and fat add up to {macroCalories} kcal.
                </p>
              </div>
              {Math.abs(calorieDifference) > 5 ? (
                <button
                  type="button"
                  onClick={() => setFood((current) => ({ ...current, calories: macroCalories }))}
                  className="button-secondary"
                >
                  Use {macroCalories} kcal
                </button>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Calories in sync
                </span>
              )}
            </div>
          </div>
        ) : null}

        {showQuantity ? (
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Servings</span>
            <input
              type="number"
              min="0.25"
              step="0.25"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(Math.max(0.25, Number(event.target.value) || 1))}
              className="input-field"
            />
          </label>
        ) : null}

        {showMealPicker ? (
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Meal</span>
            <select
              value={meal}
              onChange={(event) => setMeal(event.target.value as MealKey)}
              className="input-field"
            >
              {MEAL_ORDER.map((mealKey) => (
                <option key={mealKey} value={mealKey}>
                  {mealLabels[mealKey]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {allowSaveFavorite ? (
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={saveFavorite}
            onChange={(event) => setSaveFavorite(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
          />
          Save to favorites for quick reuse
        </label>
      ) : null}
    </Modal>
  )
}
