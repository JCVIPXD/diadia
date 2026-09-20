import { useEffect, useState } from 'react'
import { enableReminders, remindersAvailable, remindersGranted } from './reminders'
import { updateSettings, useSettings, type Settings as S } from './settings'

const THEMES: [S['theme'], string][] = [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']]

export default function SettingsPanel() {
  const s = useSettings()
  const native = remindersAvailable()
  const [granted, setGranted] = useState<boolean | null>(null)

  useEffect(() => {
    remindersGranted().then(setGranted)
  }, [])

  return (
    <section className="settings">
      <h2>Ajustes</h2>
      <div className="card stack">
        <div className="field">
          <span>Tema</span>
          <div className="seg">
            {THEMES.map(([v, label]) => (
              <button type="button" key={v} aria-pressed={s.theme === v} onClick={() => updateSettings({ theme: v })}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="rollover">
            El día cambia a las <span className="hint">(acostarte a la 1am sigue siendo "hoy")</span>
          </label>
          <select id="rollover" value={s.rolloverHour} onChange={e => updateSettings({ rolloverHour: Number(e.target.value) })}>
            {[0, 1, 2, 3, 4, 5, 6].map(h => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="bed">Hora objetivo para acostarme</label>
          <input id="bed" type="time" value={s.bedtimeGoal} onChange={e => e.target.value && updateSettings({ bedtimeGoal: e.target.value })} />
        </div>

        <div className="field">
          <span>Aviso para prepararme a dormir</span>
          {native ? (
            <>
              <div className="seg">
                <button type="button" aria-pressed={!s.bedtimeReminder} onClick={() => updateSettings({ bedtimeReminder: false })}>No</button>
                <button type="button" aria-pressed={s.bedtimeReminder} onClick={() => updateSettings({ bedtimeReminder: true })}>30 min antes</button>
              </div>
              {granted === false && (
                <button
                  type="button"
                  className="btn"
                  onClick={async () => setGranted(await enableReminders())}
                >
                  Permitir notificaciones
                </button>
              )}
            </>
          ) : (
            <p className="hint">Los avisos y recordatorios funcionan en la app de Android; aquí, en el navegador, no.</p>
          )}
        </div>
      </div>
    </section>
  )
}
