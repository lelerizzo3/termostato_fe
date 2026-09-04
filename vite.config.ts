import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/termostato/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Termostato intelligente',
        short_name: 'Termostato',
        description: 'Gestione e monitoraggio del termostato intelligente',
        start_url: '/termostato/stato',
        scope: '/termostato/',
        display: 'standalone',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        icons: [
          { src: '/termostato/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/termostato/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/termostato/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/termostato\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/termostato\/api\/.*/,
            handler: 'NetworkOnly',
            options: { cacheName: 'termostato-api-network-only' }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
