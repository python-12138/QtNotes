import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 电脑端只读查看器：构建产物输出到 server 的 wwwroot，由 ASP.NET Core 托管。
// 开发时用 vite dev server + proxy 把 /api 转发到本机服务端（http://localhost:5000）。
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: '../server/src/QTNotes.Api/wwwroot',
    emptyOutDir: true,
  },
  server: {
    port: 5175,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
