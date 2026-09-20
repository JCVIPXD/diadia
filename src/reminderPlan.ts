import type { Habit } from './db'
import { addDays, isScheduled, parseDate } from './habits'

// Planifica qué notificaciones programar. Lógica pura: no toca Android ni la base de datos.

export interface Reminder {
  /** Entero estable: las notificaciones de Android se identifican con un número. */
  id: number
  at: Date
  title: string
  body: string
}

export const DAYS_AHEAD = 14
const BEDTIME_LEAD_MIN = 30

/** Número estable a partir de un texto (para no duplicar ni perder notificaciones al reprogramar). */
export function stableId(key: string) {
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0
  return (Math.abs(h) % 2_000_000_000) + 1
}

/**
 * Momento real de una hora "HH:mm" dentro del día lógico `date`.
 * Con corte a las 4am, una hora como 01:00 pertenece al día calendario siguiente.
 */
function atTime(date: string, hhmm: string, rolloverHour: number, minusMin = 0) {
  const [h, m] = hhmm.split(':').map(Number)
  const nextDay = h * 60 + m < rolloverHour * 60
  const d = parseDate(nextDay ? addDays(date, 1) : date)
  d.setHours(h, m - minusMin, 0, 0)
  return d
}

export function planReminders(
  habits: { habit: Habit; done: { has(date: string): boolean } }[],
  opts: { now: Date; todayStr: string; rolloverHour: number; bedtimeGoal: string; bedtimeReminder: boolean },
): Reminder[] {
  const out: Reminder[] = []
  const push = (r: Reminder) => r.at > opts.now && out.push(r)

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(opts.todayStr, i)

    for (const { habit, done } of habits) {
      if (!habit.time || habit.archivedAt || !isScheduled(habit, date) || done.has(date)) continue
      push({
        id: stableId(`${habit.id}_${date}`),
        at: atTime(date, habit.time, opts.rolloverHour),
        title: habit.name,
        body: habit.tiny ? `Versión mínima: ${habit.tiny}` : (habit.cue ?? 'Toca hacerlo.'),
      })
    }

    if (opts.bedtimeReminder) {
      push({
        id: stableId(`bed_${date}`),
        at: atTime(date, opts.bedtimeGoal, opts.rolloverHour, BEDTIME_LEAD_MIN),
        title: 'Hora de prepararte para dormir',
        body: `Tu meta es acostarte a las ${opts.bedtimeGoal}.`,
      })
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime())
}
