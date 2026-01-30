// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mad-transit/', // Replace with your actual repo name
  build: {
    outDir: 'docs'
  }
})