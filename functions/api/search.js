const SEARCH_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'serving_size',
  'nutriments',
  'image_front_small_url',
  'image_front_url',
].join(',')

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const query = url.searchParams.get('q')?.trim()

  if (!query) {
    return Response.json({ hits: [] })
  }

  const upstream = new URL('https://search.openfoodfacts.org/search')
  upstream.searchParams.set('q', query)
  upstream.searchParams.set('page_size', '24')
  upstream.searchParams.set('langs', 'en')
  upstream.searchParams.set('fields', SEARCH_FIELDS)

  const response = await fetch(upstream, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return Response.json(
      { error: 'Food search is temporarily unavailable.' },
      { status: response.status || 503 },
    )
  }

  const body = await response.text()

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
