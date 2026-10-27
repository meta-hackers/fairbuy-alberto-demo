import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base: the same dist works at the repository root or under
// https://<user>.github.io/fairbuy-alberto-demo/
export default defineConfig({
  base: './',
  plugins: [react()],
})
