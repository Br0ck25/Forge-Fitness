export function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function shiftDateKey(dateKey: string, amount: number) {
  const next = fromDateKey(dateKey)
  next.setDate(next.getDate() + amount)
  return toDateKey(next)
}

export function formatDate(dateKey: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(fromDateKey(dateKey))
}

export function isToday(dateKey: string) {
  return dateKey === toDateKey()
}
