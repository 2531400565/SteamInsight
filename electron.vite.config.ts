import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'electron/shared')
      }
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'electron/shared')
      }
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    publicDir: resolve(__dirname, 'public'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'electron/shared')
      }
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/index.html') },
        /**
         * V5 优化 3：把「基本不变的大件」从业务代码里拆出去。
         * 拆分前主 JS 是 2.2MB 的单文件 —— 业务代码每版必变，整个 2.2MB 每次都要重新下载；
         * 拆出后业务 chunk 只剩几百 KB，vendor 各 chunk 在版本间内容稳定（浏览器 / 更新器缓存友好）。
         * 注意：这是**拆文件不是减体积**，总字节数基本不变；它的收益是首屏并行加载与增量更新。
         */
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'zustand'],
            'vendor-charts': ['recharts'],
            'vendor-export': ['html-to-image']
          }
        }
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
