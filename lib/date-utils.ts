export function formatDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function monthKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function startOfWeekMonday(d: Date) {
  const date = new Date(d)
  const day = date.getDay() // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7 // days since Monday
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function datesMonToSatContaining(d: Date) {
  const start = startOfWeekMonday(d)
  return Array.from({ length: 6 }).map((_, i) => {
    const nd = new Date(start)
    nd.setDate(start.getDate() + i) // Mon..Sat
    return nd
  })
}

export function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

export function nextDayKey(from: Date = new Date()) {
  return formatDateKey(addDays(from, 1))
}

export function isMonToSat(d: Date) {
  const day = d.getDay()
  return day >= 1 && day <= 6
}
