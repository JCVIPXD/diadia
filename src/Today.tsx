import { useEffect, useState, type CSSProperties } from 'react'
import Check from './Check'
import { setCompletion, type Period } from './db'
import { buzz } from './haptics'
import { addDays, habitStart, isScheduled, parseDate, streak, weekCount, weeklyTarget } from './habits'
import { useHabitData, useToday, type HabitData } from './hooks'
import Tasks from './Tasks'

const dateFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

/** Hasta cuántos días atrás se puede corregir. */
const MAX_BACK = 30

function Ring({ done, total }: { done: number; total: number }) {
  const r = 28
  const c = 2 * Math.PI * r
  const target = total ? done / total : 0
  // Arranca en 0 y sube al valor real tras el primer pintado, para que el anillo se llene al entrar.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target))
    return () => cancelAnimationFrame(id)
  }, [target])
  const complete = total > 0 && done === total

  return (
    <div className={`ring${complete ? ' complete' : ''}`} role="img" aria-label={`${done} de ${total} hábitos`}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle className="track" cx="32" cy="32" r={r} />
        <circle className="fill" cx="32" cy="32" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - shown)} />
      </svg>
      <span>{total ? `${done}/${total}` : '–'}</span>
    </div>
  )
}

/** Contador de un hábito numérico ("5/8 vasos"). Al llegar a la meta se marca solo. */
function Counter({ data, day }: { data: HabitData; day: string }) {
  const { habit, values } = data
  const goal = habit.goal!
  const value = values.get(day) ?? 0
  const step = goal.amount >= 20 ? 5 : 1

  function change(delta: number) {
    const next = Math.max(0, value + delta)
    if (next === 0) return setCompletion(habit.id, day, null)
    if (next >= goal.amount && value < goal.amount) buzz()
    return setCompletion(habit.id, day, next >= goal.amount ? 'full' : 'partial', next)
  }

  return (
    <div className="counter">
      <button aria-label={`Restar ${step}`} onClick={() => change(-step)} disabled={value === 0}>−</button>
      <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={goal.amount} aria-valuenow={value}>
        <i style={{ width: `${Math.min(100, (value / goal.amount) * 100)}%` }} />
      </div>
      <output>
        {value}/{goal.amount} {goal.unit}
      </output>
      <button aria-label={`Sumar ${step}`} onClick={() => change(step)}>+</button>
    </div>
  )
}

function HabitRow({ data, day, todayStr, index }: { data: HabitData; day: string; todayStr: string; index: number }) {
  const { habit, done } = data
  const mark = done.get(day)
  const st = streak(habit, done, todayStr)
  const weekly = habit.schedule.type === 'weekly'
  const numeric = !!habit.goal
  const doneThisWeek = weekCount(done, day)
  const weekMet = weekly && !mark && doneThisWeek >= weeklyTarget(habit)

  return (
    <li className={`row${mark ? ' is-done' : ''}${weekMet ? ' is-met' : ''}`} style={{ '--i': index } as CSSProperties}>
      <button
        className={`check ${mark?.level ?? ''}`}
        aria-pressed={!!mark}
        aria-label={`${mark ? 'Deshacer' : 'Completar'}: ${habit.name}`}
        onClick={() => {
          if (!mark) buzz()
          setCompletion(habit.id, day, mark ? null : 'full', numeric && !mark ? habit.goal!.amount : undefined)
        }}
      >
        <Check />
      </button>

      <div className="body">
        <div className="title">
          {habit.name}
          {habit.time && <span className="time">{habit.time}</span>}
        </div>
        {habit.cue && <div className="sub">{habit.cue}</div>}
        {weekly && (
          <div className="sub">
            {doneThisWeek}/{weeklyTarget(habit)} esta semana
          </div>
        )}
        {st.atRisk && !mark && day === todayStr && <div className="sub risk">No falles hoy y mantienes la racha</div>}
        {numeric && <Counter data={data} day={day} />}
        {!numeric && !mark && habit.tiny && (
          <button
            className="link"
            onClick={() => {
              buzz()
              setCompletion(habit.id, day, 'tiny')
            }}
          >
            Versión mínima: {habit.tiny}
          </button>
        )}
        {mark?.level === 'tiny' && (
          <button
            className="link"
            onClick={() => {
              buzz()
              setCompletion(habit.id, day, 'full')
            }}
          >
            Versión mínima hecha · ¿lo completaste entero?
          </button>
        )}
      </div>

      {st.current > 0 && (
        <div className="streak">
          <strong key={st.current} className="bump">
            {st.current}
          </strong>
          <small>
            {st.unit}
            {st.current === 1 ? '' : 's'}
          </small>
        </div>
      )}
    </li>
  )
}

