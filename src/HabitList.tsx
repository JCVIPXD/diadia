import { useState } from 'react'
import { restoreHabit, SOFT_HABIT_LIMIT, type Habit } from './db'
import { consistency, describeSchedule, streak } from './habits'
import { useHabitData, useToday } from './hooks'
import Backup from './Backup'
import HabitForm from './HabitForm'

export default function HabitList({ startNew = false }: { startNew?: boolean }) {
  const data = useHabitData()
  const day = useToday()
  // undefined = lista, 'new' = crear, Habit = editar
  const [editing, setEditing] = useState<Habit | 'new' | undefined>(startNew ? 'new' : undefined)
  if (!data) return null

  const active = data.filter(d => !d.habit.archivedAt)
  const archived = data.filter(d => d.habit.archivedAt)

  if (editing) {
    return (
      <HabitForm
        key={editing === 'new' ? 'new' : editing.id}
        habit={editing === 'new' ? undefined : editing}
        activeCount={active.length}
        onClose={() => setEditing(undefined)}
      />
    )
  }

  return (
    <>
      <header className="head">
        <div>
          <h1>Hábitos</h1>
          <p>
            {active.length} de {SOFT_HABIT_LIMIT} recomendados
          </p>
        </div>
        <button className="btn" onClick={() => setEditing('new')}>
          Nuevo
        </button>
      </header>

      <ul className="list">
        {active.map(({ habit, done }) => {
          const st = streak(habit, done, day)
          const pct = consistency(habit, done, day)
          return (
            <li key={habit.id}>
              <button className="item" onClick={() => setEditing(habit)}>
                <div className="body">
                  <div className="title">{habit.name}</div>
                  <div className="sub">
                    {describeSchedule(habit)}
                    {st.best > 0 && ` · mejor racha ${st.best} ${st.unit}${st.best === 1 ? '' : 's'}`}
                  </div>
                </div>
                {pct !== null && <span className="pct" title="Cumplimiento de los últimos 28 días">{pct}%</span>}
              </button>
            </li>
          )
        })}
      </ul>

      {archived.length > 0 && (
        <details>
          <summary>Archivados ({archived.length})</summary>
          {archived.map(({ habit }) => (
            <div className="item" key={habit.id}>
              <div className="body">{habit.name}</div>
              <button className="btn ghost" onClick={() => restoreHabit(habit.id)}>
                Restaurar
              </button>
            </div>
          ))}
        </details>
      )}

      <Backup />
    </>
  )
}
