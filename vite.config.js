import { defineConfig } from 'vite'

export default defineConfig({
  root: './src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['aos', '@accessible/accordion']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    hot: true
  },
  css: {
    devSourcemap: true
  }
})
