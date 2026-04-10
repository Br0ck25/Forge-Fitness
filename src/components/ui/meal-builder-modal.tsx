import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CustomMeal, FavoriteFood, FoodDraft } from '../../types/domain'
import { createId } from '../../utils/id'
import { calculateCustomMealTotals } from '../../utils/nutrition'
import { Card } from './card'
import { EmptyState } from './empty-state'
import { FoodEditorSheet } from './food-editor-sheet'
import { Modal } from './modal'

interface MealBuilderModalProps {
  open: boolean
  favorites: FavoriteFood[]
  initialMeal?: CustomMeal
  onClose: () => void
  onSave: (meal: {
    id?: string
    name: string
    servingSize: string
    items: CustomMeal['items']
  }) => Promise<void> | void
}

const blankFood: FoodDraft = {
  name: '',
  brand: '',
  servingSize: '1 serving',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  source: 'manual',
}

export function MealBuilderModal({
  favorites,
  initialMeal,
  onClose,
  onSave,
  open,
}: MealBuilderModalProps) {
  const [name, setName] = useState('')
  const [servingSize, setServingSize] = useState('1 meal')
  const [items, setItems] = useState<CustomMeal['items']>([])
  const [selectedFavoriteId, setSelectedFavoriteId] = useState('')
  const [favoriteQuantity, setFavoriteQuantity] = useState(1)
  const [manualEditorOpen, setManualEditorOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setName(initialMeal?.name ?? '')
    setServingSize(initialMeal?.servingSize ?? '1 meal')
    setItems(initialMeal?.items ?? [])
    setSelectedFavoriteId(favorites[0]?.id ?? '')
    setFavoriteQuantity(1)
  }, [favorites, initialMeal, open])

  const totals = useMemo(() => calculateCustomMealTotals(items), [items])

  function addFavoriteItem() {
    const favorite = favorites.find((entry) => entry.id === selectedFavoriteId)
    if (!favorite) {
      return
    }

    setItems((current) => [
      ...current,
      {
        id: createId('meal-item'),
        quantity: favoriteQuantity > 0 ? favoriteQuantity : 1,
        food: favorite,
      },
    ])
  }

  async function handleSave() {
    if (!name.trim() || items.length === 0) {
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        id: initialMeal?.id,
        name: name.trim(),
        servingSize: servingSize.trim() || '1 meal',
        items,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        title={initialMeal ? 'Edit custom meal' : 'Create custom meal'}
        onClose={onClose}
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="button-secondary flex-1">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || !name.trim() || items.length === 0}
              className="button-primary flex-1 disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : initialMeal ? 'Update meal' : 'Save meal'}
            </button>
          </div>
        }
      >
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Meal name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-field"
            placeholder="Protein shake"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">Serving label</span>
          <input
            value={servingSize}
            onChange={(event) => setServingSize(event.target.value)}
            className="input-field"
            placeholder="1 bottle"
          />
        </label>

        <div className="grid gap-3 rounded-3xl bg-slate-50 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Add from favorites</p>
            <p className="text-xs text-slate-500">Great for quick reusable combos.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <select
              value={selectedFavoriteId}
              onChange={(event) => setSelectedFavoriteId(event.target.value)}
              className="input-field"
            >
              {favorites.length === 0 ? <option value="">No favorites yet</option> : null}
              {favorites.map((favorite) => (
                <option key={favorite.id} value={favorite.id}>
                  {favorite.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={favoriteQuantity}
              onChange={(event) => setFavoriteQuantity(Math.max(0.25, Number(event.target.value) || 1))}
              className="input-field w-full sm:w-24"
            />
            <button type="button" onClick={addFavoriteItem} className="button-secondary">
              Add
            </button>
          </div>
          <button
            type="button"
            onClick={() => setManualEditorOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add manual item
          </button>
        </div>

        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Meal totals</p>
              <p className="text-xs text-slate-500">Updates instantly as you build.</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>{totals.calories} kcal</p>
              <p>
                P {totals.protein} • C {totals.carbs} • F {totals.fat}
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="No items added"
              description="Combine favorites and manual foods into a reusable meal."
            />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.food.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.food.servingSize} · {item.food.calories} kcal
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((current) => current.filter((entry) => entry.id !== item.id))
                      }
                      className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Quantity
                    </span>
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={item.quantity}
                      onChange={(event) => {
                        const nextQuantity = Math.max(0.25, Number(event.target.value) || 1)
                        setItems((current) =>
                          current.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, quantity: nextQuantity }
                              : entry,
                          ),
                        )
                      }}
                      className="input-field w-24"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Modal>

      <FoodEditorSheet
        open={manualEditorOpen}
        title="Add manual meal item"
        initialFood={blankFood}
        showMealPicker={false}
        showQuantity={false}
        submitLabel="Add item"
        onClose={() => setManualEditorOpen(false)}
        onSubmit={({ food }) => {
          setItems((current) => [
            ...current,
            {
              id: createId('meal-item'),
              quantity: 1,
              food: { ...food, source: 'manual' },
            },
          ])
          setManualEditorOpen(false)
        }}
      />
    </>
  )
}
