import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { EntityTable, IDType } from 'dexie'
import { db, type Checkin, type Completion, type Habit, type Review, type Task } from './db'
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
  // Opcionales: las copias hechas antes de existir estas tablas no las traen.
  checkins?: Checkin[]
  reviews?: Review[]
}

type Row = { id: string; updatedAt: number }

export function lastBackupAt(): number | null {
  try {
    return Number(localStorage.getItem(LAST_BACKUP_KEY)) || null
  } catch {
    return null
  }
}

function markBackupDone() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
  } catch {
    // sin localStorage solo se pierde el aviso de "última copia"
  }
}

/** Todos los datos (incluidos los borrados, para que también se propaguen al importar). */
async function buildBackupFile() {
  const [habits, completions, tasks, checkins, reviews] = await Promise.all([
    db.habits.toArray(),
    db.completions.toArray(),
    db.tasks.toArray(),
    db.checkins.toArray(),
    db.reviews.toArray(),
  ])
  const data: Backup = { format: FORMAT, version: 1, exportedAt: Date.now(), habits, completions, tasks, checkins, reviews }
  return new File([JSON.stringify(data)], `diadia-${toDateStr(new Date())}.json`, { type: 'application/json' })
}

const isNative = () => Capacitor.isNativePlatform()

/** Descarga el archivo (navegador de escritorio o PWA). */
export async function exportBackup() {
  const file = await buildBackupFile()
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  markBackupDone()
}

/** ¿Se puede compartir la copia como archivo (menú de compartir de Android)? */
export const canShareBackup = () => isNative() || !!navigator.canShare?.({ files: [new File([''], 'x.json', { type: 'application/json' })] })

/**
 * Abre el menú de compartir con la copia. Devuelve false si el usuario lo canceló.
 * En la app de Android el WebView no descarga archivos ni tiene navigator.share,
 * así que se guarda en la caché y se comparte con los plugins nativos.
 */
export async function shareBackup() {
  const file = await buildBackupFile()
  try {
    if (isNative()) {
      const { uri } = await Filesystem.writeFile({ path: file.name, data: await file.text(), directory: Directory.Cache, encoding: Encoding.UTF8 })
      await Share.share({ title: 'Copia de diadia', files: [uri] })
    } else {
      await navigator.share({ files: [file], title: 'Copia de diadia' })
    }
  } catch (e) {
    const cancelled = (e instanceof DOMException && e.name === 'AbortError') || (e instanceof Error && /cancel/i.test(e.message))
    if (cancelled) return false
    throw e
  }
  markBackupDone()
  return true
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

  return db.transaction('rw', [db.habits, db.completions, db.tasks, db.checkins, db.reviews], async () => {
    const counts = await Promise.all([
      mergeTable(db.habits, data.habits),
      mergeTable(db.completions, data.completions),
      mergeTable(db.tasks, data.tasks),
      mergeTable(db.checkins, data.checkins ?? []),
      mergeTable(db.reviews, data.reviews ?? []),
    ])
    return counts.reduce((a, b) => a + b, 0)
  })
}
