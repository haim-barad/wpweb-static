import { defineConfig } from 'vite'

export default defineConfig({
  root: './src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'terser',
    cssMinify: true,
    target: 'es2015',
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: './src/index.html',
        services: './src/services.html'
      },
      output: {
        manualChunks: {
          vendor: ['aos', '@accessible/accordion']
        },
        // Optimize asset file names
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Enable source map for debugging in production
    sourcemap: false,
    // Terser options for better compression
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
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
