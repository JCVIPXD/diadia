import { useEffect, useState, type FormEvent } from 'react'
import Check from './Check'
import { addTask, dropTask, moveTask, renameTask, restoreTask, toggleTask, type Task } from './db'
import { buzz } from './haptics'
import { addDays } from './habits'
import { useTasks } from './hooks'

const SOFT_TASK_LIMIT = 7
const UNDO_MS = 6000

function TaskRow({ task, onRemove }: { task: Task; onRemove: (t: Task) => void }) {
  const [leaving, setLeaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const done = !!task.doneAt

  // Se desliza hacia fuera y solo entonces se quita, para que no desaparezca de golpe.
  function remove() {
    setLeaving(true)
    setTimeout(() => onRemove(task), 180)
  }

  function finishEdit(value: string) {
    const title = value.trim()
    setEditing(false)
    if (title && title !== task.title) renameTask(task.id, title)
  }

  return (
    <li className={`task${done ? ' is-done' : ''}${leaving ? ' leaving' : ''}`}>
      <button
        className={`check small${done ? ' full' : ''}`}
        aria-pressed={done}
        aria-label={`${done ? 'Deshacer' : 'Completar'}: ${task.title}`}
        onClick={() => {
          if (!done) buzz()
          toggleTask(task.id, !done)
        }}
      >
        <Check />
      </button>
      {editing ? (
        <input
          className="task-edit"
          type="text"
          defaultValue={task.title}
          aria-label="Editar tarea"
          autoFocus
          onBlur={e => finishEdit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <button className="task-title" onClick={() => setEditing(true)} aria-label={`Editar: ${task.title}`}>
          {task.title}
        </button>
      )}
      <button className="x" aria-label={`Quitar: ${task.title}`} onClick={remove}>
        ×
      </button>
    </li>
  )
}

export default function Tasks({ day }: { day: string }) {
  const tasks = useTasks()
  const [title, setTitle] = useState('')
  const [forTomorrow, setForTomorrow] = useState(false)
  const [removed, setRemoved] = useState<Task | null>(null) // la última quitada, para poder deshacer

  useEffect(() => {
    if (!removed) return
    const id = setTimeout(() => setRemoved(null), UNDO_MS)
    return () => clearTimeout(id)
  }, [removed])

  if (!tasks) return null

  const tomorrow = addDays(day, 1)
  const todays = tasks.filter(t => t.date === day)
  const planned = tasks.filter(t => t.date === tomorrow)
  const leftovers = tasks.filter(t => t.date < day && !t.doneAt)
  const doneCount = todays.filter(t => t.doneAt).length
  const crowded = !forTomorrow && todays.length >= SOFT_TASK_LIMIT

  async function add(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    await addTask(t, forTomorrow ? tomorrow : day)
    setTitle('')
  }

  async function remove(t: Task) {
    await dropTask(t.id)
    setRemoved(t)
  }

  return (
    <section className="tasks">
      {leftovers.length > 0 && (
        <div className="carry rise">
          <h2>Sin terminar de antes</h2>
          <p className="sub">Decide con calma: pásala a hoy o suéltala.</p>
          <ul className="list">
            {leftovers.map(t => (
              <li className="task" key={t.id}>
                <span className="task-title">{t.title}</span>
                <button className="link inline" onClick={() => moveTask(t.id, day)}>Pasar a hoy</button>
                <button className="link inline muted" onClick={() => remove(t)}>Soltar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>
        Itinerario de hoy
        {todays.length > 0 && <span className="count"> · {doneCount}/{todays.length}</span>}
      </h2>

      {todays.length > 0 && (
        <ul className="list">
          {todays.map(t => (
            <TaskRow key={t.id} task={t} onRemove={remove} />
          ))}
        </ul>
      )}

      <form className="add" onSubmit={add}>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ej: limpiar mi cuarto, enviar la tarea"
          aria-label="Nueva tarea"
        />
        <button className="btn" type="submit" disabled={!title.trim()}>
          Añadir
        </button>
      </form>
      <div className="chips when">
        <button type="button" aria-pressed={!forTomorrow} onClick={() => setForTomorrow(false)}>Para hoy</button>
        <button type="button" aria-pressed={forTomorrow} onClick={() => setForTomorrow(true)}>Para mañana</button>
      </div>
      {crowded && <p className="sub risk">Ya tienes {todays.length} tareas hoy. Elige lo esencial o déjala para mañana.</p>}

      {planned.length > 0 && (
        <details>
          <summary>Mañana ({planned.length})</summary>
          <ul className="list">
            {planned.map(t => (
              <TaskRow key={t.id} task={t} onRemove={remove} />
            ))}
          </ul>
        </details>
      )}

      {removed && (
        <div className="toast" role="status">
          <span>Tarea quitada</span>
          <button
            onClick={() => {
              restoreTask(removed.id)
              setRemoved(null)
            }}
          >
            Deshacer
          </button>
        </div>
      )}
    </section>
  )
}
