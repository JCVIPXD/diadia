import { describe, expect, it } from 'vitest'
import type { Habit } from './db'
import { DAYS_AHEAD, planReminders, stableId } from './reminderPlan'

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1', name: 'Leer', schedule: { type: 'daily' }, createdAt: 1, updatedAt: 1, time: '20:00', ...over,
})
const opts = (over = {}) => ({
  now: new Date(2026, 8, 20, 12, 0), todayStr: '2026-09-20', rolloverHour: 4, bedtimeGoal: '23:00', bedtimeReminder: false, ...over,
})
const none = { has: () => false }

describe('planReminders', () => {
  it('programa un aviso por día a la hora del hábito', () => {
    const plan = planReminders([{ habit: habit(), done: none }], opts())
    expect(plan).toHaveLength(DAYS_AHEAD)
    expect(plan[0].at).toEqual(new Date(2026, 8, 20, 20, 0))
    expect(plan[0].title).toBe('Leer')
  })

  it('no avisa de lo que ya pasó hoy', () => {
    const plan = planReminders([{ habit: habit({ time: '08:00' }), done: none }], opts())
    expect(plan[0].at).toEqual(new Date(2026, 8, 21, 8, 0)) // el de hoy a las 8:00 ya pasó
    expect(plan).toHaveLength(DAYS_AHEAD - 1)
  })

  it('no avisa si ya lo hiciste ese día', () => {
    const plan = planReminders([{ habit: habit(), done: { has: (d: string) => d === '2026-09-20' } }], opts())
    expect(plan[0].at).toEqual(new Date(2026, 8, 21, 20, 0))
  })

  it('respeta los días elegidos y las pausas', () => {
    const lunes = habit({ schedule: { type: 'days', days: [1] } }) // lunes
    const p1 = planReminders([{ habit: lunes, done: none }], opts())
    expect(p1.map(r => r.at.getDay())).toEqual(p1.map(() => 1))

    const pausado = habit({ pauses: [{ from: '2026-09-20' }] })
    expect(planReminders([{ habit: pausado, done: none }], opts())).toHaveLength(0)
  })

  it('ignora hábitos sin hora y archivados', () => {
    expect(planReminders([{ habit: habit({ time: undefined }), done: none }], opts())).toHaveLength(0)
    expect(planReminders([{ habit: habit({ archivedAt: 5 }), done: none }], opts())).toHaveLength(0)
  })

  it('una hora de madrugada cae en el día calendario siguiente (corte a las 4am)', () => {
    const plan = planReminders([{ habit: habit({ time: '01:00' }), done: none }], opts())
    expect(plan[0].at).toEqual(new Date(2026, 8, 21, 1, 0)) // día lógico 20 → 21 a la 1:00
  })

  it('recordatorio de dormir: 30 min antes de la hora objetivo', () => {
    const plan = planReminders([], opts({ bedtimeReminder: true }))
    expect(plan[0].at).toEqual(new Date(2026, 8, 20, 22, 30))
    expect(plan[0].title).toMatch(/dormir/)
    expect(planReminders([], opts())).toHaveLength(0) // desactivado
  })

  it('los ids son estables y distintos por día', () => {
    const a = planReminders([{ habit: habit(), done: none }], opts())
    const b = planReminders([{ habit: habit(), done: none }], opts())
    expect(a.map(r => r.id)).toEqual(b.map(r => r.id))
    expect(new Set(a.map(r => r.id)).size).toBe(a.length)
    expect(stableId('x')).toBe(stableId('x'))
  })

  it('usa la versión mínima o la pista como texto', () => {
    expect(planReminders([{ habit: habit({ tiny: '1 página' }), done: none }], opts())[0].body).toBe('Versión mínima: 1 página')
    expect(planReminders([{ habit: habit({ cue: 'después de cenar' }), done: none }], opts())[0].body).toBe('después de cenar')
  })
})
