import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// base 使用相对路径 './'，这样部署到 GitHub Pages 的 /仓库名/ 子路径时无需改配置。
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      // 复用上级目录 shared/ 的领域逻辑与 UI 源码
      '@shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },
  server: {
    fs: {
      // 允许 dev server 访问上级目录的 shared 源码
      allow: ['..'],
    },
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: '记账本',
        short_name: '记账本',
        description: '简单好用的本地记账软件',
        lang: 'zh-CN',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
