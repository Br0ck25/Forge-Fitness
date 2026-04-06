import { useLiveQuery } from 'dexie-react-hooks'
import { Search, ScanLine, Save, Star, Trash2, WandSparkles } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { BarcodeScannerModal } from '../components/BarcodeScannerModal'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import {
  addMealEntry,
  db,
  deleteMealEntry,
  saveFood,
  toggleFoodFavorite,
} from '../lib/db'
import { lookupBarcodeFood, searchFoodDatabase } from '../lib/barcode'
import {
  createMealTimestamp,
  MEAL_LABELS,
  MEAL_TYPES,
  sumMealMacros,
  toDayKey,
} from '../lib/utils'
import type { AppSettings, Food, FoodDraft, FoodSource, MealType } from '../types'

interface MealsPageProps {
  settings: AppSettings
}

interface FoodEditorState {
  id?: string
  name: string
  brand: string
  barcode: string
  servingLabel: string
  calories: string
  protein: string
  carbs: string
  fat: string
  notes: string
  favorite: boolean
  source: FoodSource
}

const createEmptyEditor = (): FoodEditorState => ({
  name: '',
  brand: '',
  barcode: '',
  servingLabel: '1 serving',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  notes: '',
  favorite: false,
  source: 'custom',
})

const toEditorState = (food: Food | FoodDraft): FoodEditorState => ({
  id: 'id' in food ? food.id : undefined,
  name: food.name,
  brand: food.brand ?? '',
  barcode: food.barcode ?? '',
  servingLabel: food.servingLabel,
  calories: String(food.calories),
  protein: String(food.protein),
  carbs: String(food.carbs),
  fat: String(food.fat),
  notes: food.notes ?? '',
  favorite: Boolean(food.favorite),
  source: food.source,
})

