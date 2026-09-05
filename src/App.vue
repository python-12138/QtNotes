<script setup lang="ts">
// 根组件：初始化 + 标签页切换 + 记一笔覆盖层 + 账本切换
import { onMounted, ref } from 'vue';
import { seedIfEmpty } from './db/seed';
import { initTheme } from './utils/theme';
import { initCurrentLedger } from './store/currentLedger';
import type { Tab } from './types';
import BottomNav from './components/BottomNav.vue';
import Home from './pages/Home.vue';
import Records from './pages/Records.vue';
import Stats from './pages/Stats.vue';
import Settings from './pages/Settings.vue';
import Add from './pages/Add.vue';
import LedgerSwitcher from './components/LedgerSwitcher.vue';

const tab = ref<Tab>('home');
const showAdd = ref(false);
const showLedger = ref(false);
const ready = ref(false);

onMounted(async () => {
  initTheme();
  try {
    await seedIfEmpty();
    await initCurrentLedger();
  } catch (e) {
    console.error('初始化失败', e);
  } finally {
    ready.value = true;
  }
});
</script>

<template>
  <div class="app">
    <div v-if="!ready" class="loading">加载中…</div>
    <template v-else>
      <Add v-if="showAdd" @close="showAdd = false" />
      <template v-else>
        <Home v-if="tab === 'home'" @open-ledger="showLedger = true" />
        <Records v-else-if="tab === 'records'" />
        <Stats v-else-if="tab === 'stats'" />
        <Settings v-else />
        <BottomNav :active="tab" @change="tab = $event" @add="showAdd = true" />
      </template>
      <LedgerSwitcher v-if="showLedger" @close="showLedger = false" />
    </template>
  </div>
</template>
