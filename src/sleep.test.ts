import { describe, expect, it } from 'vitest'
import { formatDuration, sleepMinutes, sleepStats } from './sleep'

describe('sleepMinutes', () => {
  it('cruza la medianoche', () => {
    expect(sleepMinutes('23:00', '07:00')).toBe(480)
    expect(sleepMinutes('01:30', '07:30')).toBe(360)
  })
  it('null si falta un dato o son iguales', () => {
    expect(sleepMinutes(undefined, '07:00')).toBeNull()
    expect(sleepMinutes('07:00', '07:00')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('formatea horas y minutos', () => {
    expect(formatDuration(450)).toBe('7 h 30 min')
    expect(formatDuration(480)).toBe('8 h')
  })
})

describe('sleepStats', () => {
  it('null sin datos', () => {
    expect(sleepStats([], '23:00')).toBeNull()
    expect(sleepStats([{ bedtime: '23:00' }], '23:00')).toBeNull() // sin hora de levantarse
  })
  it('promedia horas que cruzan la medianoche sin errores', () => {
    // 23:30 y 00:30 → promedio 00:00, no 12:00
    const s = sleepStats(
      [{ bedtime: '23:30', wake: '07:30' }, { bedtime: '00:30', wake: '08:30' }],
      '23:00',
    )!
    expect(s.avgBedtime).toBe('00:00')
    expect(s.avgMinutes).toBe(480)
    expect(s.spreadMinutes).toBe(30)
  })
  it('% de noches dentro de la tolerancia de la hora objetivo', () => {
    const s = sleepStats(
      [
        { bedtime: '23:10', wake: '07:00' }, // dentro (10 min tarde)
        { bedtime: '23:45', wake: '07:00' }, // fuera (45 min tarde)
        { bedtime: '22:40', wake: '06:30' }, // dentro (20 min antes)
        { bedtime: '01:00', wake: '08:00' }, // fuera
      ],
      '23:00',
    )!
    expect(s.onGoalPct).toBe(50)
  })
})
