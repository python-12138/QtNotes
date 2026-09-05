<script setup lang="ts">
// 单条流水展示：分类图标 + 名称 + 备注 + 金额
import { computed } from 'vue';
import type { Transaction } from '../db/types';
import { useCategories } from '../store/useCategories';
import { formatMoney } from '../utils/money';

const props = defineProps<{ tx: Transaction; meta?: string }>();

const categories = useCategories();
const cat = computed(() => categories.value.find((c) => c.id === props.tx.categoryId));
const color = computed(() => cat.value?.color ?? '#999999');
const name = computed(() => cat.value?.name ?? '未分类');
const icon = computed(() => cat.value?.icon ?? '📝');
</script>

<template>
  <div class="tx-item">
    <span class="tx-icon" :style="{ background: `${color}22`, color }">{{ icon }}</span>
    <div class="tx-info">
      <div class="tx-name">{{ name }}</div>
      <div class="tx-meta">{{ meta ?? '' }}</div>
    </div>
    <div class="tx-amount" :class="tx.type">
      {{ tx.type === 'income' ? '+' : '−' }}¥{{ formatMoney(tx.amount) }}
    </div>
  </div>
</template>
