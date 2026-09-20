<script setup lang="ts">
// 营养目标参数弹窗（饮食账本）：蛋白质系数（g/kg 体重）、脂肪占比（%）与目标热量调整（增肌盈余/降脂缺口），增肌 / 降脂各一档
import { ref, watch } from 'vue';
import { useCurrentLedger } from '../store/currentLedger';
import { getDataProvider } from '../data/provider';
import { MACRO_DEFAULTS } from '../utils/diet';

const emit = defineEmits<{ (e: 'close'): void }>();

const ledger = useCurrentLedger();
const proteinNormal = ref('');
const proteinFitness = ref('');
const fatNormal = ref('');
const fatFitness = ref('');
const surplusFitness = ref('');
const deficitNormal = ref('');

watch(
  ledger,
  (l) => {
    proteinNormal.value = String(l?.proteinPerKgNormal ?? MACRO_DEFAULTS.proteinPerKgNormal);
    proteinFitness.value = String(l?.proteinPerKgFitness ?? MACRO_DEFAULTS.proteinPerKgFitness);
    fatNormal.value = String(Math.round((l?.fatRatioNormal ?? MACRO_DEFAULTS.fatRatioNormal) * 100));
    fatFitness.value = String(Math.round((l?.fatRatioFitness ?? MACRO_DEFAULTS.fatRatioFitness) * 100));
    surplusFitness.value = String(l?.calorieSurplusFitness ?? MACRO_DEFAULTS.calorieSurplusFitness);
    deficitNormal.value = String(l?.calorieDeficitNormal ?? MACRO_DEFAULTS.calorieDeficitNormal);
  },
  { immediate: true },
);

async function save() {
  const l = ledger.value;
  if (!l) return;
  const pn = parseFloat(proteinNormal.value);
  const pf = parseFloat(proteinFitness.value);
  const fn = parseFloat(fatNormal.value);
  const ff = parseFloat(fatFitness.value);
  const sf = parseFloat(surplusFitness.value);
  const dn = parseFloat(deficitNormal.value);
  if (!(pn > 0) || !(pf > 0) || !(fn >= 0) || !(ff >= 0)) {
    alert('请填写有效的蛋白质系数（>0）与脂肪占比（≥0）');
    return;
  }
  if (fn > 100 || ff > 100) {
    alert('脂肪占比需在 0~100 之间');
    return;
  }
  if (!(sf >= 0) || !(dn >= 0)) {
    alert('热量盈余 / 缺口需为 ≥0 的数值');
    return;
  }
  await getDataProvider().updateLedger({
    ...l,
    proteinPerKgNormal: pn,
    proteinPerKgFitness: pf,
    fatRatioNormal: fn / 100,
    fatRatioFitness: ff / 100,
    calorieSurplusFitness: sf,
    calorieDeficitNormal: dn,
  });
  emit('close');
}
</script>

<template>
  <div class="modal-mask" @click="emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <span>营养目标参数</span>
        <button type="button" class="icon-btn" @click="emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <p class="hint">蛋白质按每公斤体重克数、脂肪按占总热量百分比；碳水自动用剩余热量补齐。目标热量：增肌 = TDEE + 盈余，降脂 = TDEE − 缺口。</p>
        <div class="add-field">
          <label>降脂 · 蛋白质（g/kg 体重）</label>
          <input v-model="proteinNormal" class="text-input" type="text" inputmode="decimal" placeholder="如 1.2" />
        </div>
        <div class="add-field">
          <label>降脂 · 脂肪占比（%）</label>
          <input v-model="fatNormal" class="text-input" type="text" inputmode="decimal" placeholder="如 25" />
        </div>
        <div class="add-field">
          <label>降脂 · 热量缺口（kcal）</label>
          <input v-model="deficitNormal" class="text-input" type="text" inputmode="decimal" placeholder="如 500" />
        </div>
        <div class="add-field">
          <label>增肌 · 蛋白质（g/kg 体重）</label>
          <input v-model="proteinFitness" class="text-input" type="text" inputmode="decimal" placeholder="如 1.8" />
        </div>
        <div class="add-field">
          <label>增肌 · 脂肪占比（%）</label>
          <input v-model="fatFitness" class="text-input" type="text" inputmode="decimal" placeholder="如 20" />
        </div>
        <div class="add-field">
          <label>增肌 · 热量盈余（kcal）</label>
          <input v-model="surplusFitness" class="text-input" type="text" inputmode="decimal" placeholder="如 300" />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>
