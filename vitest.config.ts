import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    include: ['src/**/*.{spec,test}.ts'],
    environment: 'node',
    setupFiles: ['dotenv/config']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
