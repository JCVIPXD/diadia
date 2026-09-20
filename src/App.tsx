import { useState } from 'react'
import HabitList from './HabitList'
import Today from './Today'

type Tab = 'today' | 'habits'

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [creating, setCreating] = useState(false) // abrir el formulario al llegar a Hábitos
  const tabs: [Tab, string][] = [['today', 'Hoy'], ['habits', 'Hábitos']]

  return (
    <div className="app">
      <main>{tab === 'today' ? <Today onAdd={() => { setCreating(true); setTab('habits') }} /> : <HabitList startNew={creating} />}</main>
      <nav className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setCreating(false); setTab(id) }}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
