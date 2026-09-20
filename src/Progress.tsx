import { useState } from 'react'
import { saveReview, type Checkin } from './db'
import { addDays, consistency, heatmap, parseDate, streak, weekStart, weekSummary } from './habits'
import { useCheckins, useHabitData, useReviews, useToday, type HabitData } from './hooks'
import { useSettings } from './settings'
import { formatDuration, sleepMinutes, sleepStats } from './sleep'

const shortDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

/** Cuántas semanas atrás se puede consultar. */
const MAX_WEEKS_BACK = 12

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

function Heatmap({ data, todayStr }: { data: HabitData; todayStr: string }) {
  const cells = heatmap(data.habit, data.done, todayStr, 12)
  return (
    <div className="heat" role="img" aria-label={`Calendario de las últimas 12 semanas: ${data.done.size} días cumplidos en total`}>
      {cells.map(c => (
        <i key={c.date} className={`cell ${c.kind}`} title={c.date} />
      ))}
    </div>
  )
}

function HabitProgress({ data, todayStr }: { data: HabitData; todayStr: string }) {
  const { habit, done } = data
  const st = streak(habit, done, todayStr)
  const pct = consistency(habit, done, todayStr)
  const plural = (n: number) => `${n} ${st.unit}${n === 1 ? '' : 's'}`

  return (
    <li className="card progress-habit">
      <div className="ph-head">
        <strong>{habit.name}</strong>
        {pct !== null && <span className="pct" title="Cumplimiento de los últimos 28 días">{pct}%</span>}
      </div>
      <Heatmap data={data} todayStr={todayStr} />
      <p className="sub">
        Racha {plural(st.current)} · mejor {plural(st.best)} · {done.size} en total
      </p>
    </li>
  )
}

