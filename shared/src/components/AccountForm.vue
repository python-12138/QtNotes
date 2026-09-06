<script setup lang="ts">
// 账户编辑弹窗：名称 + 图标
import { ref } from 'vue';
import { EMOJI_OPTIONS } from '../presets';

const emit = defineEmits<{ (e: 'save', data: { name: string; icon: string }): void; (e: 'cancel'): void }>();

const nameVal = ref('');
const iconVal = ref('💵');

function submit() {
  const n = nameVal.value.trim();
  if (!n) {
    alert('请输入账户名称');
    return;
  }
  emit('save', { name: n, icon: iconVal.value });
}
</script>

<template>
  <div class="modal-mask" @click="emit('cancel')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <span>添加账户</span>
        <button type="button" class="icon-btn" @click="emit('cancel')">✕</button>
      </div>
      <div class="modal-body">
        <input v-model="nameVal" class="text-input" placeholder="账户名称（如：信用卡）" />
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
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" @click="submit">保存</button>
      </div>
    </div>
  </div>
</template>
