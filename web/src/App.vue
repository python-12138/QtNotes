<script setup lang="ts">
// 电脑端根组件：初始化 + 左侧导航 + 主区渲染共享页面 + 覆盖层（记一笔 / 账本切换）
import { onMounted, ref } from 'vue';
import { getDataProvider } from '@shared/data/provider';
import { initTheme } from '@shared/utils/theme';
import type { Tab } from '@shared/types';
import SideNav from './components/SideNav.vue';
import Home from '@shared/pages/Home.vue';
import Records from '@shared/pages/Records.vue';
import Stats from '@shared/pages/Stats.vue';
import Settings from '@shared/pages/Settings.vue';
import Add from '@shared/pages/Add.vue';
import LedgerSwitcher from '@shared/components/LedgerSwitcher.vue';

const tab = ref<Tab>('home');
const showAdd = ref(false);
const showLedger = ref(false);
const ready = ref(false);
const error = ref('');

onMounted(async () => {
  initTheme();
  try {
    await getDataProvider().init();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '初始化失败';
  } finally {
    ready.value = true;
  }
});
</script>

<template>
  <div class="desktop-shell">
    <SideNav :active="tab" @change="tab = $event" @add="showAdd = true" />

    <main class="desktop-main">
      <div v-if="!ready" class="loading">加载中…</div>
      <div v-else-if="error" class="load-error">
        连接服务端失败：{{ error }}<br />请确认电脑端服务已启动（见 server/ 目录）。
      </div>
      <template v-else>
        <Home v-if="tab === 'home'" @open-ledger="showLedger = true" />
        <Records v-else-if="tab === 'records'" />
        <Stats v-else-if="tab === 'stats'" />
        <Settings v-else />
      </template>
    </main>

    <Add v-if="showAdd" @close="showAdd = false" />
    <LedgerSwitcher v-if="showLedger" @close="showLedger = false" />
  </div>
</template>
