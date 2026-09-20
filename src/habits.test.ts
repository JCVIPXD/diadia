import { describe, expect, it } from 'vitest'
import type { Habit, Schedule } from './db'
import { addDays, consistency, isScheduled, streak, today, weekStart } from './habits'

// Hoy = sábado 2026-09-19 (el día "cambia" a las 4am, así que a las 12:00 no hay ambigüedad).
const TODAY = '2026-09-19'

const habit = (schedule: Schedule, created = '2026-09-01'): Habit => {
  const [y, m, d] = created.split('-').map(Number)
  const t = new Date(y, m - 1, d, 12).getTime()
  return { id: 'h', name: 'x', schedule, createdAt: t, updatedAt: t }
}
const daysBack = (...offsets: number[]) => new Set(offsets.map(n => addDays(TODAY, -n)))

describe('fechas', () => {
  it('el día cambia a las 4am', () => {
    expect(today(new Date(2026, 8, 20, 1, 30))).toBe('2026-09-19')
    expect(today(new Date(2026, 8, 20, 4, 0))).toBe('2026-09-20')
  })
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('la semana empieza el lunes', () => {
    expect(weekStart('2026-09-20')).toBe('2026-09-14') // domingo
    expect(weekStart('2026-09-14')).toBe('2026-09-14') // lunes
  })
})

describe('isScheduled', () => {
  it('respeta los días elegidos', () => {
    const h = habit({ type: 'days', days: [1, 3] }) // lunes y miércoles
    expect(isScheduled(h, '2026-09-14')).toBe(true)
    expect(isScheduled(h, '2026-09-15')).toBe(false)
  })
})

describe('streak diaria con perdón', () => {
  const h = habit({ type: 'daily' })

  it('cuenta días seguidos y hoy pendiente no rompe nada', () => {
    const s = streak(h, daysBack(1, 2, 3), TODAY)
    expect(s).toMatchObject({ current: 3, best: 3, atRisk: false })
  })
  it('un fallo aislado no rompe la racha, pero queda en riesgo', () => {
    // cumplido hace 1, 3, 4 (falló hace 2)
    const s = streak(h, daysBack(1, 3, 4), TODAY)
    expect(s).toMatchObject({ current: 3, atRisk: false }) // ya volvió a cumplir
    const s2 = streak(h, daysBack(2, 3, 4), TODAY) // falló ayer, hoy pendiente
    expect(s2).toMatchObject({ current: 3, atRisk: true })
  })
  it('dos fallos seguidos la rompen', () => {
    const s = streak(h, daysBack(3, 4, 5), TODAY) // fallos ayer y anteayer
    expect(s.current).toBe(0)
    expect(s.best).toBe(3)
  })
  it('después de romperse, vuelve a empezar desde 1', () => {
    const s = streak(h, daysBack(0, 3, 4, 5), TODAY)
    expect(s.current).toBe(1)
    expect(s.best).toBe(3)
  })
  it('hoy cumplido suma', () => {
    expect(streak(h, daysBack(0, 1), TODAY).current).toBe(2)
  })
  it('sin historial da 0', () => {
    expect(streak(h, new Set(), TODAY)).toMatchObject({ current: 0, best: 0, atRisk: false })
  })
})

describe('streak con días concretos', () => {
  it('los días no programados no cuentan como fallo', () => {
    // lunes y miércoles; hoy sábado 19: cumplió lun 14 y mié 16
    const h = habit({ type: 'days', days: [1, 3] })
    const done = new Set(['2026-09-14', '2026-09-16'])
    expect(streak(h, done, TODAY)).toMatchObject({ current: 2, atRisk: false })
  })
})

describe('streak semanal', () => {
  // semanas: 08-31, 09-07, 09-14 (actual). Hábito creado el 2026-09-01 (primera semana parcial)
  const h = habit({ type: 'weekly', times: 2 })
  it('cuenta semanas que cumplen la meta', () => {
    const done = new Set(['2026-09-08', '2026-09-09', '2026-09-15']) // 2 en sem. 09-07, 1 en la actual
    expect(streak(h, done, TODAY)).toMatchObject({ current: 1, unit: 'semana' })
  })
  it('la semana en curso no cuenta como fallo', () => {
    const done = new Set(['2026-09-01', '2026-09-02', '2026-09-08', '2026-09-09'])
    expect(streak(h, done, TODAY).current).toBe(2)
  })
})

describe('consistency', () => {
  const h = habit({ type: 'daily' })
  it('null si aún no hay nada que medir', () => {
    expect(consistency(habit({ type: 'daily' }, TODAY), new Set(), TODAY)).toBeNull()
  })
  it('porcentaje de días cumplidos', () => {
    // creado el 09-01: 18 días desde el 1 al 18 (hoy pendiente no cuenta); cumplió 9
    const done = new Set(Array.from({ length: 9 }, (_, i) => addDays('2026-09-01', i)))
    expect(consistency(h, done, TODAY)).toBe(50)
  })
})
