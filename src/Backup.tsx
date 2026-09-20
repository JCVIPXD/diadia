import { useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { canShareBackup, exportBackup, importBackup, lastBackupAt, shareBackup } from './transfer'

function ago(ts: number | null) {
  if (!ts) return 'nunca'
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  return days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`
}

export default function Backup() {
  const input = useRef<HTMLInputElement>(null)
  const [last, setLast] = useState(lastBackupAt)
  const [msg, setMsg] = useState('')

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const n = await importBackup(file)
      setMsg(n === 0 ? 'No había nada nuevo que importar.' : `Importado: ${n} cambio${n === 1 ? '' : 's'}.`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo importar.')
    }
    if (input.current) input.current.value = ''
  }

  return (
    <section className="backup">
      <h2>Copia de seguridad</h2>
      <p className="sub">
        Tus datos viven solo en este dispositivo. Última copia: {ago(last)}.
        {canShareBackup() && ' Para pasarlos a otro dispositivo usa Compartir y, allí, Importar.'}
      </p>
      <div className="actions">
        {!Capacitor.isNativePlatform() && (
          <button
            className="btn"
            onClick={async () => {
              await exportBackup()
              setLast(lastBackupAt())
              setMsg('')
            }}
          >
            Exportar
          </button>
        )}
        {canShareBackup() && (
          <button
            className={Capacitor.isNativePlatform() ? 'btn' : 'btn ghost'}
            onClick={async () => {
              try {
                if (await shareBackup()) {
                  setLast(lastBackupAt())
                  setMsg('')
                }
              } catch {
                setMsg('No se pudo abrir el menú de compartir.')
              }
            }}
          >
            {Capacitor.isNativePlatform() ? 'Guardar o compartir copia' : 'Compartir'}
          </button>
        )}
        <button className="btn ghost" onClick={() => input.current?.click()}>
          Importar
        </button>
      </div>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={e => onFile(e.target.files?.[0])} />
      {msg && <p className="sub" role="status">{msg}</p>}
    </section>
  )
}
