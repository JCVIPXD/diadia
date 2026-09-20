import { useEffect, useState, type CSSProperties } from 'react'
import Check from './Check'
import { setCompletion, type Period } from './db'
import { buzz } from './haptics'
import { isScheduled, parseDate, streak, weekCount, weeklyTarget } from './habits'
import { useHabitData, useToday, type HabitData } from './hooks'
import Tasks from './Tasks'

const dateFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

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
    <div className={`ring${complete ? ' complete' : ''}`} role="img" aria-label={`${done} de ${total} hábitos hoy`}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle className="track" cx="32" cy="32" r={r} />
        <circle className="fill" cx="32" cy="32" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - shown)} />
      </svg>
      <span>{total ? `${done}/${total}` : '–'}</span>
    </div>
  )
}

function HabitRow({ data, day, index }: { data: HabitData; day: string; index: number }) {
  const { habit, done } = data
  const mark = done.get(day)
  const st = streak(habit, done, day)
  const weekly = habit.schedule.type === 'weekly'
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
          setCompletion(habit.id, day, mark ? null : 'full')
        }}
      >
        <Check />
      </button>

      <div className="body">
        <div className="title">{habit.name}</div>
        {habit.cue && <div className="sub">{habit.cue}</div>}
        {weekly && (
          <div className="sub">
            {doneThisWeek}/{weeklyTarget(habit)} esta semana
          </div>
        )}
        {st.atRisk && !mark && <div className="sub risk">No falles hoy y mantienes la racha</div>}
        {!mark && habit.tiny && (
          <button
            className="link"
            onClick={() => {
              buzz()
              setCompletion(habit.id, day, 'tiny')
            }}
          >
            Hoy, versión mínima: {habit.tiny}
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

function message(done: number, total: number) {
  if (total === 0) return 'Hoy no tienes hábitos programados. Descansa.'
  if (done === total) return 'Día completo. Bien hecho.'
  if (done === 0) return 'Empieza por el más fácil.'
  return `Vas bien, te quedan ${total - done}.`
}

const GROUPS: [Period | undefined, string][] = [
  ['morning', 'Mañana'],
  ['afternoon', 'Tarde'],
  ['evening', 'Noche'],
  [undefined, 'Durante el día'],
]

export default function Today({ onAdd }: { onAdd: () => void }) {
  const data = useHabitData()
  const day = useToday()
  if (!data) return null

  const active = data.filter(d => !d.habit.archivedAt)
  const visible = active.filter(d => isScheduled(d.habit, day) || d.done.has(day))
  const doneCount = visible.filter(d => d.done.has(day)).length
  // Solo se muestran las franjas si al menos un hábito tiene una asignada.
  const showGroups = visible.some(d => d.habit.period)
  const msg = message(doneCount, visible.length)
  let order = 0 // posición en pantalla, para escalonar la entrada de las filas

  return (
    <>
      <header className="head">
        <div>
          <h1>Hoy</h1>
          <p className="date">{dateFormat.format(parseDate(day))}</p>
        </div>
        {active.length > 0 && <Ring done={doneCount} total={visible.length} />}
      </header>

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
                    <HabitRow key={d.habit.id} data={d} day={day} index={order++} />
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

      <Tasks day={day} />
    </>
  )
}
