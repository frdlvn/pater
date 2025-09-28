// Minimal Vite config for Electron renderer dev server with HMR
export default {
  root: 'src',
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1'
  },
  build: {
    outDir: '../dist-renderer'
  }
}


