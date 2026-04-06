import type { FoodDraft } from '../types'
import { cleanBarcode, roundValue } from './utils'

const OPEN_FOOD_FACTS_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product'

const parseNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const parseText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

const normalizeOpenFoodFactsProduct = (
  barcode: string,
  product: Record<string, unknown>,
): FoodDraft => {
  const nutriments =
    product.nutriments && typeof product.nutriments === 'object'
      ? (product.nutriments as Record<string, unknown>)
      : {}

  const caloriesServing = parseNumber(nutriments['energy-kcal_serving'])
  const calories100g =
    parseNumber(nutriments['energy-kcal_100g']) ?? parseNumber(nutriments['energy-kcal'])
  const proteinServing = parseNumber(nutriments.proteins_serving)
  const protein100g = parseNumber(nutriments.proteins_100g)
  const carbsServing = parseNumber(nutriments.carbohydrates_serving)
  const carbs100g = parseNumber(nutriments.carbohydrates_100g)
  const fatServing = parseNumber(nutriments.fat_serving)
  const fat100g = parseNumber(nutriments.fat_100g)

  const useServingValues =
    caloriesServing !== null ||
    proteinServing !== null ||
    carbsServing !== null ||
    fatServing !== null

  const servingLabel =
    parseText(product.serving_size) ?? (useServingValues ? '1 serving' : '100 g')

  return {
    name: parseText(product.product_name) ?? 'Scanned food',
    brand: parseText(product.brands),
    barcode,
    servingLabel,
    calories: roundValue(useServingValues ? caloriesServing ?? calories100g ?? 0 : calories100g ?? 0, 0),
    protein: roundValue(useServingValues ? proteinServing ?? protein100g ?? 0 : protein100g ?? 0, 1),
    carbs: roundValue(useServingValues ? carbsServing ?? carbs100g ?? 0 : carbs100g ?? 0, 1),
    fat: roundValue(useServingValues ? fatServing ?? fat100g ?? 0 : fat100g ?? 0, 1),
    notes: 'Imported from Open Food Facts. Review and tweak the nutrition before saving if needed.',
    source: 'barcode',
    favorite: false,
  }
}

const normalizeRemoteFood = (barcode: string, food: Partial<FoodDraft>): FoodDraft => ({
  name: food.name?.trim() || 'Scanned food',
  brand: food.brand?.trim() || undefined,
  barcode: food.barcode ? cleanBarcode(food.barcode) : barcode,
  servingLabel: food.servingLabel?.trim() || '1 serving',
  calories: roundValue(food.calories ?? 0, 0),
  protein: roundValue(food.protein ?? 0, 1),
  carbs: roundValue(food.carbs ?? 0, 1),
  fat: roundValue(food.fat ?? 0, 1),
  notes: food.notes?.trim() || undefined,
  source: 'barcode',
  favorite: Boolean(food.favorite),
})

export async function lookupBarcodeFood(rawBarcode: string): Promise<FoodDraft> {
  const barcode = cleanBarcode(rawBarcode)

  if (barcode.length < 8) {
    throw new Error('Barcode must contain at least 8 digits.')
  }

  const configuredBase = import.meta.env.VITE_BARCODE_API_BASE_URL?.replace(/\/$/, '')
  const endpoints = [
    configuredBase ? `${configuredBase}/api/barcode/${barcode}` : `/api/barcode/${barcode}`,
    `${OPEN_FOOD_FACTS_ENDPOINT}/${barcode}.json`,
  ]

  let lastError: Error | null = null

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        lastError = new Error(`Lookup failed with status ${response.status}.`)
        continue
      }

      const data = (await response.json()) as Record<string, unknown>

      if (data.food && typeof data.food === 'object') {
        return normalizeRemoteFood(barcode, data.food as Partial<FoodDraft>)
      }

      if (data.status === 1 && data.product && typeof data.product === 'object') {
        return normalizeOpenFoodFactsProduct(
          barcode,
          data.product as Record<string, unknown>,
        )
      }

      lastError = new Error(
        typeof data.message === 'string'
          ? data.message
          : 'No nutrition record was found for this barcode.',
      )
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error('Barcode lookup failed. Please try again.')
    }
  }

  throw lastError ?? new Error('No nutrition record was found for this barcode.')
}