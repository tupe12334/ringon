/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /ringon/; set BASE_PATH there.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Ringon',
        short_name: 'Ringon',
        description: 'Design a ring and see it live on your hand.',
        theme_color: '#1c1a17',
        background_color: '#f6f4f1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // The hand-tracking model and runtime are large: cache them on first use.
        runtimeCaching: [
          {
            urlPattern: /\/(mediapipe|models)\//,
            handler: 'CacheFirst',
            options: { cacheName: 'ringon-hand-tracking', expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
