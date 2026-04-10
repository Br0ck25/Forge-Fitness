import { Heart, PencilLine, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { FoodEditorSheet } from '../../components/ui/food-editor-sheet'
import { MealBuilderModal } from '../../components/ui/meal-builder-modal'
import { Card } from '../../components/ui/card'
import { EmptyState } from '../../components/ui/empty-state'
import { useAppStore } from '../../store/app-store'
import type { CustomMeal, FavoriteFood, FoodDraft, MealKey } from '../../types/domain'
import { mealLabels } from '../../types/domain'
import { formatDate } from '../../utils/date'
import { createBlankFood } from '../../utils/defaults'

export function SavedPage() {
  const {
    addLogEntry,
    customMeals,
    deleteCustomMeal,
    deleteFavorite,
    favorites,
    saveCustomMeal,
    saveFavorite,
    selectedDate,
    settings,
  } = useAppStore()
  const [favoriteEditorOpen, setFavoriteEditorOpen] = useState(false)
  const [editingFavorite, setEditingFavorite] = useState<FavoriteFood | null>(null)
  const [mealBuilderOpen, setMealBuilderOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<CustomMeal | undefined>()

  async function handleAddFavoriteToLog(favorite: FavoriteFood) {
    await addLogEntry({
      date: selectedDate,
      meal: settings.preferredMeal,
      food: favorite,
      quantity: 1,
      sourceType: 'favorite',
      favoriteId: favorite.id,
    })
  }

  async function handleAddMealToLog(meal: CustomMeal) {
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

  async function handleSaveFavorite({ food }: {
    food: FoodDraft
    meal: MealKey
    quantity: number
    saveFavorite: boolean
  }) {
    await saveFavorite(food, {
      id: editingFavorite?.id,
      custom: editingFavorite?.custom ?? food.source === 'manual',
    })
    setFavoriteEditorOpen(false)
    setEditingFavorite(null)
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-base font-semibold text-slate-950">Saved foods & meals</p>
        <p className="text-sm text-slate-500">
          Everything here can be added to {mealLabels[settings.preferredMeal].toLowerCase()} on {formatDate(selectedDate)} in one tap.
        </p>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-500">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">Favorites</p>
              <p className="text-sm text-slate-500">Quick-add foods you use on repeat.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingFavorite(null)
              setFavoriteEditorOpen(true)
            }}
            className="button-primary"
          >
            <Plus className="h-4 w-4" />
            New favorite
          </button>
        </div>

        {favorites.length === 0 ? (
          <EmptyState
            title="No favorites saved yet"
            description="Save your go-to foods from Search, Scan, or create one manually here."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditingFavorite(null)
                  setFavoriteEditorOpen(true)
                }}
                className="button-primary"
              >
                Create favorite
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{favorite.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {favorite.brand || (favorite.custom ? 'Custom food' : 'Saved from API')} · {favorite.servingSize}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {favorite.calories} kcal · P {favorite.protein} · C {favorite.carbs} · F {favorite.fat}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddFavoriteToLog(favorite)}
                    className="button-primary"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFavorite(favorite)
                      setFavoriteEditorOpen(true)
                    }}
                    className="button-secondary"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteFavorite(favorite.id)}
                    className="button-secondary text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">Custom meals</p>
              <p className="text-sm text-slate-500">Bundle multiple foods into one reusable log item.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMeal(undefined)
              setMealBuilderOpen(true)
            }}
            className="button-primary"
          >
            <Plus className="h-4 w-4" />
            New meal
          </button>
        </div>

        {customMeals.length === 0 ? (
          <EmptyState
            title="No custom meals yet"
            description="Create reusable combinations like protein shake, breakfast bowl, or go-to lunch."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditingMeal(undefined)
                  setMealBuilderOpen(true)
                }}
                className="button-primary"
              >
                Build a meal
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {customMeals.map((meal) => (
              <div
                key={meal.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{meal.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {meal.items.length} items · {meal.servingSize}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {meal.totals.calories} kcal · P {meal.totals.protein} · C {meal.totals.carbs} · F {meal.totals.fat}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddMealToLog(meal)}
                    className="button-primary"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMeal(meal)
                      setMealBuilderOpen(true)
                    }}
                    className="button-secondary"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteCustomMeal(meal.id)}
                    className="button-secondary text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <FoodEditorSheet
        open={favoriteEditorOpen}
        title={editingFavorite ? 'Edit favorite' : 'Create favorite'}
        initialFood={editingFavorite ?? createBlankFood()}
        showMealPicker={false}
        showQuantity={false}
        submitLabel={editingFavorite ? 'Save favorite' : 'Create favorite'}
        onClose={() => {
          setFavoriteEditorOpen(false)
          setEditingFavorite(null)
        }}
        onSubmit={handleSaveFavorite}
      />

      <MealBuilderModal
        open={mealBuilderOpen}
        favorites={favorites}
        initialMeal={editingMeal}
        onClose={() => {
          setMealBuilderOpen(false)
          setEditingMeal(undefined)
        }}
        onSave={async (meal) => {
          await saveCustomMeal(meal)
          setMealBuilderOpen(false)
          setEditingMeal(undefined)
        }}
      />
    </div>
  )
}