function message(done: number, total: number, isToday: boolean) {
  if (total === 0) return isToday ? 'Hoy no tienes hábitos programados. Descansa.' : 'Ese día no había hábitos programados.'
  if (done === total) return isToday ? 'Día completo. Bien hecho.' : 'Día completo.'
  if (done === 0) return isToday ? 'Empieza por el más fácil.' : 'Marca lo que sí hiciste ese día.'
  return isToday ? `Vas bien, te quedan ${total - done}.` : `Te faltan ${total - done} por marcar.`
}

const GROUPS: [Period | undefined, string][] = [
  ['morning', 'Mañana'],
  ['afternoon', 'Tarde'],
  ['evening', 'Noche'],
  [undefined, 'Durante el día'],
]

function dayLabel(offset: number) {
  return offset === 0 ? 'Hoy' : offset === -1 ? 'Ayer' : `Hace ${-offset} días`
}

export default function Today({ onAdd }: { onAdd: () => void }) {
  const data = useHabitData()
  const todayStr = useToday()
  const [offset, setOffset] = useState(0) // 0 = hoy, -1 = ayer…
  if (!data) return null

  const day = addDays(todayStr, offset)
  const isToday = offset === 0
  const active = data.filter(d => !d.habit.archivedAt)
  const visible = active.filter(d => habitStart(d.habit) <= day && (isScheduled(d.habit, day) || d.done.has(day)))
  const doneCount = visible.filter(d => d.done.has(day)).length
  // Solo se muestran las franjas si al menos un hábito tiene una asignada.
  const showGroups = visible.some(d => d.habit.period)
  const msg = message(doneCount, visible.length, isToday)
  let order = 0 // posición en pantalla, para escalonar la entrada de las filas

  return (
    <>
      <header className="head">
        <div>
          <div className="daynav">
            <button aria-label="Día anterior" disabled={offset <= -MAX_BACK} onClick={() => setOffset(o => o - 1)}>‹</button>
            <h1>{dayLabel(offset)}</h1>
            <button aria-label="Día siguiente" disabled={isToday} onClick={() => setOffset(o => o + 1)}>›</button>
          </div>
          <p className="date">{dateFormat.format(parseDate(day))}</p>
        </div>
        {active.length > 0 && <Ring done={doneCount} total={visible.length} />}
      </header>

      {!isToday && (
        <p className="banner">
          Estás corrigiendo un día anterior; lo que marques cuenta para tu racha.{' '}
          <button className="link inline" onClick={() => setOffset(0)}>Volver a hoy</button>
        </p>
      )}

      {active.length === 0 ? (
        <div className="empty">
          <h2>Empecemos con uno</h2>
          <p>Elige un solo hábito pequeño. Es mejor uno constante que cinco a medias.</p>
          <button className="btn" onClick={onAdd}>
            Crear mi primer hábito
          </button>
        </div>
      ) : (
        <>
          {GROUPS.map(([period, label]) => {
            const items = visible.filter(d => d.habit.period === period)
            if (items.length === 0) return null
            return (
              <section key={label}>
                {showGroups && <h2 className="group">{label}</h2>}
                <ul className="list">
                  {items.map(d => (
                    <HabitRow key={d.habit.id} data={d} day={day} todayStr={todayStr} index={order++} />
                  ))}
                </ul>
              </section>
            )
          })}
          <p className="note" key={msg}>
            {msg}
          </p>
        </>
      )}

      {isToday && <Tasks day={todayStr} />}
    </>
  )
}
