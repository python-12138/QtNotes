<script setup lang="ts">
// 分类编辑弹窗：名称 + 图标 + 颜色
import { ref } from 'vue';
import type { TxType } from '../db/types';
import { COLOR_OPTIONS, EMOJI_OPTIONS } from '../db/presets';

const props = defineProps<{ type: TxType; name?: string; icon?: string; color?: string }>();
const emit = defineEmits<{
  (e: 'save', data: { name: string; icon: string; color: string }): void;
  (e: 'cancel'): void;
}>();

const nameVal = ref(props.name ?? '');
const iconVal = ref(props.icon ?? '🍜');
const colorVal = ref(props.color ?? '#f97316');

function submit() {
  const n = nameVal.value.trim();
  if (!n) {
    alert('请输入分类名称');
    return;
  }
  emit('save', { name: n, icon: iconVal.value, color: colorVal.value });
}
</script>

<template>
  <div class="modal-mask" @click="emit('cancel')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <span>{{ type === 'expense' ? '支出分类' : '收入分类' }}</span>
        <button type="button" class="icon-btn" @click="emit('cancel')">✕</button>
      </div>
      <div class="modal-body">
        <input v-model="nameVal" class="text-input" placeholder="分类名称" />
        <div class="form-label">图标</div>
        <div class="emoji-grid">
          <button
            v-for="em in EMOJI_OPTIONS"
            :key="em"
            type="button"
            class="emoji-option"
            :class="{ selected: iconVal === em }"
            @click="iconVal = em"
          >
            {{ em }}
          </button>
        </div>
        <div class="form-label">颜色</div>
        <div class="color-grid">
          <button
            v-for="c in COLOR_OPTIONS"
            :key="c"
            type="button"
            class="color-option"
            :class="{ selected: colorVal === c }"
            :style="{ background: c }"
            @click="colorVal = c"
          />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" @click="submit">保存</button>
      </div>
    </div>
  </div>
</template>
