<script setup lang="ts">
// 金额数字键盘：3×4 网格，支持小数（最多两位）与退格。
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

// 处理按键输入
function press(key: string) {
  const value = props.modelValue;
  // 退格
  if (key === 'del') {
    emit('update:modelValue', value.slice(0, -1));
    return;
  }
  // 小数点：只能有一个
  if (key === '.') {
    if (value.includes('.')) return;
    emit('update:modelValue', value === '' ? '0.' : value + '.');
    return;
  }
  // 数字键
  if (value.includes('.')) {
    const dec = value.split('.')[1];
    if (dec.length >= 2) return; // 小数最多两位
    emit('update:modelValue', value + key);
  } else {
    if (value === '0') {
      emit('update:modelValue', key);
      return;
    }
    if (value.length >= 9) return; // 整数最多 9 位
    emit('update:modelValue', value + key);
  }
}
</script>

<template>
  <div class="keypad">
    <button
      v-for="k in KEYS"
      :key="k"
      type="button"
      tabindex="-1"
      :class="['keypad-key', k === 'del' ? 'keypad-key-del' : '']"
      @mousedown.prevent
      @click="press(k)"
    >
      {{ k === 'del' ? '⌫' : k }}
    </button>
  </div>
</template>
