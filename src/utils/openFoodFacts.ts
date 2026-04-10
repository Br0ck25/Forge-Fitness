import type { FoodDraft } from '../types/domain'

const OPEN_FOOD_FACTS_BASE = 'https://world.openfoodfacts.org'

interface OpenFoodFactsProduct {
  code?: string
  product_name?: string
  product_name_en?: string
  brands?: string
  serving_size?: string
  nutriments?: Record<string, unknown>
  image_front_small_url?: string
  image_front_url?: string
}

interface SearchResponse {
  products?: OpenFoodFactsProduct[]
}

interface BarcodeResponse {
  status?: number
  product?: OpenFoodFactsProduct
}

function firstNumber(values: unknown[]) {
  for (const value of values) {
    const parsed = typeof value === 'string' ? Number(value) : Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function createServingLabel(product: OpenFoodFactsProduct, usingServingMetrics: boolean) {
  if (product.serving_size && product.serving_size.trim()) {
    return product.serving_size.trim()
  }

  return usingServingMetrics ? '1 serving' : '100 g'
}

function parseProduct(product: OpenFoodFactsProduct): FoodDraft {
  const nutriments = product.nutriments ?? {}
  const usingServingMetrics =
    nutriments['energy-kcal_serving'] != null ||
    nutriments.proteins_serving != null ||
    nutriments.carbohydrates_serving != null ||
    nutriments.fat_serving != null

  const calories = Math.round(
    firstNumber([
      nutriments['energy-kcal_serving'],
      nutriments['energy-kcal_value'],
      nutriments['energy-kcal'],
      nutriments['energy-kcal_100g'],
      (() => {
        const kilojoules = firstNumber([
          nutriments.energy_serving,
          nutriments.energy,
          nutriments.energy_100g,
        ])
        return kilojoules > 0 ? kilojoules / 4.184 : 0
      })(),
    ]),
  )

  const protein = firstNumber([
    nutriments.proteins_serving,
    nutriments.proteins_100g,
    nutriments.proteins,
  ])
  const carbs = firstNumber([
    nutriments.carbohydrates_serving,
    nutriments.carbohydrates_100g,
    nutriments.carbohydrates,
  ])
  const fat = firstNumber([
    nutriments.fat_serving,
    nutriments.fat_100g,
    nutriments.fat,
  ])

  const incompleteNutrition = [calories, protein, carbs, fat].filter((value) => value > 0).length < 4

  return {
    name: product.product_name?.trim() || product.product_name_en?.trim() || 'Unknown product',
    brand: product.brands?.split(',')[0]?.trim(),
    servingSize: createServingLabel(product, usingServingMetrics),
    calories,
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    barcode: product.code,
    imageUrl: product.image_front_small_url || product.image_front_url,
    source: 'api',
    incompleteNutrition,
    notes: incompleteNutrition
      ? 'Some nutrition data was missing. Please review before saving.'
      : undefined,
  }
}

async function getJson<T>(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Open Food Facts is unavailable right now.')
  }

  return (await response.json()) as T
}

export async function searchFoods(query: string) {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    return []
  }

  const url = `${OPEN_FOOD_FACTS_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=24`
  const data = await getJson<SearchResponse>(url)

  return (data.products ?? [])
    .map(parseProduct)
    .filter((food) => food.name.trim().length > 0)
}

export async function lookupBarcode(barcode: string) {
  const cleanBarcode = barcode.replace(/\s+/g, '')
  if (!cleanBarcode) {
    return undefined
  }

  const url = `${OPEN_FOOD_FACTS_BASE}/api/v2/product/${encodeURIComponent(cleanBarcode)}.json?fields=code,product_name,product_name_en,brands,serving_size,nutriments,image_front_small_url,image_front_url`
  const data = await getJson<BarcodeResponse>(url)

  if (data.status !== 1 || !data.product) {
    return undefined
  }

  return parseProduct(data.product)
}
