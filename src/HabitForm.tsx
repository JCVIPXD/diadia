import { useState, type FormEvent } from 'react'
import { archiveHabit, deleteHabit, saveHabit, setPauses, SOFT_HABIT_LIMIT, type Habit, type Period, type Schedule } from './db'
import { addDays, today } from './habits'
import { remindersAvailable } from './reminders'

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
  const [time, setTime] = useState(habit?.time ?? '')
  const [counted, setCounted] = useState(!!habit?.goal)
  const [amount, setAmount] = useState(String(habit?.goal?.amount ?? 8))
  const [unit, setUnit] = useState(habit?.goal?.unit ?? '')
  const [kind, setKind] = useState<Kind>(s?.type ?? 'daily')
  const [days, setDays] = useState<number[]>(s?.type === 'days' ? s.days : [1, 2, 3, 4, 5])
  const [times, setTimes] = useState(s?.type === 'weekly' ? s.times : 3)

  const amountNum = Number(amount)
  const goalValid = !counted || (Number.isFinite(amountNum) && amountNum >= 1 && unit.trim() !== '')
  const valid = name.trim() !== '' && (kind !== 'days' || days.length > 0) && goalValid

  const openPause = habit?.pauses?.findLast(p => !p.to)

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
        // La versión mínima no aplica a hábitos con cantidad: ahí la "versión pequeña" es avanzar algo.
        tiny: counted ? undefined : tiny.trim() || undefined,
        period,
        time: time || undefined,
        goal: counted ? { amount: Math.round(amountNum), unit: unit.trim() } : undefined,
        schedule,
      },
      habit?.id,
    )
    onClose()
  }

  async function togglePause() {
    if (!habit) return
    const pauses = habit.pauses ?? []
    if (openPause) {
      // Reanudar: la pausa termina ayer (si empezó hoy, simplemente se descarta).
      const end = addDays(today(), -1)
      await setPauses(habit.id, openPause.from > end ? pauses.filter(p => p !== openPause) : pauses.map(p => (p === openPause ? { ...p, to: end } : p)))
    } else {
      await setPauses(habit.id, [...pauses, { from: today() }])
    }
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
        <span>¿Se mide con una cantidad?</span>
        <div className="seg">
          <button type="button" aria-pressed={!counted} onClick={() => setCounted(false)}>Sí/No</button>
          <button type="button" aria-pressed={counted} onClick={() => setCounted(true)}>Con cantidad</button>
        </div>
        {counted && (
          <div className="goal">
            <input aria-label="Meta" type="number" inputMode="numeric" min={1} value={amount} onChange={e => setAmount(e.target.value)} />
            <input aria-label="Unidad" type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="vasos, minutos, páginas…" />
          </div>
        )}
      </div>

      {!counted && (
        <div className="field">
          <label htmlFor="tiny">
            Versión mínima <span className="hint">(para los días de pereza)</span>
          </label>
          <input id="tiny" type="text" value={tiny} onChange={e => setTiny(e.target.value)} placeholder="Leer 1 página" />
        </div>
      )}

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
        <label htmlFor="time">
          Recordatorio <span className="hint">{remindersAvailable() ? '(opcional)' : '(suena solo en la app de Android)'}</span>
        </label>
        <div className="timerow">
          <input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} />
          {time && (
            <button type="button" className="link inline muted" onClick={() => setTime('')}>
              Quitar
            </button>
          )}
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
        <>
          <div className="actions">
            <button className="btn ghost" type="button" onClick={togglePause}>
              {openPause ? 'Reanudar' : 'Pausar'}
            </button>
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
          <p className="hint">Pausar sirve para vacaciones o una mala racha de salud: los días en pausa no rompen tu racha.</p>
        </>
      )}
    </form>
  )
}
