import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { importBackup } from './transfer'

const file = (data: unknown) => new File([JSON.stringify(data)], 'x.json', { type: 'application/json' })
const backup = (over: object = {}) => ({
  format: 'diadia-backup', version: 1, exportedAt: 0, habits: [], completions: [], tasks: [], ...over,
})
const habit = (id: string, name: string, updatedAt: number) => ({
  id, name, schedule: { type: 'daily' as const }, createdAt: 1, updatedAt,
})

beforeEach(async () => {
  await Promise.all([db.habits.clear(), db.completions.clear(), db.tasks.clear(), db.checkins.clear(), db.reviews.clear()])
})

describe('importBackup', () => {
  it('gana la fila más reciente y se ignora la más vieja', async () => {
    await db.habits.bulkAdd([habit('a', 'local-a', 100), habit('b', 'local-b', 100)])
    const n = await importBackup(file(backup({ habits: [habit('a', 'nuevo-a', 200), habit('b', 'viejo-b', 50)] })))
    expect(n).toBe(1)
    expect((await db.habits.get('a'))?.name).toBe('nuevo-a')
    expect((await db.habits.get('b'))?.name).toBe('local-b')
  })

  it('es idempotente: importar dos veces no cambia nada la segunda', async () => {
    const f = backup({ habits: [habit('a', 'x', 10)], tasks: [{ id: 't', title: 't', date: '2026-01-01', createdAt: 1, updatedAt: 10 }] })
    expect(await importBackup(file(f))).toBe(2)
    expect(await importBackup(file(f))).toBe(0)
    expect(await db.habits.count()).toBe(1)
  })

  it('propaga los borrados (deletedAt) de un dispositivo al otro', async () => {
    await db.habits.add(habit('a', 'x', 100))
    await importBackup(file(backup({ habits: [{ ...habit('a', 'x', 300), deletedAt: 300 }] })))
    expect((await db.habits.get('a'))?.deletedAt).toBe(300)
  })

  it('acepta copias antiguas sin check-ins ni revisiones', async () => {
    expect(await importBackup(file(backup({ habits: [habit('a', 'x', 1)] })))).toBe(1)
  })

  it('importa check-ins y revisiones', async () => {
    const n = await importBackup(
      file(backup({ checkins: [{ id: '2026-09-20', mood: 4, updatedAt: 5 }], reviews: [{ id: '2026-09-14', helped: 'x', updatedAt: 5 }] })),
    )
    expect(n).toBe(2)
    expect((await db.checkins.get('2026-09-20'))?.mood).toBe(4)
  })

  it('rechaza archivos que no son una copia de diadia', async () => {
    await expect(importBackup(file({ hola: 1 }))).rejects.toThrow('no es una copia')
    await expect(importBackup(new File(['no es json'], 'x.txt'))).rejects.toThrow('no válido')
    await expect(importBackup(file({ format: 'diadia-backup', version: 1, habits: 'mal', completions: [], tasks: [] }))).rejects.toThrow('no válido')
  })

  it('descarta filas mal formadas sin romper el resto', async () => {
    const n = await importBackup(file(backup({ habits: [habit('a', 'ok', 1), { nombre: 'sin id' }, null] })))
    expect(n).toBe(1)
  })
})
