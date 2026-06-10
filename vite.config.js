import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' uses relative asset paths so the build works on GitHub Pages
// project sites (https://user.github.io/<repo>/) without hard-coding the repo name.
export default defineConfig({
  plugins: [react()],
  base: './',
})
