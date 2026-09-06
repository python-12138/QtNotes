<script setup lang="ts">
// 电脑端侧边导航：替代移动端底部导航（首页/明细/统计/我的 + 记一笔）
import type { Tab } from '@shared/types';

defineProps<{ active: Tab }>();
const emit = defineEmits<{ (e: 'change', tab: Tab): void; (e: 'add'): void }>();
</script>

<template>
  <nav class="side-nav">
    <div class="side-brand">📒 记账本</div>
    <button
      type="button"
      class="side-item"
      :class="{ active: active === 'home' }"
      @click="emit('change', 'home')"
    >
      <span class="side-icon">🏠</span><span>首页</span>
    </button>
    <button
      type="button"
      class="side-item"
      :class="{ active: active === 'records' }"
      @click="emit('change', 'records')"
    >
      <span class="side-icon">📋</span><span>明细</span>
    </button>
    <button
      type="button"
      class="side-item"
      :class="{ active: active === 'stats' }"
      @click="emit('change', 'stats')"
    >
      <span class="side-icon">📊</span><span>统计</span>
    </button>
    <button
      type="button"
      class="side-item"
      :class="{ active: active === 'settings' }"
      @click="emit('change', 'settings')"
    >
      <span class="side-icon">⚙️</span><span>我的</span>
    </button>
    <button type="button" class="side-add" @click="emit('add')">＋ 记一笔</button>
  </nav>
</template>
