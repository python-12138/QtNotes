<script setup lang="ts">
// 账本切换弹窗：切换 + 新建账本（普通 / 用车费用）
import { ref } from 'vue';
import type { LedgerType } from '../types';
import { useLedgers, currentLedgerId, setCurrentLedger } from '../store/currentLedger';
import { getDataProvider } from '../data/provider';

const emit = defineEmits<{ (e: 'close'): void }>();

const ledgers = useLedgers();
const creating = ref(false);
const name = ref('');
const type = ref<LedgerType>('general');

function select(id: string) {
  setCurrentLedger(id);
  emit('close');
}

async function submit() {
  const n = name.value.trim();
  if (!n) {
    alert('请输入账本名称');
    return;
  }
  const ledger = await getDataProvider().createLedger(n, type.value);
  setCurrentLedger(ledger.id);
  name.value = '';
  creating.value = false;
  emit('close');
}
</script>

<template>
  <div class="modal-mask" @click="emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <span>切换账本</span>
        <button type="button" class="icon-btn" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <button
          v-for="l in ledgers"
          :key="l.id"
          type="button"
          class="ledger-item"
          :class="{ active: l.id === currentLedgerId }"
          @click="select(l.id)"
        >
          <span class="ledger-icon" :style="{ background: `${l.color}22`, color: l.color }">
            {{ l.icon }}
          </span>
          <span class="ledger-name">{{ l.name }}</span>
          <span class="ledger-tag">{{ l.type === 'vehicle' ? '用车' : '普通' }}</span>
        </button>

        <template v-if="creating">
          <input v-model="name" class="text-input ledger-name-input" placeholder="账本名称" />
          <div class="ledger-type-toggle">
            <button
              type="button"
              class="chip"
              :class="{ active: type === 'general' }"
              @click="type = 'general'"
            >
              普通账本
            </button>
            <button
              type="button"
              class="chip"
              :class="{ active: type === 'vehicle' }"
              @click="type = 'vehicle'"
            >
              用车费用
            </button>
          </div>
          <button type="button" class="btn btn-primary btn-block" @click="submit">创建</button>
        </template>
      </div>

      <div v-if="!creating" class="modal-footer">
        <button type="button" class="btn btn-block" @click="creating = true">＋ 新建账本</button>
      </div>
    </div>
  </div>
</template>
