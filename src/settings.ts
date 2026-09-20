import { useSyncExternalStore } from 'react'
import { setRolloverHour } from './habits'

// Preferencias de este dispositivo (no se sincronizan ni van en la copia de seguridad).
export interface Settings {
  theme: 'auto' | 'light' | 'dark'
  rolloverHour: number // 0–6: hora a la que "cambia" el día
  bedtimeGoal: string // HH:mm, hora objetivo para acostarse
  bedtimeReminder: boolean // avisar 30 min antes (solo en la app Android)
}

const KEY = 'diadia:settings'
const DEFAULTS: Settings = { theme: 'auto', rolloverHour: 4, bedtimeGoal: '23:00', bedtimeReminder: false }

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

let current = load()
const listeners = new Set<() => void>()

function apply(s: Settings) {
  setRolloverHour(s.rolloverHour)
  document.documentElement.dataset.theme = s.theme
}
apply(current)

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // sin localStorage el cambio dura solo esta sesión
  }
  apply(current)
  listeners.forEach(l => l())
}

export const getSettings = () => current

export function useSettings() {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}
