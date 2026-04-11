const BARCODE_FIELDS = [
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
  const barcode = context.params?.barcode?.trim()

  if (!barcode) {
    return Response.json({ error: 'Barcode is required.' }, { status: 400 })
  }

  const upstream = new URL(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`)
  upstream.searchParams.set('fields', BARCODE_FIELDS)

  const response = await fetch(upstream, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return Response.json(
      { error: 'Barcode lookup is temporarily unavailable.' },
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
