import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Completion, type Habit, type Task } from './db'
import { today } from './habits'

export function useToday() {
  const [day, setDay] = useState(() => today())
  useEffect(() => {
    const update = () => setDay(today())
    const id = setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return day
}

export interface HabitData {
  habit: Habit
  /** Marcas del hábito, por fecha. */
  done: Map<string, Completion>
}

/** Hábitos (incluye archivados) con sus marcas. undefined mientras carga. */
export function useHabitData() {
  return useLiveQuery(async (): Promise<HabitData[]> => {
    const [habits, completions] = await Promise.all([
      db.habits.filter(h => !h.deletedAt).toArray(),
      db.completions.filter(c => !c.deletedAt).toArray(),
    ])
    const byHabit = new Map<string, Map<string, Completion>>()
    for (const c of completions) {
      const m = byHabit.get(c.habitId) ?? new Map<string, Completion>()
      m.set(c.date, c)
      byHabit.set(c.habitId, m)
    }
    return habits
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(habit => ({ habit, done: byHabit.get(habit.id) ?? new Map() }))
  })
}

/** Tareas no eliminadas, en orden de creación. undefined mientras carga. */
export function useTasks() {
  return useLiveQuery(async (): Promise<Task[]> => {
    const tasks = await db.tasks.filter(t => !t.deletedAt).toArray()
    return tasks.sort((a, b) => a.createdAt - b.createdAt)
  })
}
