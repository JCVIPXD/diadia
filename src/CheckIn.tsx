import { saveCheckin } from './db'
import { useCheckins } from './hooks'
import { formatDuration, sleepMinutes } from './sleep'

const FACES = ['😞', '🙁', '😐', '🙂', '😄']
const LEVELS = ['1', '2', '3', '4', '5']

function Scale({ label, options, value, onChange }: { label: string; options: string[]; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="scale" role="group" aria-label={label}>
      <span>{label}</span>
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

/** Check-in del día: sueño, ánimo, energía y una nota. Todo opcional; se guarda al cambiar. */
export default function CheckIn({ date }: { date: string }) {
  const checkins = useCheckins()
  if (!checkins) return null
  const c = checkins.get(date)
  const slept = sleepMinutes(c?.bedtime, c?.wake)

  return (
    <section className="checkin">
      <h2>Check-in</h2>
      <div className="card">
        <div className="times">
          <label>
            <span>Anoche me acosté</span>
            <input type="time" value={c?.bedtime ?? ''} onChange={e => saveCheckin(date, { bedtime: e.target.value || undefined })} />
          </label>
          <label>
            <span>Me levanté</span>
            <input type="time" value={c?.wake ?? ''} onChange={e => saveCheckin(date, { wake: e.target.value || undefined })} />
          </label>
        </div>
        {slept !== null && <p className="sub slept">Dormiste {formatDuration(slept)}</p>}

        <Scale label="Ánimo" options={FACES} value={c?.mood} onChange={v => saveCheckin(date, { mood: v })} />
        <Scale label="Energía" options={LEVELS} value={c?.energy} onChange={v => saveCheckin(date, { energy: v })} />

        <input
          key={date}
          type="text"
          className="note-input"
          placeholder="Una nota del día (opcional)"
          aria-label="Nota del día"
          defaultValue={c?.note ?? ''}
          onBlur={e => {
            const note = e.target.value.trim() || undefined
            if (note !== c?.note) saveCheckin(date, { note })
          }}
        />
      </div>
    </section>
  )
}
