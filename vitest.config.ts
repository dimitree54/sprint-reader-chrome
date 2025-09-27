import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    include: ['src/**/*.{spec,test}.ts'],
    environment: 'node'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})