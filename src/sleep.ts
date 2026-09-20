// Cálculos de sueño, puros y sin base de datos.

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const fmt = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`

/** Minutos dormidos entre acostarse y levantarse (cruza la medianoche si hace falta). null si no hay datos válidos. */
export function sleepMinutes(bedtime?: string, wake?: string): number | null {
  if (!bedtime || !wake) return null
  const min = (toMin(wake) - toMin(bedtime) + 1440) % 1440
  return min === 0 ? null : min
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Minutos desde las 18:00: así 23:30 y 00:30 quedan a solo 1 hora y se pueden promediar. */
const bedOffset = (bedtime: string) => (toMin(bedtime) - 18 * 60 + 1440) % 1440

export interface SleepStats {
  nights: number
  avgMinutes: number
  avgBedtime: string
  /** Desviación típica de la hora de acostarse, en minutos: cuanto menor, más regular. */
  spreadMinutes: number
  /** % de noches acostado a ±30 min de la hora objetivo. */
  onGoalPct: number
}

export function sleepStats(nights: { bedtime?: string; wake?: string }[], goal: string, toleranceMin = 30): SleepStats | null {
  const valid = nights.filter(n => n.bedtime && sleepMinutes(n.bedtime, n.wake) !== null) as { bedtime: string; wake: string }[]
  if (valid.length === 0) return null

  const offsets = valid.map(n => bedOffset(n.bedtime))
  const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length
  const spread = Math.sqrt(offsets.reduce((a, o) => a + (o - mean) ** 2, 0) / offsets.length)
  const goalOffset = bedOffset(goal)
  const total = valid.reduce((a, n) => a + (sleepMinutes(n.bedtime, n.wake) ?? 0), 0)

  return {
    nights: valid.length,
    avgMinutes: total / valid.length,
    avgBedtime: fmt(mean + 18 * 60),
    spreadMinutes: Math.round(spread),
    onGoalPct: Math.round((offsets.filter(o => Math.abs(o - goalOffset) <= toleranceMin).length / offsets.length) * 100),
  }
}
