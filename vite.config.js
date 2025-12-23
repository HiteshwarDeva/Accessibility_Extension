import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content/index.js'),
        auth: resolve(__dirname, 'src/content/auth-injector.js'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'content') {
            return 'content.js';
          }
          if (chunk.name === 'auth') {
            return 'auth-injector.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
})
