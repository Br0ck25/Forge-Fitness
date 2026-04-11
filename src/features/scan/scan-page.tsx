import { Flashlight, LoaderCircle, RefreshCcw, ScanLine, Search, ShieldAlert } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FoodEditorSheet } from '../../components/ui/food-editor-sheet'
import { Card } from '../../components/ui/card'
import { EmptyState } from '../../components/ui/empty-state'
import { useBarcodeScanner } from '../../hooks/use-barcode-scanner'
import { useAppStore } from '../../store/app-store'
import type { FoodDraft, MealKey } from '../../types/domain'
import { MEAL_ORDER, mealLabels } from '../../types/domain'
import { formatDate } from '../../utils/date'
import { createBlankFood } from '../../utils/defaults'
import { lookupBarcode } from '../../utils/openFoodFacts'

interface LookupState {
  loading: boolean
  error?: string
  barcode?: string
  notFound?: boolean
}

export function ScanPage() {
  const { addLogEntry, notify, saveFavorite, selectedDate } = useAppStore()
  const [searchParams] = useSearchParams()
  const [manualBarcode, setManualBarcode] = useState('')
  const [lookupState, setLookupState] = useState<LookupState>({ loading: false })
  const [editorFood, setEditorFood] = useState<FoodDraft | null>(null)

  const isFavoriteIntent = searchParams.get('intent') === 'favorite'
  const requestedMealParam = searchParams.get('meal')
  const requestedMeal =
    requestedMealParam && MEAL_ORDER.includes(requestedMealParam as MealKey)
      ? (requestedMealParam as MealKey)
      : undefined

  const handleLookup = useCallback(async (rawBarcode: string) => {
    const barcode = rawBarcode.trim()
    if (!barcode) {
      setLookupState({ loading: false, error: 'Enter a barcode first.' })
      return
    }

    setLookupState({ loading: true, barcode })

    try {
      const food = await lookupBarcode(barcode)
      if (!food) {
        setLookupState({
          loading: false,
          barcode,
          notFound: true,
          error: 'Barcode not found. You can add it manually instead.',
        })
        return
      }

      setEditorFood(food)
      setLookupState({ loading: false, barcode })
    } catch (lookupError) {
      setLookupState({
        loading: false,
        barcode,
        error:
          lookupError instanceof Error
            ? lookupError.message
            : 'Lookup failed. You can still log the item manually.',
      })
    }
  }, [])

  const onDetected = useCallback(
    (barcode: string) => {
      setManualBarcode(barcode)
      void handleLookup(barcode)
    },
    [handleLookup],
  )

  const { canToggleTorch, error: cameraError, restart, status, toggleTorch, torchEnabled, videoRef } =
    useBarcodeScanner({
      enabled: !lookupState.loading && !editorFood,
      onDetected,
    })

  const statusText = useMemo(() => {
    if (lookupState.loading) {
      return 'Looking up nutrition…'
    }

    if (status === 'starting') {
      return 'Starting camera…'
    }

    if (status === 'scanning') {
      return 'Center the barcode in the frame.'
    }

    return 'Camera is ready when your browser allows access.'
  }, [lookupState.loading, status])

  async function handleSubmitEditor({
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

    notify({
      title: shouldSaveFavorite ? 'Scanned, logged, and saved' : 'Scanned item added',
      description: shouldSaveFavorite
        ? `${food.name} was added to ${mealLabels[meal].toLowerCase()} and saved as a favorite.`
        : `${food.name} was added to ${mealLabels[meal].toLowerCase()} on ${formatDate(selectedDate)}.`,
    })

    setEditorFood(null)
    setLookupState({ loading: false })
    void restart()
  }

  function createManualFood() {
    return {
      ...createBlankFood(),
      barcode: manualBarcode.trim() || lookupState.barcode,
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div>
          <p className="text-base font-semibold text-slate-950">Barcode scanner</p>
          <p className="text-sm text-slate-500">
            Scan with your camera, review the result, then add it to{' '}
            {requestedMeal
              ? `${mealLabels[requestedMeal].toLowerCase()} on ${formatDate(selectedDate)}`
              : formatDate(selectedDate)}.
          </p>
        </div>

        {isFavoriteIntent ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            Favorite save mode is on — after the lookup, turn on <span className="font-semibold">Save to favorites</span> in the review sheet if you want to keep it.
          </div>
        ) : null}

        {requestedMeal ? (
          <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-100">
            Quick log started from {mealLabels[requestedMeal].toLowerCase()}, so that meal is preselected in the review sheet.
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-4xl bg-slate-950">
          <video
            ref={videoRef}
            muted
            playsInline
            className="aspect-3/4 w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.55),rgba(15,23,42,0.1),rgba(15,23,42,0.55))]" />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-40 -translate-y-1/2 rounded-4xl border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
          <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/45 px-4 py-3 text-sm text-white backdrop-blur">
            {statusText}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => void restart()} className="button-secondary justify-center">
            <RefreshCcw className="h-4 w-4" />
            Scan again
          </button>
          <button
            type="button"
            onClick={() => void toggleTorch()}
            disabled={!canToggleTorch}
            className="button-secondary justify-center disabled:opacity-50"
          >
            <Flashlight className="h-4 w-4" />
            {torchEnabled ? 'Torch on' : 'Torch'}
          </button>
        </div>

        {lookupState.loading ? (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Fetching product details…
          </div>
        ) : null}

        {cameraError ? (
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {cameraError}. If camera access is denied, you can still enter the barcode or add the food manually.
            </span>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 p-4">
        <div>
          <p className="text-base font-semibold text-slate-950">Manual barcode lookup</p>
          <p className="text-sm text-slate-500">Perfect fallback for tricky lighting or camera permissions.</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleLookup(manualBarcode)
          }}
          className="flex gap-3"
        >
          <input
            value={manualBarcode}
            onChange={(event) => setManualBarcode(event.target.value)}
            placeholder="Enter barcode"
            className="input-field flex-1"
            inputMode="numeric"
          />
          <button type="submit" className="button-primary shrink-0" disabled={lookupState.loading}>
            <Search className="h-4 w-4" />
            Find
          </button>
        </form>

        <button
          type="button"
          onClick={() => setEditorFood(createManualFood())}
          className="button-secondary w-full justify-center"
        >
          <ScanLine className="h-4 w-4" />
          Add food manually
        </button>
      </Card>

      {lookupState.error ? (
        <Card className="p-4">
          <EmptyState
            title={lookupState.notFound ? 'Product not found' : 'Scanner note'}
            description={lookupState.error}
            action={
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button type="button" onClick={() => setEditorFood(createManualFood())} className="button-primary">
                  Manual entry
                </button>
                <button type="button" onClick={() => void restart()} className="button-secondary">
                  Try again
                </button>
              </div>
            }
          />
        </Card>
      ) : null}

      {editorFood ? (
        <FoodEditorSheet
          open={Boolean(editorFood)}
          title="Review scanned food"
          initialFood={editorFood}
          defaultMeal={requestedMeal}
          allowSaveFavorite
          onClose={() => {
            setEditorFood(null)
            void restart()
          }}
          onSubmit={handleSubmitEditor}
        />
      ) : null}
    </div>
  )
}
