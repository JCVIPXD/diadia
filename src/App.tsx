import { useState, type CSSProperties } from 'react'
import HabitList from './HabitList'
import Today from './Today'

type Tab = 'today' | 'habits'

const TABS: [Tab, string][] = [['today', 'Hoy'], ['habits', 'Hábitos']]

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [creating, setCreating] = useState(false) // abrir el formulario al llegar a Hábitos

  return (
    <div className="app">
      <main>
        {/* key: al cambiar de pestaña la pantalla entra con una transición suave */}
        <div key={tab} className="screen">
          {tab === 'today' ? (
            <Today onAdd={() => { setCreating(true); setTab('habits') }} />
          ) : (
            <HabitList startNew={creating} />
          )}
        </div>
      </main>
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
