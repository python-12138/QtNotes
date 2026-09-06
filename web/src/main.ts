import { createApp } from 'vue';
import App from './App.vue';
import { setDataProvider } from '@shared/data/provider';
import { ServerProvider } from './data/ServerProvider';
import '@shared/plugins/echarts';
import '@shared/styles/index.css';
import './styles/desktop.css';

// 挂载前注入数据源（电脑端直连服务端 MySQL）
setDataProvider(new ServerProvider());

createApp(App).mount('#root');