export function MealsPage({ settings }: MealsPageProps) {
  const [selectedDate, setSelectedDate] = useState(() => toDayKey(new Date()))
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast')
  const [servings, setServings] = useState('1')
  const [librarySearch, setLibrarySearch] = useState('')
  const [foodSearchQuery, setFoodSearchQuery] = useState('')
  const [foodSearchResults, setFoodSearchResults] = useState<FoodDraft[]>([])
  const [editor, setEditor] = useState<FoodEditorState>(() => createEmptyEditor())
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isLookupRunning, setIsLookupRunning] = useState(false)
  const [isFoodSearchRunning, setIsFoodSearchRunning] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const editorSectionRef = useRef<HTMLDivElement | null>(null)

  const foods = useLiveQuery(() => db.foods.toArray(), [], [])
  const entries = useLiveQuery(
    () => db.mealEntries.where('dayKey').equals(selectedDate).sortBy('occurredAt'),
    [selectedDate],
    [],
  )

  const sortedFoods = useMemo(() => {
    return foods
      .slice()
      .sort(
        (left, right) =>
          Number(right.favorite) - Number(left.favorite) ||
          (right.lastUsedAt ?? '').localeCompare(left.lastUsedAt ?? '') ||
          left.name.localeCompare(right.name),
      )
  }, [foods])

  const filteredFoods = useMemo(() => {
    const query = librarySearch.trim().toLowerCase()

    if (!query) {
      return sortedFoods
    }

    return sortedFoods.filter((food) => {
      const haystack = `${food.name} ${food.brand ?? ''} ${food.barcode ?? ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [librarySearch, sortedFoods])

  const totals = useMemo(() => sumMealMacros(entries), [entries])

  const groupedEntries = useMemo(
    () =>
      MEAL_TYPES.map((mealType) => ({
        mealType,
        entries: entries.filter((entry) => entry.mealType === mealType),
        totals: sumMealMacros(entries.filter((entry) => entry.mealType === mealType)),
      })),
    [entries],
  )

  const focusEditor = () => {
    window.requestAnimationFrame(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.getElementById('food-name')?.focus()
    })
  }

  const handleSaveFood = async (shouldAddToMeals: boolean) => {
    if (!editor.name.trim()) {
      setFeedback({ type: 'error', text: 'Give the food a name before saving it.' })
      return
    }

    try {
      const savedFood = await saveFood({
        id: editor.id,
        name: editor.name,
        brand: editor.brand || undefined,
        barcode: editor.barcode || undefined,
        servingLabel: editor.servingLabel,
        calories: Number(editor.calories) || 0,
        protein: Number(editor.protein) || 0,
        carbs: Number(editor.carbs) || 0,
        fat: Number(editor.fat) || 0,
        notes: editor.notes || undefined,
        favorite: editor.favorite,
        source: editor.source,
      })

      if (shouldAddToMeals) {
        await addMealEntry({
          food: savedFood,
          mealType: selectedMealType,
          servings: Number(servings) || 1,
          occurredAt: createMealTimestamp(selectedDate, selectedMealType),
        })

        setFeedback({
          type: 'success',
          text: `${savedFood.name} added to ${MEAL_LABELS[selectedMealType].toLowerCase()}.`,
        })
      } else {
        setFeedback({ type: 'success', text: `${savedFood.name} saved to your pantry.` })
      }

      setEditor(createEmptyEditor())
      setServings('1')
    } catch (error) {
      setFeedback({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Saving the food failed. Please try again.',
      })
    }
  }

  const handleQuickAdd = async (food: Food) => {
    await addMealEntry({
      food,
      mealType: selectedMealType,
      servings: Number(servings) || 1,
      occurredAt: createMealTimestamp(selectedDate, selectedMealType),
    })

    setFeedback({
      type: 'success',
      text: `${food.name} added to ${MEAL_LABELS[selectedMealType].toLowerCase()}.`,
    })
  }

  const handleLoadEditor = (food: Food | FoodDraft, sourceLabel = 'food') => {
    setEditor(toEditorState(food))
    setFeedback({
      type: 'success',
      text: `${'id' in food ? food.name : food.name} loaded into the editor. Scroll up to tweak it, then save or log it.`,
    })
    focusEditor()
  }

  const handleFoodSearch = async () => {
    setIsFoodSearchRunning(true)
    setFeedback(null)

    try {
      const results = await searchFoodDatabase(foodSearchQuery)
      setFoodSearchResults(results)
      setFeedback({
        type: 'success',
        text:
          results.length > 0
            ? `Found ${results.length} food result${results.length === 1 ? '' : 's'}.`
            : 'No foods matched that search.',
      })
    } catch (error) {
      setFoodSearchResults([])
      setFeedback({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Food search failed. Try a simpler search term.',
      })
    } finally {
      setIsFoodSearchRunning(false)
    }
  }

  const handleQuickAddSearchResult = async (food: FoodDraft) => {
    const savedFood = await saveFood(food)
    await handleQuickAdd(savedFood)
  }

  const handleBarcodeDetected = async (barcode: string) => {
    setIsLookupRunning(true)
    setFeedback({ type: 'success', text: `Looking up ${barcode}...` })

    try {
      const food = await lookupBarcodeFood(barcode)
      setEditor(toEditorState(food))
      setFeedback({
        type: 'success',
        text: `Found ${food.name}. Review the nutrition, then save it to your pantry or meals.`,
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Barcode lookup failed. Try manual food entry instead.',
      })
    } finally {
      setIsLookupRunning(false)
    }
  }

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Meals"
        title="Track food without the friction"
        description="Build your pantry, scan barcodes, and keep a clean day view of calories and macros."
        actions={
          <>
            <div className="field">
              <label htmlFor="meal-day" className="field-label">
                Log date
              </label>
              <input
                id="meal-day"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine size={18} /> Scan barcode
            </button>
          </>
        }
      />

      <div className="metric-grid">
        <article className="metric-card accent-card">
          <span className="metric-label">Calories</span>
          <strong className="metric-value">{totals.calories}</strong>
          <span className="metric-hint">Target: {settings.profile.calorieTarget} kcal</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Protein</span>
          <strong className="metric-value">{totals.protein} g</strong>
          <span className="metric-hint">Goal: {settings.profile.proteinTarget} g</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Carbs</span>
          <strong className="metric-value">{totals.carbs} g</strong>
          <span className="metric-hint">Goal: {settings.profile.carbsTarget} g</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Fat</span>
          <strong className="metric-value">{totals.fat} g</strong>
          <span className="metric-hint">Goal: {settings.profile.fatTarget} g</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Pantry items</span>
          <strong className="metric-value">{foods.length}</strong>
          <span className="metric-hint">Favorites rise to the top automatically</span>
        </article>
      </div>

      {feedback ? (
        <div className={`notice ${feedback.type === 'error' ? 'notice-error' : 'notice-success'}`}>
          {feedback.text}
        </div>
      ) : null}

      <SectionCard
        title="Search the food database"
        description="Use text search when scanning is overkill, your label is smudged, or the camera just isn’t in the mood."
      >
        <div className="field-grid two-up">
          <div className="field">
            <label htmlFor="food-search-query">Food search</label>
            <div className="search-row">
              <Search size={18} />
              <input
                id="food-search-query"
                className="input"
                placeholder="Chicken breast, greek yogurt, protein bar..."
                value={foodSearchQuery}
                onChange={(event) => setFoodSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="inline-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                void handleFoodSearch()
              }}
            >
              <Search size={18} /> Search foods
            </button>

            <button
              type="button"
              className="button button-ghost"
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine size={18} /> Scan instead
            </button>
          </div>
        </div>

        {isFoodSearchRunning ? (
          <div className="notice notice-success">Searching nutrition results…</div>
        ) : null}

        {foodSearchResults.length > 0 ? (
          <div className="food-library">
            {foodSearchResults.map((food, index) => (
              <article key={`${food.name}-${food.barcode ?? index}`} className="food-card">
                <div className="food-card-top">
                  <div>
                    <h3>{food.name}</h3>
                    <p>
                      {food.brand ? `${food.brand} • ` : ''}
                      {food.servingLabel}
                    </p>
                  </div>

                  <div className="food-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => handleLoadEditor(food, 'search result')}
                    >
                      Load into editor
                    </button>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => {
                        void handleQuickAddSearchResult(food)
                      }}
                    >
                      Add to {MEAL_LABELS[selectedMealType].toLowerCase()}
                    </button>
                  </div>
                </div>

                <div className="macro-strip">
                  <span className="macro-pill">{food.calories} kcal</span>
                  <span className="macro-pill">P {food.protein} g</span>
                  <span className="macro-pill">C {food.carbs} g</span>
                  <span className="macro-pill">F {food.fat} g</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <div className="grid grid-two">
        <div ref={editorSectionRef}>
        <SectionCard
          title="Food editor"
          description="Create custom foods, refine barcode results, and decide whether the item should go straight into your log."
          action={
            <div className="inline-row">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setEditor(createEmptyEditor())}
              >
                <WandSparkles size={18} /> New custom food
              </button>
            </div>
          }
        >
          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="food-name">Food name</label>
              <input
                id="food-name"
                placeholder="e.g. Turkey wrap"
                value={editor.name}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="food-brand">Brand</label>
              <input
                id="food-brand"
                placeholder="Optional"
                value={editor.brand}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, brand: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="food-barcode">Barcode</label>
              <input
                id="food-barcode"
                inputMode="numeric"
                value={editor.barcode}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, barcode: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="food-serving">Serving label</label>
              <input
                id="food-serving"
                placeholder="1 bowl"
                value={editor.servingLabel}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, servingLabel: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="food-calories">Calories</label>
              <input
                id="food-calories"
                type="number"
                step="1"
                value={editor.calories}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, calories: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="food-protein">Protein (g)</label>
              <input
                id="food-protein"
                type="number"
                step="0.1"
                value={editor.protein}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, protein: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="food-carbs">Carbs (g)</label>
              <input
                id="food-carbs"
                type="number"
                step="0.1"
                value={editor.carbs}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, carbs: event.target.value }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="food-fat">Fat (g)</label>
              <input
                id="food-fat"
                type="number"
                step="0.1"
                value={editor.fat}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, fat: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="food-notes">Notes</label>
            <textarea
              id="food-notes"
              placeholder="Optional notes, prep details, or barcode reminders"
              value={editor.notes}
              onChange={(event) =>
                setEditor((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>

          <div className="field-grid two-up">
            <div className="field">
              <label htmlFor="food-meal-type">Meal bucket</label>
              <select
                id="food-meal-type"
                value={selectedMealType}
                onChange={(event) =>
                  setSelectedMealType(event.target.value as MealType)
                }
              >
                {MEAL_TYPES.map((mealType) => (
                  <option key={mealType} value={mealType}>
                    {MEAL_LABELS[mealType]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="food-servings">Servings to add</label>
              <input
                id="food-servings"
                type="number"
                min="0.25"
                step="0.25"
                value={servings}
                onChange={(event) => setServings(event.target.value)}
              />
            </div>
          </div>

          <div className="inline-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                void handleSaveFood(false)
              }}
            >
              <Save size={18} /> Save to pantry
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                void handleSaveFood(true)
              }}
            >
              Add to {MEAL_LABELS[selectedMealType].toLowerCase()}
            </button>
            <button
              type="button"
              className={`button ${editor.favorite ? 'button-primary' : 'button-ghost'}`}
              onClick={() =>
                setEditor((current) => ({ ...current, favorite: !current.favorite }))
              }
            >
              <Star size={18} /> {editor.favorite ? 'Favorite' : 'Mark favorite'}
            </button>
          </div>

          {isLookupRunning ? (
            <div className="notice notice-success">Looking up nutrition data from the barcode...</div>
          ) : null}
        </SectionCard>
        </div>

        <SectionCard
          title="Daily meal log"
          description="Grouped by meal type so your day stays readable instead of turning into one giant food blob."
        >
          <div className="entry-groups">
            {groupedEntries.map((group) => (
              <article key={group.mealType} className="entry-card">
                <div className="entry-card-top">
                  <div>
                    <h3>{MEAL_LABELS[group.mealType]}</h3>
                    <p>{group.entries.length} entries</p>
                  </div>
                  <div className="macro-strip">
                    <span className="macro-pill">{group.totals.calories} kcal</span>
                    <span className="macro-pill">P {group.totals.protein} g</span>
                  </div>
                </div>

                {group.entries.length > 0 ? (
                  <div className="history-list">
                    {group.entries.map((entry) => (
                      <article key={entry.id} className="food-card">
                        <div className="food-card-top">
                          <div>
                            <h3>{entry.foodName}</h3>
                            <p>
                              {entry.servings} × {entry.servingLabel}
                              {entry.brand ? ` • ${entry.brand}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="button button-danger"
                            onClick={() => {
                              void deleteMealEntry(entry.id)
                            }}
                          >
                            <Trash2 size={16} /> Remove
                          </button>
                        </div>

                        <div className="macro-strip">
                          <span className="macro-pill">{entry.calories * entry.servings} kcal</span>
                          <span className="macro-pill">P {entry.protein * entry.servings} g</span>
                          <span className="macro-pill">C {entry.carbs * entry.servings} g</span>
                          <span className="macro-pill">F {entry.fat * entry.servings} g</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">Nothing logged here yet.</div>
                )}
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Pantry & favorites"
        description="Search your saved foods, quick-add them to the selected meal, or load one back into the editor for tweaks."
        action={
          <div className="field" style={{ minWidth: '240px' }}>
            <label htmlFor="pantry-search">Search pantry</label>
            <div className="search-row">
              <Search size={18} />
              <input
                id="pantry-search"
                className="input"
                placeholder="Search foods or barcodes"
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
              />
            </div>
          </div>
        }
      >
        {filteredFoods.length > 0 ? (
          <div className="food-library">
            {filteredFoods.map((food) => (
              <article key={food.id} className="food-card">
                <div className="food-card-top">
                  <div>
                    <h3>{food.name}</h3>
                    <p>
                      {food.brand ? `${food.brand} • ` : ''}
                      {food.servingLabel}
                    </p>
                  </div>

                  <div className="food-actions">
                    <button
                      type="button"
                      className={`button ${food.favorite ? 'button-primary' : 'button-ghost'}`}
                      onClick={() => {
                        void toggleFoodFavorite(food.id, !food.favorite)
                      }}
                    >
                      <Star size={16} />
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => handleLoadEditor(food, 'pantry item')}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => {
                        void handleQuickAdd(food)
                      }}
                    >
                      Add to {MEAL_LABELS[selectedMealType].toLowerCase()}
                    </button>
                  </div>
                </div>

                <div className="macro-strip">
                  <span className="macro-pill">{food.calories} kcal</span>
                  <span className="macro-pill">P {food.protein} g</span>
                  <span className="macro-pill">C {food.carbs} g</span>
                  <span className="macro-pill">F {food.fat} g</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            Your pantry is empty right now. Save a custom food or scan your first barcode.
          </div>
        )}
      </SectionCard>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </div>
  )
}