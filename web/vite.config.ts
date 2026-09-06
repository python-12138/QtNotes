import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// 电脑端全功能查看器：复用 shared/ 的领域逻辑与 UI 源码。
// 构建产物输出到 server 的 wwwroot，由 ASP.NET Core 托管；开发时用 vite dev server + proxy。
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      // 复用上级目录 shared/ 的领域逻辑与 UI 源码
      '@shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },
  server: {
    port: 5175,
    fs: {
      // 允许 dev server 访问上级目录的 shared 源码
      allow: ['..'],
    },
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  plugins: [vue()],
  build: {
    outDir: '../server/src/QTNotes.Api/wwwroot',
    emptyOutDir: true,
  },
});
