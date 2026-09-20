import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.diadia.app',
  appName: 'Día a día',
  webDir: 'dist',
  android: {
    // La app es local: no necesita mixed content ni depuración web en la versión final.
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_diadia',
      iconColor: '#2F8F6B',
    },
  },
}

export default config
