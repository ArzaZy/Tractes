const pad = (n: number) => String(n).padStart(2, '0')

/** ISO timestamp -> value for <input type="datetime-local"> in the viewer's local time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local value (local time) -> ISO timestamp for the database, or null. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function isFuture(value: string, now: number = Date.now()): boolean {
  const d = new Date(value)
  return !Number.isNaN(d.getTime()) && d.getTime() > now
}
