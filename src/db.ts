import Dexie, { type EntityTable } from 'dexie'

export type Schedule =
  | { type: 'daily' }
  | { type: 'days'; days: number[] } // 0 = domingo … 6 = sábado
  | { type: 'weekly'; times: number } // N veces por semana, cualquier día

// 'partial': hábito numérico con avance pero sin llegar a la meta (no cuenta como cumplido).
export type Level = 'full' | 'tiny' | 'partial'

export type Period = 'morning' | 'afternoon' | 'evening'

export interface Pause {
  from: string // YYYY-MM-DD, inclusive
  to?: string // inclusive; sin valor = sigue en pausa
}

// Cada fila lleva updatedAt (y deletedAt como marca de borrado) para poder
// fusionar datos entre dispositivos: gana el cambio más reciente por fila.
export interface Habit {
  id: string
  name: string
  identity?: string // "Soy alguien que…"
  cue?: string // cuándo / dónde
  tiny?: string // versión mínima
  period?: Period // momento del día; sin valor = "durante el día"
  time?: string // HH:mm, hora del recordatorio
  goal?: { amount: number; unit: string } // hábito numérico: "8 vasos"
  pauses?: Pause[]
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
  value?: number // solo hábitos numéricos
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

// Check-in de un día (id = la fecha): ánimo, energía, sueño y una nota.
export interface Checkin {
  id: string // YYYY-MM-DD
  mood?: number // 1–5
  energy?: number // 1–5
  bedtime?: string // HH:mm, a qué hora se acostó anoche
  wake?: string // HH:mm, a qué hora se levantó
  note?: string
  updatedAt: number
  deletedAt?: number
}

// Revisión semanal (id = el lunes de esa semana).
export interface Review {
  id: string // YYYY-MM-DD del lunes
  helped?: string
  hindered?: string
  updatedAt: number
  deletedAt?: number
}

export const db = new Dexie('diadia') as Dexie & {
  habits: EntityTable<Habit, 'id'>
  completions: EntityTable<Completion, 'id'>
  tasks: EntityTable<Task, 'id'>
  checkins: EntityTable<Checkin, 'id'>
  reviews: EntityTable<Review, 'id'>
}

db.version(1).stores({
  habits: 'id, updatedAt',
  completions: 'id, habitId, date, updatedAt',
})
db.version(2).stores({
  tasks: 'id, date, updatedAt',
})
db.version(3).stores({
  checkins: 'id, updatedAt',
  reviews: 'id, updatedAt',
})

export const SOFT_HABIT_LIMIT = 5

export type HabitInput = Pick<Habit, 'name' | 'identity' | 'cue' | 'tiny' | 'period' | 'time' | 'goal' | 'schedule'>

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

export const setPauses = (id: string, pauses: Pause[]) =>
  db.habits.update(id, { pauses, updatedAt: Date.now() })

/** level = null deshace la marca. `value` solo para hábitos numéricos. */
export async function setCompletion(habitId: string, date: string, level: Level | null, value?: number) {
  const id = `${habitId}_${date}`
  const now = Date.now()
  if (level) await db.completions.put({ id, habitId, date, level, value, updatedAt: now })
  else await db.completions.update(id, { deletedAt: now, updatedAt: now })
}

export function addTask(title: string, date: string) {
  const now = Date.now()
  return db.tasks.add({ id: crypto.randomUUID(), title, date, createdAt: now, updatedAt: now })
}

export const toggleTask = (id: string, done: boolean) =>
  db.tasks.update(id, { doneAt: done ? Date.now() : undefined, updatedAt: Date.now() })

export const moveTask = (id: string, date: string) => db.tasks.update(id, { date, updatedAt: Date.now() })

export const renameTask = (id: string, title: string) => db.tasks.update(id, { title, updatedAt: Date.now() })

export const dropTask = (id: string) => db.tasks.update(id, { deletedAt: Date.now(), updatedAt: Date.now() })

export const restoreTask = (id: string) => db.tasks.update(id, { deletedAt: undefined, updatedAt: Date.now() })

type CheckinPatch = Partial<Omit<Checkin, 'id' | 'updatedAt' | 'deletedAt'>>

/** Actualiza solo los campos indicados; `undefined` borra el campo. */
export async function saveCheckin(date: string, patch: CheckinPatch) {
  const prev = await db.checkins.get(date)
  await db.checkins.put({ ...prev, ...patch, id: date, updatedAt: Date.now(), deletedAt: undefined })
}

export async function saveReview(weekStart: string, patch: Partial<Pick<Review, 'helped' | 'hindered'>>) {
  const prev = await db.reviews.get(weekStart)
  await db.reviews.put({ ...prev, ...patch, id: weekStart, updatedAt: Date.now(), deletedAt: undefined })
}
