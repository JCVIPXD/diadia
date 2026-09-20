import { useState } from 'react'
import { saveCheckin } from './db'
import { addDays, parseDate } from './habits'
import { useCheckins, useToday } from './hooks'
import { formatDuration, sleepMinutes } from './sleep'

const FACES = ['😞', '🙁', '😐', '🙂', '😄']
const LEVELS = ['1', '2', '3', '4', '5']
const dateFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

/** Hasta cuántos días atrás se puede rellenar. */
const MAX_BACK = 30

function Scale({ label, hint, options, value, onChange }: { label: string; hint: string; options: string[]; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="scale" role="group" aria-label={label}>
      <div className="scale-head">
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <div className="chips">
        {options.map((o, i) => (
          <button
            type="button"
            key={o}
            aria-pressed={value === i + 1}
            aria-label={`${label} ${i + 1} de 5`}
            // tocar el valor elegido lo quita
            onClick={() => onChange(value === i + 1 ? undefined : i + 1)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Pantalla de check-in: sueño, ánimo, energía y una nota del día. Todo opcional; se guarda al cambiar. */
export default function CheckIn() {
  const checkins = useCheckins()
  const todayStr = useToday()
  const [offset, setOffset] = useState(0) // 0 = hoy, -1 = ayer…
  if (!checkins) return null

  const date = addDays(todayStr, offset)
  const c = checkins.get(date)
  const slept = sleepMinutes(c?.bedtime, c?.wake)
  const label = offset === 0 ? 'Hoy' : offset === -1 ? 'Ayer' : `Hace ${-offset} días`

  return (
    <>
      <header className="head">
        <div>
          <div className="daynav">
            <button aria-label="Día anterior" disabled={offset <= -MAX_BACK} onClick={() => setOffset(o => o - 1)}>‹</button>
            <h1>Check-in</h1>
            <button aria-label="Día siguiente" disabled={offset === 0} onClick={() => setOffset(o => o + 1)}>›</button>
          </div>
          <p className="date">
            {label} · {dateFormat.format(parseDate(date))}
          </p>
        </div>
      </header>

      <p className="intro">
        Un minuto al día para ver cómo se relacionan tus hábitos con cómo duermes y cómo te sientes. Todo es opcional y se guarda solo;
        lo verás resumido en <strong>Progreso</strong>.
      </p>

      <section className="card checkin">
        <div className="group">
          <h2>Sueño</h2>
          <p className="sub">La noche anterior a este día.</p>
          <div className="times">
            <label>
              <span>Me acosté a las</span>
              <input type="time" value={c?.bedtime ?? ''} onChange={e => saveCheckin(date, { bedtime: e.target.value || undefined })} />
            </label>
            <label>
              <span>Me levanté a las</span>
              <input type="time" value={c?.wake ?? ''} onChange={e => saveCheckin(date, { wake: e.target.value || undefined })} />
            </label>
          </div>
          {slept !== null && <p className="slept">Dormiste {formatDuration(slept)}</p>}
        </div>

        <div className="group">
          <h2>Cómo te sientes</h2>
          <Scale label="Ánimo" hint="1 = mal · 5 = genial" options={FACES} value={c?.mood} onChange={v => saveCheckin(date, { mood: v })} />
          <Scale label="Energía" hint="1 = agotado · 5 = con toda la energía" options={LEVELS} value={c?.energy} onChange={v => saveCheckin(date, { energy: v })} />
        </div>

        <div className="group">
          <h2>Nota</h2>
          <input
            key={date}
            type="text"
            className="note-input"
            placeholder="Algo que quieras recordar de este día"
            aria-label="Nota del día"
            defaultValue={c?.note ?? ''}
            onBlur={e => {
              const note = e.target.value.trim() || undefined
              if (note !== c?.note) saveCheckin(date, { note })
            }}
          />
        </div>
      </section>
    </>
  )
}
