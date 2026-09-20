import type { EntityTable, IDType } from 'dexie'
import { db, type Completion, type Habit, type Task } from './db'
import { toDateStr } from './habits'

const FORMAT = 'diadia-backup'
const LAST_BACKUP_KEY = 'diadia:lastBackup'

interface Backup {
  format: typeof FORMAT
  version: 1
  exportedAt: number
  habits: Habit[]
  completions: Completion[]
  tasks: Task[]
}

type Row = { id: string; updatedAt: number }

export function lastBackupAt(): number | null {
  try {
    return Number(localStorage.getItem(LAST_BACKUP_KEY)) || null
  } catch {
    return null
  }
}

/** Descarga todos los datos (incluidos los borrados, para que también se propaguen al importar). */
export async function exportBackup() {
  const [habits, completions, tasks] = await Promise.all([
    db.habits.toArray(),
    db.completions.toArray(),
    db.tasks.toArray(),
  ])
  const data: Backup = { format: FORMAT, version: 1, exportedAt: Date.now(), habits, completions, tasks }

  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `diadia-${toDateStr(new Date())}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
  } catch {
    // sin localStorage solo se pierde el aviso de "última copia"
  }
}

const isRow = (x: unknown): x is Row =>
  typeof x === 'object' && x !== null && typeof (x as Row).id === 'string' && typeof (x as Row).updatedAt === 'number'

/** Fusiona por fila: solo entra lo que no existe o es más reciente que lo local. */
async function mergeTable<T extends Row>(table: EntityTable<T, 'id'>, incoming: unknown) {
  if (!Array.isArray(incoming)) throw new Error('Archivo no válido')
  const rows = incoming.filter(isRow) as T[]
  const existing = await table.bulkGet(rows.map(r => r.id) as IDType<T, 'id'>[])
  const newer = rows.filter((r, i) => !existing[i] || existing[i].updatedAt < r.updatedAt)
  await table.bulkPut(newer)
  return newer.length
}

/** Devuelve cuántos registros se añadieron o actualizaron. */
export async function importBackup(file: File): Promise<number> {
  let data: Partial<Backup>
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('Archivo no válido')
  }
  if (data.format !== FORMAT || data.version !== 1) throw new Error('Este archivo no es una copia de diadia')

  return db.transaction('rw', db.habits, db.completions, db.tasks, async () => {
    const counts = await Promise.all([
      mergeTable(db.habits, data.habits),
      mergeTable(db.completions, data.completions),
      mergeTable(db.tasks, data.tasks),
    ])
    return counts.reduce((a, b) => a + b, 0)
  })
}
