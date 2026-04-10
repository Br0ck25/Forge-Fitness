import { LoaderCircle, PencilLine, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { FoodEditorSheet } from '../../components/ui/food-editor-sheet'
import { Card } from '../../components/ui/card'
import { EmptyState } from '../../components/ui/empty-state'
import { useAppStore } from '../../store/app-store'
import type { FoodDraft } from '../../types/domain'
import { formatDate } from '../../utils/date'
import { createBlankFood } from '../../utils/defaults'
import { searchFoods } from '../../utils/openFoodFacts'

export function SearchPage() {
  const { addLogEntry, saveFavorite, selectedDate } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodDraft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [editorFood, setEditorFood] = useState<FoodDraft | null>(null)

  async function handleSearch(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (!query.trim()) {
      setResults([])
      setError('Enter a food name to search.')
      return
    }

    setIsLoading(true)
    setError(undefined)

    try {
      const items = await searchFoods(query)
      setResults(items)
      if (items.length === 0) {
        setError('Nothing matched that search. Try a broader term or add it manually.')
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'Search is unavailable right now. You can still add a food manually.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave({
    food,
    meal,
    quantity,
    saveFavorite: shouldSaveFavorite,
  }: {
    food: FoodDraft
    meal: import('../../types/domain').MealKey
    quantity: number
    saveFavorite: boolean
  }) {
    await addLogEntry({
      date: selectedDate,
      meal,
      food,
      quantity,
      sourceType: 'food',
    })

    if (shouldSaveFavorite) {
      await saveFavorite(food, { custom: food.source === 'manual' })
    }

    setEditorFood(null)
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div>
          <p className="text-base font-semibold text-slate-950">Food search</p>
          <p className="text-sm text-slate-500">
            Search by name, review the nutrition, then add it to {formatDate(selectedDate)}.
          </p>
        </div>

        <form onSubmit={(event) => void handleSearch(event)} className="flex gap-3">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for oats, yogurt, burrito bowl..."
              className="input-field pl-11"
            />
          </label>
          <button type="submit" className="button-primary shrink-0" disabled={isLoading}>
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Search'}
          </button>
        </form>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Search runs only when you tap the button so the app stays fast and respectful of API rate limits.
        </div>

        <button
          type="button"
          onClick={() =>
            setEditorFood({
              ...createBlankFood(),
              name: query.trim(),
            })
          }
          className="button-secondary w-full justify-center"
        >
          <PencilLine className="h-4 w-4" />
          Add manual food instead
        </button>
      </Card>

      {error ? (
        <Card className="p-4">
          <EmptyState
            title="Search note"
            description={error}
            action={
              <button
                type="button"
                onClick={() => setEditorFood({ ...createBlankFood(), name: query.trim() })}
                className="button-primary"
              >
                Manual entry
              </button>
            }
          />
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="flex items-center justify-center gap-3 p-5 text-sm text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Searching Open Food Facts…
        </Card>
      ) : null}

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((food, index) => (
            <Card key={`${food.name}-${food.brand ?? 'brandless'}-${index}`} className="p-4">
              <div className="flex items-start gap-4">
                {food.imageUrl ? (
                  <img
                    src={food.imageUrl}
                    alt=""
                    className="h-16 w-16 rounded-2xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Sparkles className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950">{food.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {food.brand || 'Open Food Facts'} · {food.servingSize}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {food.calories} kcal · P {food.protein} · C {food.carbs} · F {food.fat}
                  </p>
                  {food.incompleteNutrition ? (
                    <p className="mt-2 text-xs font-medium text-amber-600">
                      Missing some nutrition data — review before saving.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditorFood(food)}
                  className="button-primary flex-1 justify-center"
                >
                  Add to log
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void saveFavorite(food, {
                      custom: false,
                    })
                  }
                  className="button-secondary"
                >
                  Save favorite
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {editorFood ? (
        <FoodEditorSheet
          open={Boolean(editorFood)}
          title="Add food to your log"
          initialFood={editorFood}
          allowSaveFavorite
          onClose={() => setEditorFood(null)}
          onSubmit={handleSave}
        />
      ) : null}
    </div>
  )
}
