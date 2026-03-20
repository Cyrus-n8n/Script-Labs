import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/transcript': {
        target: 'https://youtube-transcript3.p.rapidapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/transcript/, ''),
        headers: {
          'x-rapidapi-key': '671f5c2ef3mshee8e7c311404862p1d3d58jsnf67420d00df4',
          'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com'
        }
      },
      '/api/llm': {
        target: 'https://api.navy',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llm/, ''),
      }
    }
  }
})
