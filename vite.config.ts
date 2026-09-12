import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'gplan-install-meta',
      transformIndexHtml: () => [
        { tag: 'meta', attrs: { name: 'theme-color', content: '#f4f3e9' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'icon', href: '/icons/gplan.svg', type: 'image/svg+xml' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' }, injectTo: 'head' },
      ],
    },
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*'],
      manifest: {
        id: '/',
        name: 'GPlan',
        short_name: 'GPlan',
        description: 'Your personal workout planner. Plan and train, even offline.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f4f3e9',
        theme_color: '#f4f3e9',
        icons: [
          { src: '/icons/gplan-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/gplan-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/gplan-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Include lazy graphics, local fonts and models, not just the entry chunk.
        globPatterns: ['**/*'],
        globIgnores: ['**/*.map'],
        // Bounded headroom for Three.js/graphics; oversized assets must fail the build.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
        // Provider requests and responses must never enter a runtime cache.
        runtimeCaching: [],
      },
    }),
  ],
});
