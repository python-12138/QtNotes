<script setup lang="ts">
// 身体信息弹窗（饮食账本专用）：性别 / 年龄 / 身高 / 体重，用于计算基础代谢 BMR
import { ref, watch } from 'vue';
import { useCurrentLedger } from '../store/currentLedger';
import { getDataProvider } from '../data/provider';

const emit = defineEmits<{ (e: 'close'): void }>();

const ledger = useCurrentLedger();
const gender = ref<'male' | 'female'>('male');
const age = ref('');
const heightCm = ref('');
const weightKg = ref('');

watch(
  ledger,
  (l) => {
    gender.value = l?.gender ?? 'male';
    age.value = l?.age != null ? String(l.age) : '';
    heightCm.value = l?.heightCm != null ? String(l.heightCm) : '';
    weightKg.value = l?.weightKg != null ? String(l.weightKg) : '';
  },
  { immediate: true },
);

async function save() {
  const l = ledger.value;
  if (!l) return;
  const ageNum = parseFloat(age.value);
  const heightNum = parseFloat(heightCm.value);
  const weightNum = parseFloat(weightKg.value);
  if (!ageNum || ageNum <= 0 || !heightNum || heightNum <= 0 || !weightNum || weightNum <= 0) {
    alert('请填写完整的年龄 / 身高 / 体重（需大于 0）');
    return;
  }
  await getDataProvider().updateLedger({
    ...l,
    gender: gender.value,
    age: Math.round(ageNum),
    heightCm: heightNum,
    weightKg: weightNum,
  });
  emit('close');
}
</script>

<template>
  <div class="modal-mask" @click="emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <span>身体信息</span>
        <button type="button" class="icon-btn" @click="emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <p class="hint">用于计算基础代谢（BMR），进而算出每日热量盈余。</p>
        <div class="add-field">
          <label>性别</label>
          <div class="account-chips">
            <button type="button" class="chip" :class="{ active: gender === 'male' }" @click="gender = 'male'">男</button>
            <button type="button" class="chip" :class="{ active: gender === 'female' }" @click="gender = 'female'">女</button>
          </div>
        </div>
        <div class="add-field">
          <label>年龄（岁）</label>
          <input v-model="age" class="text-input" type="text" inputmode="numeric" placeholder="如 30" />
        </div>
        <div class="add-field">
          <label>身高（cm）</label>
          <input v-model="heightCm" class="text-input" type="text" inputmode="decimal" placeholder="如 175" />
        </div>
        <div class="add-field">
          <label>体重（kg）</label>
          <input v-model="weightKg" class="text-input" type="text" inputmode="decimal" placeholder="如 65" />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>
