<script setup lang="ts">
// 通用确认弹窗：按 type 显示不同图标与配色（info 提示 / warning 警告 / error 错误 / success 成功）
import { computed } from 'vue';
import type { DialogType } from '../utils/dialog';

const props = withDefaults(
  defineProps<{
    type?: DialogType;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
  }>(),
  {
    type: 'info',
    title: '',
    confirmText: '确定',
    cancelText: '取消',
    showCancel: true,
  },
);

const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>();

const META: Record<DialogType, { icon: string; color: string }> = {
  info: { icon: 'ℹ️', color: '#3b82f6' },
  warning: { icon: '⚠️', color: '#f97316' },
  error: { icon: '⛔', color: '#ef4444' },
  success: { icon: '✅', color: '#22c55e' },
};

const meta = computed(() => META[props.type]);
const confirmClass = computed(() =>
  props.type === 'error' || props.type === 'warning' ? 'btn-danger' : 'btn-primary',
);
</script>

<template>
  <div class="modal-mask" @click="emit('cancel')">
    <div class="modal confirm-dialog" @click.stop>
      <div class="confirm-icon" :style="{ color: meta.color, background: meta.color + '1a' }">{{ meta.icon }}</div>
      <div v-if="title" class="confirm-title">{{ title }}</div>
      <div class="confirm-message">{{ message }}</div>
      <div class="confirm-actions">
        <button v-if="showCancel" type="button" class="btn" @click="emit('cancel')">{{ cancelText }}</button>
        <button type="button" class="btn" :class="confirmClass" @click="emit('confirm')">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>
