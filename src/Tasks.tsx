import { useState, type FormEvent } from 'react'
import Check from './Check'
import { addTask, dropTask, moveTask, toggleTask, type Task } from './db'
import { buzz } from './haptics'
import { addDays } from './habits'
import { useTasks } from './hooks'

const SOFT_TASK_LIMIT = 7

function TaskRow({ task }: { task: Task }) {
  const [leaving, setLeaving] = useState(false)
  const done = !!task.doneAt

  // Se desliza hacia fuera y solo entonces se borra, para que no desaparezca de golpe.
  function remove() {
    setLeaving(true)
    setTimeout(() => dropTask(task.id), 180)
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
      <span className="task-title">{task.title}</span>
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
                <button className="link inline muted" onClick={() => dropTask(t.id)}>Soltar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>
        Tareas de hoy
        {todays.length > 0 && <span className="count"> · {doneCount}/{todays.length}</span>}
      </h2>

      {todays.length > 0 && (
        <ul className="list">
          {todays.map(t => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}

      <form className="add" onSubmit={add}>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ej: enviar la tarea"
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
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
