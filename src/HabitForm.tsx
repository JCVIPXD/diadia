import { useState, type FormEvent } from 'react'
import { archiveHabit, deleteHabit, saveHabit, SOFT_HABIT_LIMIT, type Habit, type Period, type Schedule } from './db'

// Lunes primero; el valor es el día JS (0 = domingo).
const DAYS: [string, number][] = [['L', 1], ['M', 2], ['X', 3], ['J', 4], ['V', 5], ['S', 6], ['D', 0]]

type Kind = Schedule['type']

const PERIODS: [Period | undefined, string][] = [[undefined, 'Cualquiera'], ['morning', 'Mañana'], ['afternoon', 'Tarde'], ['evening', 'Noche']]

export default function HabitForm({
  habit,
  activeCount,
  onClose,
}: {
  habit?: Habit
  activeCount: number
  onClose: () => void
}) {
  const s = habit?.schedule
  const [name, setName] = useState(habit?.name ?? '')
  const [identity, setIdentity] = useState(habit?.identity ?? '')
  const [cue, setCue] = useState(habit?.cue ?? '')
  const [tiny, setTiny] = useState(habit?.tiny ?? '')
  const [period, setPeriod] = useState<Period | undefined>(habit?.period)
  const [kind, setKind] = useState<Kind>(s?.type ?? 'daily')
  const [days, setDays] = useState<number[]>(s?.type === 'days' ? s.days : [1, 2, 3, 4, 5])
  const [times, setTimes] = useState(s?.type === 'weekly' ? s.times : 3)

  const valid = name.trim() !== '' && (kind !== 'days' || days.length > 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    if (!habit && activeCount >= SOFT_HABIT_LIMIT) {
      const ok = confirm(
        `Ya tienes ${activeCount} hábitos activos. Pocos hábitos bien hechos funcionan mejor que muchos a medias. ¿Crear este de todos modos?`,
      )
      if (!ok) return
    }
    const schedule: Schedule =
      kind === 'daily' ? { type: 'daily' } : kind === 'days' ? { type: 'days', days } : { type: 'weekly', times }
    await saveHabit(
      {
        name: name.trim(),
        identity: identity.trim() || undefined,
        cue: cue.trim() || undefined,
        tiny: tiny.trim() || undefined,
        period,
        schedule,
      },
      habit?.id,
    )
    onClose()
  }

  const toggleDay = (d: number) => setDays(cur => (cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]))

  return (
    <form className="stack screen" onSubmit={submit}>
      <header className="head">
        <h1>{habit ? 'Editar hábito' : 'Nuevo hábito'}</h1>
      </header>

      <div className="field">
        <label htmlFor="name">¿Qué quieres hacer?</label>
        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Leer 20 minutos" autoFocus />
      </div>

      <div className="field">
        <label htmlFor="cue">
          ¿Cuándo y dónde? <span className="hint">(atarlo a algo que ya haces)</span>
        </label>
        <input id="cue" type="text" value={cue} onChange={e => setCue(e.target.value)} placeholder="Después de cenar, en el sillón" />
      </div>

      <div className="field">
        <label htmlFor="tiny">
          Versión mínima <span className="hint">(para los días de pereza)</span>
        </label>
        <input id="tiny" type="text" value={tiny} onChange={e => setTiny(e.target.value)} placeholder="Leer 1 página" />
      </div>

      <div className="field">
        <label htmlFor="identity">
          ¿Quién te ayuda a ser? <span className="hint">(opcional)</span>
        </label>
        <input id="identity" type="text" value={identity} onChange={e => setIdentity(e.target.value)} placeholder="Soy alguien que aprende cada día" />
      </div>

      <div className="field">
        <span>¿En qué momento del día?</span>
        <div className="seg">
          {PERIODS.map(([p, label]) => (
            <button type="button" key={label} aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>¿Con qué frecuencia?</span>
        <div className="seg">
          {(
            [['daily', 'Diario'], ['days', 'Días concretos'], ['weekly', 'Por semana']] as [Kind, string][]
          ).map(([k, label]) => (
            <button type="button" key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {label}
            </button>
          ))}
        </div>

        {kind === 'days' && (
          <div className="chips">
            {DAYS.map(([label, d]) => (
              <button type="button" key={d} aria-pressed={days.includes(d)} onClick={() => toggleDay(d)}>
                {label}
              </button>
            ))}
          </div>
        )}

        {kind === 'weekly' && (
          <div className="stepper">
            <button type="button" aria-label="Menos" onClick={() => setTimes(t => Math.max(1, t - 1))}>−</button>
            <output>{times === 1 ? '1 vez' : `${times} veces`}</output>
            <button type="button" aria-label="Más" onClick={() => setTimes(t => Math.min(7, t + 1))}>+</button>
          </div>
        )}
      </div>

      <div className="actions">
        <button className="btn" type="submit" disabled={!valid}>
          Guardar
        </button>
        <button className="btn ghost" type="button" onClick={onClose}>
          Cancelar
        </button>
      </div>

      {habit && (
        <div className="actions">
          <button
            className="btn ghost"
            type="button"
            onClick={async () => {
              await archiveHabit(habit.id)
              onClose()
            }}
          >
            Archivar
          </button>
          <button
            className="btn danger"
            type="button"
            onClick={async () => {
              if (!confirm(`¿Eliminar "${habit.name}" y su historial?`)) return
              await deleteHabit(habit.id)
              onClose()
            }}
          >
            Eliminar
          </button>
        </div>
      )}
    </form>
  )
}
