<script setup lang="ts">
// 分类选择网格（4 列），可按收支类型过滤；showAdd 为真时显示「添加」入口
import { computed } from 'vue';
import type { TxType } from '../types';
import { useCategories } from '../store/useCategories';

const props = defineProps<{ type: TxType; selectedId: string | null; showAdd?: boolean }>();
const emit = defineEmits<{ (e: 'select', id: string): void; (e: 'addNew'): void }>();

const categories = useCategories();
const list = computed(() => categories.value.filter((c) => c.type === props.type));
</script>

<template>
  <div class="category-grid">
    <button
      v-for="c in list"
      :key="c.id"
      type="button"
      class="category-item"
      :class="{ selected: selectedId === c.id }"
      @click="emit('select', c.id)"
    >
      <span class="category-icon" :style="{ background: `${c.color}22`, color: c.color }">
        {{ c.icon }}
      </span>
      <span class="category-name">{{ c.name }}</span>
    </button>

    <button v-if="showAdd" type="button" class="category-item category-add" @click="emit('addNew')">
      <span class="category-icon">＋</span>
      <span class="category-name">添加</span>
    </button>
  </div>
</template>
