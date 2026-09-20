import { useSyncExternalStore } from 'react'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'

// Aviso de "nueva versión disponible". En vez de recargar sola (podría cortarte a mitad de algo),
// la app pregunta. En la app de Android no hay service worker: se actualiza instalando el APK.

let updateSW: ((reload?: boolean) => Promise<void>) | undefined
let ready = false
const listeners = new Set<() => void>()

export function initUpdates() {
  if (Capacitor.isNativePlatform()) return
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      ready = true
      listeners.forEach(l => l())
    },
  })
}

export const applyUpdate = () => updateSW?.(true)

export function useUpdateReady() {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => ready,
  )
}
