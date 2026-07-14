import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/iot-api': {
        target: 'http://192.168.0.84',
        changeOrigin: true,
        rewrite: path => path.replace(
          /^\/iot-api/,
          '/SmartIoTWCFService/IoTRESTService.svc'
        )
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
