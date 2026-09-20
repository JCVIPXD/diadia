import { useState, type CSSProperties } from 'react'
import HabitList from './HabitList'
import Progress from './Progress'
import { useReminders } from './reminders'
import Today from './Today'
import { applyUpdate, useUpdateReady } from './updates'

type Tab = 'today' | 'progress' | 'habits'

const TABS: [Tab, string][] = [['today', 'Hoy'], ['progress', 'Progreso'], ['habits', 'Hábitos']]

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [creating, setCreating] = useState(false) // abrir el formulario al llegar a Hábitos
  useReminders() // mantiene programados los avisos (solo en la app de Android)
  const updateReady = useUpdateReady()

  return (
    <div className="app">
      <main>
        {/* key: al cambiar de pestaña la pantalla entra con una transición suave */}
        <div key={tab} className="screen">
          {tab === 'today' && <Today onAdd={() => { setCreating(true); setTab('habits') }} />}
          {tab === 'progress' && <Progress />}
          {tab === 'habits' && <HabitList startNew={creating} />}
        </div>
      </main>
      {updateReady && (
        <div className="toast" role="status">
          <span>Hay una versión nueva</span>
          <button onClick={() => applyUpdate()}>Actualizar</button>
        </div>
      )}
      <nav className="tabs" aria-label="Secciones">
        <div className="tabs-track" style={{ '--n': TABS.length, '--i': TABS.findIndex(([id]) => id === tab) } as CSSProperties}>
          <span className="tabs-pill" aria-hidden="true" />
          {TABS.map(([id, label]) => (
            <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setCreating(false); setTab(id) }}>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
