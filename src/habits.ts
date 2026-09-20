import type { Completion, Habit } from './db'

// Lógica pura de fechas, rachas y consistencia. Sin acceso a la base de datos.

export type Dates = { has(date: string): boolean }

/** El día "cambia" a esta hora (por defecto las 4am): acostarte a la 1am sigue siendo "hoy". */
let rolloverHour = 4
export const setRolloverHour = (h: number) => {
  rolloverHour = h
}

const pad = (n: number) => String(n).padStart(2, '0')

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const today = (now = new Date()) => toDateStr(new Date(now.getTime() - rolloverHour * 3_600_000))

export function addDays(s: string, n: number) {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

const weekday = (s: string) => parseDate(s).getDay()

/** Lunes de la semana que contiene la fecha. */
export const weekStart = (s: string) => addDays(s, -((weekday(s) + 6) % 7))

export function isPaused(habit: Habit, date: string) {
  return !!habit.pauses?.some(p => date >= p.from && (!p.to || date <= p.to))
}

/** ¿Toca el hábito ese día? (según su frecuencia y sin contar las pausas) */
export function isScheduled(habit: Habit, date: string) {
  if (isPaused(habit, date)) return false
  const s = habit.schedule
  return s.type === 'days' ? s.days.includes(weekday(date)) : true
}

export function weekCount(done: Dates, date: string) {
  const start = weekStart(date)
  let n = 0
  for (let i = 0; i < 7; i++) if (done.has(addDays(start, i))) n++
  return n
}

/** Cuántas veces toca cumplir el hábito en una semana. */
export function weeklyTarget(habit: Habit) {
  const s = habit.schedule
  return s.type === 'weekly' ? s.times : s.type === 'days' ? s.days.length : 7
}

/** Primer día en que el hábito existe. */
export const habitStart = (habit: Habit) => today(new Date(habit.createdAt))

export interface Streak {
  current: number
  best: number
  /** Falló la última vez: si vuelve a fallar, la racha se rompe. */
  atRisk: boolean
  unit: 'día' | 'semana'
}

type Unit = 'met' | 'missed' | 'pending' | 'skip'

function dayUnits(habit: Habit, done: Dates, todayStr: string) {
  const out: Unit[] = []
  for (let d = habitStart(habit); d <= todayStr; d = addDays(d, 1)) {
    if (!isScheduled(habit, d)) continue
    out.push(done.has(d) ? 'met' : d === todayStr ? 'pending' : 'missed')
  }
  return out
}

const weekPaused = (habit: Habit, w: string) => Array.from({ length: 7 }, (_, i) => addDays(w, i)).every(d => isPaused(habit, d))

function weekUnits(habit: Habit, times: number, done: Dates, todayStr: string) {
  const out: Unit[] = []
  const first = weekStart(habitStart(habit))
  const current = weekStart(todayStr)
  for (let w = first; w <= current; w = addDays(w, 7)) {
    if (weekCount(done, w) >= times) out.push('met')
    else if (weekPaused(habit, w)) out.push('skip')
    else if (w === current) out.push('pending')
    else if (w === first) out.push('skip') // la primera semana suele ser parcial
    else out.push('missed')
  }
  return out
}

/**
 * Racha con perdón: un fallo aislado no la rompe ("nunca falles dos veces
 * seguidas"). La unidad que está en curso (hoy / esta semana) no cuenta como fallo,
 * y los días en pausa no cuentan ni a favor ni en contra.
 */
export function streak(habit: Habit, done: Dates, todayStr: string): Streak {
  const s = habit.schedule
  const units = s.type === 'weekly' ? weekUnits(habit, s.times, done, todayStr) : dayUnits(habit, done, todayStr)
  let run = 0
  let best = 0
  let misses = 0
  for (const u of units) {
    if (u === 'met') {
      run++
      misses = 0
      best = Math.max(best, run)
    } else if (u === 'missed') {
      misses++
      if (misses >= 2) run = 0
    }
  }
  return { current: run, best, atRisk: run > 0 && misses === 1, unit: s.type === 'weekly' ? 'semana' : 'día' }
}

const maxDate = (a: string, b: string) => (a > b ? a : b)

/** % cumplido en los últimos 28 días (null si aún no hay nada que medir). */
export function consistency(habit: Habit, done: Dates, todayStr: string): number | null {
  const s = habit.schedule
  let expected = 0
  let got = 0
  for (let d = maxDate(habitStart(habit), addDays(todayStr, -27)); d <= todayStr; d = addDays(d, 1)) {
    if (d === todayStr && !done.has(d)) continue // hoy aún puede cumplirse
    if (isPaused(habit, d)) continue
    if (s.type === 'weekly') {
      expected += s.times / 7
      if (done.has(d)) got++
    } else if (isScheduled(habit, d)) {
      expected++
      if (done.has(d)) got++
    }
  }
  return expected === 0 ? null : Math.round(Math.min(1, got / expected) * 100)
}

/** Cumplimiento de una semana (que empieza en `week`): cuánto se hizo y cuánto tocaba hasta hoy. */
export function weekSummary(habit: Habit, done: Dates, week: string, todayStr: string) {
  const s = habit.schedule
  if (s.type === 'weekly') {
    if (weekPaused(habit, week)) return { got: 0, expected: 0 }
    return { got: Math.min(weekCount(done, week), s.times), expected: s.times }
  }
  let got = 0
  let expected = 0
  for (let i = 0; i < 7; i++) {
    const d = addDays(week, i)
    if (d > todayStr || d < habitStart(habit) || !isScheduled(habit, d)) continue
    if (d === todayStr && !done.has(d)) continue
    expected++
    if (done.has(d)) got++
  }
  return { got, expected }
}

export interface Cell {
  date: string
  kind: 'full' | 'tiny' | 'miss' | 'off'
}

/** Las últimas `weeks` semanas, en orden de columnas (lunes a domingo por semana), para el calendario de calor. */
export function heatmap(habit: Habit, done: { get(date: string): Completion | undefined }, todayStr: string, weeks = 12): Cell[] {
  const start = addDays(weekStart(todayStr), -7 * (weeks - 1))
  const first = habitStart(habit)
  const cells: Cell[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(start, i)
    const mark = done.get(date)
    let kind: Cell['kind'] = 'off'
    if (date <= todayStr) {
      if (mark) kind = mark.level === 'tiny' ? 'tiny' : 'full'
      else if (date < todayStr && date >= first && habit.schedule.type !== 'weekly' && isScheduled(habit, date)) kind = 'miss'
    }
    cells.push({ date, kind })
  }
  return cells
}

export function describeSchedule(habit: Habit) {
  const s = habit.schedule
  if (s.type === 'daily') return 'Todos los días'
  if (s.type === 'weekly') return s.times === 1 ? '1 vez por semana' : `${s.times} veces por semana`
  const names = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  return [1, 2, 3, 4, 5, 6, 0].filter(d => s.days.includes(d)).map(d => names[d]).join(' ')
}
