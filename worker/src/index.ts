const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

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

const normalizeProduct = (barcode: string, product: Record<string, unknown>) => {
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

  return {
    name: parseText(product.product_name) ?? 'Scanned food',
    brand: parseText(product.brands),
    barcode,
    servingLabel:
      parseText(product.serving_size) ?? (useServingValues ? '1 serving' : '100 g'),
    calories: Math.round((useServingValues ? caloriesServing ?? calories100g ?? 0 : calories100g ?? 0) * 10) / 10,
    protein: Math.round((useServingValues ? proteinServing ?? protein100g ?? 0 : protein100g ?? 0) * 10) / 10,
    carbs: Math.round((useServingValues ? carbsServing ?? carbs100g ?? 0 : carbs100g ?? 0) * 10) / 10,
    fat: Math.round((useServingValues ? fatServing ?? fat100g ?? 0 : fat100g ?? 0) * 10) / 10,
    notes: 'Imported via the Cloudflare Worker from Open Food Facts. Review before saving.',
    source: 'barcode',
    favorite: false,
  }
}

const json = (payload: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')

  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value)
  }

  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  })
}

const worker = {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      })
    }

    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'forge-fitness-barcode-api' })
    }

    const matchesBarcodeRoute =
      (pathSegments.length === 2 && pathSegments[0] === 'barcode') ||
      (pathSegments.length === 3 &&
        pathSegments[0] === 'api' &&
        pathSegments[1] === 'barcode')

    const matchesSearchRoute =
      (pathSegments.length === 2 && pathSegments[0] === 'foods' && pathSegments[1] === 'search') ||
      (pathSegments.length === 3 &&
        pathSegments[0] === 'api' &&
        pathSegments[1] === 'foods' &&
        pathSegments[2] === 'search')

    if (matchesSearchRoute) {
      const query = url.searchParams.get('q')?.trim() ?? ''

      if (query.length < 2) {
        return json({ message: 'Type at least two characters to search foods.' }, { status: 400 })
      }

      const searchUrl = new URL('https://world.openfoodfacts.org/cgi/search.pl')
      searchUrl.searchParams.set('search_terms', query)
      searchUrl.searchParams.set('search_simple', '1')
      searchUrl.searchParams.set('action', 'process')
      searchUrl.searchParams.set('json', '1')
      searchUrl.searchParams.set('page_size', '12')
      searchUrl.searchParams.set('fields', 'product_name,brands,code,serving_size,nutriments')

      const searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Forge Fitness Search Worker/1.0 (+https://workers.dev)',
        },
      })

      if (!searchResponse.ok) {
        return json(
          { message: 'Food search is unavailable right now.' },
          { status: searchResponse.status >= 500 ? 502 : searchResponse.status },
        )
      }

      const payload = (await searchResponse.json()) as Record<string, unknown>
      const foods = Array.isArray(payload.products)
        ? (payload.products as Array<Record<string, unknown>>)
            .map((product) => {
              const barcode = typeof product.code === 'string' ? product.code.replace(/\D/g, '') : ''
              return {
                ...normalizeProduct(barcode, product),
                barcode: barcode || undefined,
                source: 'search',
              }
            })
            .filter((food) => food.name.trim())
        : []

      return json(
        { foods, source: 'open-food-facts-search' },
        { headers: { 'Cache-Control': 'public, max-age=3600' } },
      )
    }

    if (!matchesBarcodeRoute) {
      return json({ message: 'Not found.' }, { status: 404 })
    }

    const barcode = (pathSegments[pathSegments.length - 1] ?? '').replace(/\D/g, '')

    if (barcode.length < 8) {
      return json({ message: 'Barcode must contain at least 8 digits.' }, { status: 400 })
    }

    const upstreamResponse = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Forge Fitness Barcode Worker/1.0 (+https://workers.dev)',
        },
      },
    )

    if (!upstreamResponse.ok) {
      return json(
        { message: 'Open Food Facts could not be reached right now.' },
        { status: upstreamResponse.status >= 500 ? 502 : upstreamResponse.status },
      )
    }

    const payload = (await upstreamResponse.json()) as Record<string, unknown>

    if (payload.status !== 1 || !payload.product || typeof payload.product !== 'object') {
      return json(
        { message: 'No nutrition record was found for that barcode.' },
        { status: 404 },
      )
    }

    return json(
      {
        food: normalizeProduct(barcode, payload.product as Record<string, unknown>),
        source: 'open-food-facts',
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400',
        },
      },
    )
  },
}

export default worker