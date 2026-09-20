import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// En GitHub Pages la app vive en /<repo>/; el flujo de despliegue lo indica con BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Día a día',
        short_name: 'diadia',
        description: 'Seguimiento de hábitos personal, minimalista y local.',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2f8f6b',
        background_color: '#f6f5f1',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