function WeekReview({ data, checkins, todayStr }: { data: HabitData[]; checkins: Map<string, Checkin>; todayStr: string }) {
  const reviews = useReviews()
  const [back, setBack] = useState(0)
  const week = addDays(weekStart(todayStr), -7 * back)
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const review = reviews?.get(week)

  const lines = data
    .filter(d => !d.habit.archivedAt)
    .map(d => ({ habit: d.habit, ...weekSummary(d.habit, d.done, week, todayStr) }))
    .filter(l => l.expected > 0)
  const got = lines.reduce((a, l) => a + l.got, 0)
  const expected = lines.reduce((a, l) => a + l.expected, 0)

  const week7 = days.map(d => checkins.get(d)).filter((c): c is Checkin => !!c)
  const sleeps = week7.map(c => sleepMinutes(c.bedtime, c.wake)).filter((m): m is number => m !== null)
  const mood = avg(week7.flatMap(c => (c.mood ? [c.mood] : [])))
  const energy = avg(week7.flatMap(c => (c.energy ? [c.energy] : [])))
  const sleepAvg = avg(sleeps)

  return (
    <section>
      <h2>Revisión semanal</h2>
      <div className="card">
        <div className="weeknav">
          <button aria-label="Semana anterior" disabled={back >= MAX_WEEKS_BACK} onClick={() => setBack(b => b + 1)}>‹</button>
          <strong>
            {shortDate.format(parseDate(week))} – {shortDate.format(parseDate(addDays(week, 6)))}
            {back === 0 && ' · esta semana'}
          </strong>
          <button aria-label="Semana siguiente" disabled={back === 0} onClick={() => setBack(b => b - 1)}>›</button>
        </div>

        {lines.length > 0 ? (
          <>
            <p className="big">
              {expected ? Math.round((got / expected) * 100) : 0}% <span className="sub">de tus hábitos ({got} de {expected})</span>
            </p>
            <ul className="weeklines">
              {lines.map(l => (
                <li key={l.habit.id}>
                  <span>{l.habit.name}</span>
                  <span className="sub">{l.got}/{l.expected}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="sub">Sin hábitos que medir esta semana.</p>
        )}

        {(sleepAvg !== null || mood !== null || energy !== null) && (
          <p className="sub statline">
            {sleepAvg !== null && <>Sueño medio {formatDuration(sleepAvg)} · </>}
            {mood !== null && <>ánimo {mood.toFixed(1)}/5 · </>}
            {energy !== null && <>energía {energy.toFixed(1)}/5</>}
          </p>
        )}

        <label className="field">
          <span>¿Qué me ayudó esta semana?</span>
          <textarea
            key={week + 'h'}
            rows={2}
            defaultValue={review?.helped ?? ''}
            onBlur={e => e.target.value.trim() !== (review?.helped ?? '') && saveReview(week, { helped: e.target.value.trim() || undefined })}
          />
        </label>
        <label className="field">
          <span>¿Qué me estorbó?</span>
          <textarea
            key={week + 'r'}
            rows={2}
            defaultValue={review?.hindered ?? ''}
            onBlur={e => e.target.value.trim() !== (review?.hindered ?? '') && saveReview(week, { hindered: e.target.value.trim() || undefined })}
          />
        </label>
      </div>
    </section>
  )
}

function Sleep({ checkins, todayStr }: { checkins: Map<string, Checkin>; todayStr: string }) {
  const { bedtimeGoal } = useSettings()
  const days = Array.from({ length: 14 }, (_, i) => addDays(todayStr, i - 13))
  const nights = days.map(d => ({ date: d, minutes: sleepMinutes(checkins.get(d)?.bedtime, checkins.get(d)?.wake) }))
  const stats = sleepStats(days.map(d => checkins.get(d) ?? {}), bedtimeGoal)

  return (
    <section>
      <h2>Sueño · últimos 14 días</h2>
      <div className="card">
        {!stats ? (
          <p className="sub">Anota a qué hora te acostaste y te levantaste en el check-in de cada día y aquí verás tu regularidad.</p>
        ) : (
          <>
            <div className="bars" role="img" aria-label={`Horas dormidas en los últimos 14 días, promedio ${formatDuration(stats.avgMinutes)}`}>
              {nights.map(n => (
                <i
                  key={n.date}
                  className={n.minutes === null ? 'none' : ''}
                  style={{ height: n.minutes === null ? '4px' : `${Math.min(100, (n.minutes / 600) * 100)}%` }}
                  title={n.minutes === null ? `${n.date}: sin datos` : `${n.date}: ${formatDuration(n.minutes)}`}
                />
              ))}
            </div>
            <ul className="stats">
              <li><strong>{formatDuration(stats.avgMinutes)}</strong><span className="sub">duermes de media</span></li>
              <li><strong>{stats.avgBedtime}</strong><span className="sub">te acuestas de media</span></li>
              <li>
                <strong>±{stats.spreadMinutes} min</strong>
                <span className="sub">
                  {stats.spreadMinutes <= 30 ? 'muy regular' : stats.spreadMinutes <= 60 ? 'bastante regular' : 'irregular'}
                </span>
              </li>
              <li><strong>{stats.onGoalPct}%</strong><span className="sub">noches a las {bedtimeGoal} ±30 min</span></li>
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

export default function Progress() {
  const data = useHabitData()
  const checkins = useCheckins()
  const todayStr = useToday()
  if (!data || !checkins) return null

  const active = data.filter(d => !d.habit.archivedAt)

  return (
    <>
      <header className="head">
        <div>
          <h1>Progreso</h1>
          <p>Lo que has ido construyendo</p>
        </div>
      </header>

      <WeekReview data={data} checkins={checkins} todayStr={todayStr} />

      {active.length > 0 && (
        <section>
          <h2>Tus hábitos · 12 semanas</h2>
          <ul className="list">
            {active.map(d => (
              <HabitProgress key={d.habit.id} data={d} todayStr={todayStr} />
            ))}
          </ul>
          <p className="legend">
            <i className="cell full" /> hecho <i className="cell tiny" /> versión mínima <i className="cell miss" /> no hecho
          </p>
        </section>
      )}

      <Sleep checkins={checkins} todayStr={todayStr} />
    </>
  )
}
