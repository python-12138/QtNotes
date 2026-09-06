import { createApp } from 'vue';
import App from './App.vue';
import { setDataProvider } from '@shared/data/provider';
import { DexieProvider } from './data/DexieProvider';
import '@shared/plugins/echarts';
import '@shared/styles/index.css';

// 挂载前注入数据源（store/页面在 setup 期才调用 getDataProvider，此时已就绪）
setDataProvider(new DexieProvider());

createApp(App).mount('#root');
