import Dexie, { type EntityTable } from 'dexie'

export type Schedule =
  | { type: 'daily' }
  | { type: 'days'; days: number[] } // 0 = domingo … 6 = sábado
  | { type: 'weekly'; times: number } // N veces por semana, cualquier día

export type Level = 'full' | 'tiny'

export type Period = 'morning' | 'afternoon' | 'evening'

// Cada fila lleva updatedAt (y deletedAt como marca de borrado) para poder
// fusionar datos entre dispositivos: gana el cambio más reciente por fila.
export interface Habit {
  id: string
  name: string
  identity?: string // "Soy alguien que…"
  cue?: string // cuándo / dónde
  tiny?: string // versión mínima
  period?: Period // momento del día; sin valor = "durante el día"
  schedule: Schedule
  createdAt: number
  updatedAt: number
  archivedAt?: number
  deletedAt?: number
}

// Una fila por hábito y día: el id es determinista, así dos dispositivos
// que marquen lo mismo producen la misma fila y no duplicados.
export interface Completion {
  id: string // `${habitId}_${date}`
  habitId: string
  date: string // YYYY-MM-DD, día local
  level: Level
  updatedAt: number
  deletedAt?: number
}

// Tarea de una sola vez (no un hábito). Sin rachas ni "vencida": si no se
// termina, al día siguiente se decide pasarla a hoy o soltarla.
export interface Task {
  id: string
  title: string
  date: string // día planeado, YYYY-MM-DD
  createdAt: number
  doneAt?: number
  updatedAt: number
  deletedAt?: number
}

export const db = new Dexie('diadia') as Dexie & {
  habits: EntityTable<Habit, 'id'>
  completions: EntityTable<Completion, 'id'>
  tasks: EntityTable<Task, 'id'>
}

db.version(1).stores({
  habits: 'id, updatedAt',
  completions: 'id, habitId, date, updatedAt',
})
db.version(2).stores({
  tasks: 'id, date, updatedAt',
})

export const SOFT_HABIT_LIMIT = 5

export type HabitInput = Pick<Habit, 'name' | 'identity' | 'cue' | 'tiny' | 'period' | 'schedule'>

export async function saveHabit(input: HabitInput, id?: string) {
  const now = Date.now()
  if (id) {
    await db.habits.update(id, { ...input, updatedAt: now })
  } else {
    await db.habits.add({ ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now })
  }
}

export const archiveHabit = (id: string) =>
  db.habits.update(id, { archivedAt: Date.now(), updatedAt: Date.now() })

export const restoreHabit = (id: string) =>
  db.habits.update(id, { archivedAt: undefined, updatedAt: Date.now() })

export const deleteHabit = (id: string) =>
  db.habits.update(id, { deletedAt: Date.now(), updatedAt: Date.now() })

/** level = null deshace la marca. */
export async function setCompletion(habitId: string, date: string, level: Level | null) {
  const id = `${habitId}_${date}`
  const now = Date.now()
  if (level) await db.completions.put({ id, habitId, date, level, updatedAt: now })
  else await db.completions.update(id, { deletedAt: now, updatedAt: now })
}

export function addTask(title: string, date: string) {
  const now = Date.now()
  return db.tasks.add({ id: crypto.randomUUID(), title, date, createdAt: now, updatedAt: now })
}

export const toggleTask = (id: string, done: boolean) =>
  db.tasks.update(id, { doneAt: done ? Date.now() : undefined, updatedAt: Date.now() })

export const moveTask = (id: string, date: string) => db.tasks.update(id, { date, updatedAt: Date.now() })

export const dropTask = (id: string) => db.tasks.update(id, { deletedAt: Date.now(), updatedAt: Date.now() })
