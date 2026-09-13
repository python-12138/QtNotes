<script setup lang="ts">
// 底部导航：首页 / 明细 / （悬浮 ＋）/ 统计 / 我的
import type { Tab } from '../types';

defineProps<{ active: Tab }>();
const emit = defineEmits<{ (e: 'change', tab: Tab): void; (e: 'add'): void }>();
</script>

<template>
  <nav class="bottom-nav">
    <button
      type="button"
      class="nav-item"
      :class="{ active: active === 'home' }"
      @click="emit('change', 'home')"
    >
      <span class="nav-icon">🏠</span>
      <span class="nav-label">首页</span>
    </button>

    <button
      type="button"
      class="nav-item"
      :class="{ active: active === 'records' }"
      @click="emit('change', 'records')"
    >
      <span class="nav-icon">📋</span>
      <span class="nav-label">明细</span>
    </button>

    <button type="button" class="nav-add" aria-label="记一笔" @click="emit('add')">＋</button>

    <button
      type="button"
      class="nav-item"
      :class="{ active: active === 'stats' }"
      @click="emit('change', 'stats')"
    >
      <span class="nav-icon">📊</span>
      <span class="nav-label">统计</span>
    </button>

    <button
      type="button"
      class="nav-item"
      :class="{ active: active === 'settings' }"
      @click="emit('change', 'settings')"
    >
      <span class="nav-icon">⚙️</span>
      <span class="nav-label">我的</span>
    </button>
  </nav>
</template>
