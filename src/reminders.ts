import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useHabitData, useToday } from './hooks'
import { planReminders } from './reminderPlan'
import { useSettings } from './settings'

// Recordatorios como notificaciones locales de Android. Solo existen en la app instalada (APK):
// una PWA no puede programar notificaciones de forma fiable.

export const remindersAvailable = () => Capacitor.isNativePlatform()

const CHANNEL = 'habitos'

export async function remindersGranted() {
  if (!remindersAvailable()) return false
  return (await LocalNotifications.checkPermissions()).display === 'granted'
}

/** Pide permiso de notificaciones; devuelve si quedó concedido. */
export async function enableReminders() {
  if (!remindersAvailable()) return false
  return (await LocalNotifications.requestPermissions()).display === 'granted'
}

/** Sustituye todo lo programado por el plan actual. */
async function apply(plan: ReturnType<typeof planReminders>) {
  if (!(await remindersGranted())) return
  await LocalNotifications.createChannel({ id: CHANNEL, name: 'Hábitos y sueño', importance: 4 })
  const { notifications } = await LocalNotifications.getPending()
  if (notifications.length) await LocalNotifications.cancel({ notifications: notifications.map(n => ({ id: n.id })) })
  if (plan.length === 0) return
  await LocalNotifications.schedule({
    notifications: plan.map(r => ({
      id: r.id,
      title: r.title,
      body: r.body,
      channelId: CHANNEL,
      schedule: { at: r.at, allowWhileIdle: true },
    })),
  })
}

/** Mantiene las notificaciones al día: se reprograma al cambiar hábitos, marcas o ajustes. */
export function useReminders() {
  const data = useHabitData()
  const settings = useSettings()
  const todayStr = useToday()

  useEffect(() => {
    if (!remindersAvailable() || !data) return
    // Pequeña espera para no reprogramar en cada toque seguido.
    const id = setTimeout(() => {
      const plan = planReminders(data, { now: new Date(), todayStr, ...settings })
      apply(plan).catch(err => console.error('No se pudieron programar los recordatorios', err))
    }, 600)
    return () => clearTimeout(id)
  }, [data, settings, todayStr])
}
