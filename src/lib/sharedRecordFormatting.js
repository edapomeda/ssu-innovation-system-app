export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatRelativeUpdate(value, now) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Updated recently'

  const seconds = Math.round((date.getTime() - now) / 1000)
  const ranges = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  const [unit, interval] = ranges.find(([, size]) => Math.abs(seconds) >= size) || ['second', 1]

  return `Updated ${new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(seconds / interval), unit)}`
}

export function isRecentlyUpdated(value, now) {
  const age = now - new Date(value).getTime()
  return age >= 0 && age < 7 * 24 * 60 * 60 * 1000
}
