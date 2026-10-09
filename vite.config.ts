import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { cpSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const externalPlayer = Boolean(
    process.env.VITE_PLAYER_MANIFEST_URL || env.VITE_PLAYER_MANIFEST_URL,
  )
  let outputDirectory = ''
  let publicDirectory = ''

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'public-assets-without-bundled-player',
        apply: 'build',
        configResolved(config) {
          outputDirectory = resolve(config.root, config.build.outDir)
          publicDirectory = config.publicDir
        },
        closeBundle() {
          if (!externalPlayer || !publicDirectory) return
          for (const entry of readdirSync(publicDirectory)) {
            if (entry === 'player' || entry === 'player-build.json') continue
            cpSync(resolve(publicDirectory, entry), resolve(outputDirectory, entry), {
              recursive: true,
            })
          }
        },
      },
    ],
    build: { copyPublicDir: !externalPlayer },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      watch: { usePolling: env.VITE_USE_POLLING === 'true' },
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
