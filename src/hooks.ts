import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Checkin, type Completion, type Habit, type Review, type Task } from './db'
import { today } from './habits'
import { useSettings } from './settings'

export function useToday() {
  const { rolloverHour } = useSettings()
  const [day, setDay] = useState(() => today())
  useEffect(() => {
    const update = () => setDay(today())
    update() // por si cambió la hora de corte
    const id = setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [rolloverHour])
  return day
}

export interface HabitData {
  habit: Habit
  /** Días cumplidos (un hábito numérico solo cuenta si llegó a su meta). */
  done: Map<string, Completion>
  /** Avance numérico por día, también el que no llegó a la meta. */
  values: Map<string, number>
}

/** Hábitos (incluye archivados) con sus marcas. undefined mientras carga. */
export function useHabitData() {
  return useLiveQuery(async (): Promise<HabitData[]> => {
    const [habits, completions] = await Promise.all([
      db.habits.filter(h => !h.deletedAt).toArray(),
      db.completions.filter(c => !c.deletedAt).toArray(),
    ])
    const doneBy = new Map<string, Map<string, Completion>>()
    const valuesBy = new Map<string, Map<string, number>>()
    for (const c of completions) {
      if (c.value !== undefined) {
        const v = valuesBy.get(c.habitId) ?? new Map<string, number>()
        v.set(c.date, c.value)
        valuesBy.set(c.habitId, v)
      }
      if (c.level === 'partial') continue
      const m = doneBy.get(c.habitId) ?? new Map<string, Completion>()
      m.set(c.date, c)
      doneBy.set(c.habitId, m)
    }
    return habits
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(habit => ({ habit, done: doneBy.get(habit.id) ?? new Map(), values: valuesBy.get(habit.id) ?? new Map() }))
  })
}

/** Tareas no eliminadas, en orden de creación. undefined mientras carga. */
export function useTasks() {
  return useLiveQuery(async (): Promise<Task[]> => {
    const tasks = await db.tasks.filter(t => !t.deletedAt).toArray()
    return tasks.sort((a, b) => a.createdAt - b.createdAt)
  })
}

/** Check-ins por fecha. undefined mientras carga. */
export function useCheckins() {
  return useLiveQuery(async () => {
    const rows = await db.checkins.filter(c => !c.deletedAt).toArray()
    return new Map<string, Checkin>(rows.map(c => [c.id, c]))
  })
}

/** Revisiones semanales por lunes. undefined mientras carga. */
export function useReviews() {
  return useLiveQuery(async () => {
    const rows = await db.reviews.filter(r => !r.deletedAt).toArray()
    return new Map<string, Review>(rows.map(r => [r.id, r]))
  })
}
