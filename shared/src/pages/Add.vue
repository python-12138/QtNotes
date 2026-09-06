<script setup lang="ts">
// 记一笔（车辆账本有两个入口）：
//   「记油费」= 支出/收入 + 金额 + 油号 + 里程表读数
//   「记行驶」= 每次开完车记录 本次距离 + 升数（独立于油费）
import { computed, ref, watch } from 'vue';
import { getDataProvider } from '../data/provider';
import { currentLedgerId, useCurrentLedger } from '../store/currentLedger';
import { useCategories } from '../store/useCategories';
import { useAccounts } from '../store/useAccounts';
import { useSettings } from '../store/useSettings';
import { yuanToFen } from '../utils/money';
import { todayStr } from '../utils/date';
import { uid } from '../utils/id';
import { FUEL_TYPE_OPTIONS } from '../presets';
import type { TxType } from '../types';
import AmountKeypad from '../components/AmountKeypad.vue';
import CategoryPicker from '../components/CategoryPicker.vue';
import OilConfigModal from '../components/OilConfigModal.vue';

const emit = defineEmits<{ (e: 'close'): void }>();

const categories = useCategories();
const accounts = useAccounts();
const ledger = useCurrentLedger();
const settings = useSettings();

const isVehicle = computed(() => ledger.value?.type === 'vehicle');
const mode = ref<'tx' | 'trip'>('tx');

// —— 记油费 ——
const type = ref<TxType>('expense');
const amountStr = ref('');
const categoryId = ref<string | null>(null);
const accountId = ref<string | null>(null);
const date = ref(todayStr());
const note = ref('');
const fuelType = ref(FUEL_TYPE_OPTIONS[0] ?? '');
const kmStr = ref(''); // 里程表读数（总里程）

// —— 记行驶 ——
const tripDate = ref(todayStr());
const tripKmStr = ref('');
const tripLitersStr = ref('');

const showOilConfig = ref(false);

const typeCategories = computed(() => categories.value.filter((c) => c.type === type.value));
const selectedCat = computed(() => categories.value.find((c) => c.id === categoryId.value));
const isFuel = computed(() => selectedCat.value?.isFuel === true);

// 默认选中第一个分类
watch(typeCategories, (list) => {
  if (!categoryId.value || !list.some((c) => c.id === categoryId.value)) {
    categoryId.value = list[0]?.id ?? null;
  }
}, { immediate: true });

// 默认选中第一个账户
watch(accounts, (list) => {
  if (!accountId.value && list.length) {
    accountId.value = list[0].id;
  }
}, { immediate: true });

const amountFen = computed(() => yuanToFen(amountStr.value));
const odometer = computed(() => parseFloat(kmStr.value) || 0);
// 当天单价来自油价配置
const unitPrice = computed(() => settings.value.oilPrice || 0);
const unitPriceText = computed(() =>
  unitPrice.value > 0 ? `¥${unitPrice.value.toFixed(2)}/升` : '未配置油价',
);

// 记行驶预览：本次油耗 / 本次成本
const tripKm = computed(() => parseFloat(tripKmStr.value) || 0);
const tripLiters = computed(() => parseFloat(tripLitersStr.value) || 0);
const tripConsumption = computed(() =>
  tripKm.value > 0 && tripLiters.value > 0 ? (tripLiters.value / tripKm.value) * 100 : null,
);
const tripCost = computed(() =>
  unitPrice.value > 0 && tripLiters.value > 0 ? tripLiters.value * unitPrice.value : null,
);
const tripConsumptionText = computed(() =>
  tripConsumption.value != null ? `${tripConsumption.value.toFixed(1)} L/100km` : '—',
);
const tripCostText = computed(() => (tripCost.value != null ? `¥${tripCost.value.toFixed(2)}` : '—'));

// 金额输入过滤：只保留数字与一个小数点，小数最多两位，整数最多 9 位
function sanitizeAmount(raw: string): string {
  let s = raw.replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    const int = s.slice(0, firstDot);
    const dec = s.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
    s = int + '.' + dec;
  }
  s = s.replace(/^0+(?=\d)/, '');
  const dot = s.indexOf('.');
  const intPart = dot === -1 ? s : s.slice(0, dot);
  const rest = dot === -1 ? '' : s.slice(dot);
  if (intPart.length > 9) s = intPart.slice(0, 9) + rest;
  if (s.startsWith('.')) s = '0' + s;
  return s;
}

function onAmountInput(e: Event) {
  const el = e.target as HTMLInputElement;
  const next = sanitizeAmount(el.value);
  amountStr.value = next;
  if (el.value !== next) el.value = next;
}

async function saveTx() {
  if (amountFen.value <= 0) {
    alert('请输入金额');
    return;
  }
  if (!categoryId.value) {
    alert('请选择分类');
    return;
  }
  if (!accountId.value) {
    alert('请选择账户');
    return;
  }
  await getDataProvider().addTransaction({
    id: uid(),
    ledgerId: currentLedgerId.value,
    type: type.value,
    amount: amountFen.value,
    categoryId: categoryId.value,
    accountId: accountId.value,
    date: date.value,
    note: note.value.trim(),
    createdAt: Date.now(),
    // 油费记录才写入这些字段；里程表读数选填
    ...(isFuel.value
      ? {
          fuelType: fuelType.value,
          ...(odometer.value > 0 ? { km: odometer.value } : {}),
        }
      : {}),
  });
  emit('close');
}

async function saveTrip() {
  if (tripKm.value <= 0) {
    alert('请输入行驶距离');
    return;
  }
  if (tripLiters.value <= 0) {
    alert('请输入使用升数');
    return;
  }
  await getDataProvider().addTrip({
    id: uid(),
    ledgerId: currentLedgerId.value,
    date: tripDate.value,
    km: tripKm.value,
    liters: tripLiters.value,
    createdAt: Date.now(),
  });
  emit('close');
}

function save() {
  if (mode.value === 'trip') saveTrip();
  else saveTx();
}
</script>

<template>
  <div class="add-page">
    <header class="add-header">
      <button type="button" class="icon-btn" @click="emit('close')">✕</button>
      <span class="add-title">{{ mode === 'trip' ? '记行驶' : '记一笔' }}</span>
      <button type="button" class="save-btn" @click="save">保存</button>
    </header>

    <!-- 车辆账本：双入口切换 -->
    <div v-if="isVehicle" class="add-type-toggle add-mode-toggle">
      <button type="button" :class="{ active: mode === 'tx' }" @click="mode = 'tx'">记油费</button>
      <button type="button" :class="{ active: mode === 'trip' }" @click="mode = 'trip'">记行驶</button>
    </div>

    <!-- 记油费 -->
    <template v-if="mode === 'tx'">
      <div class="add-type-toggle">
        <button
          type="button"
          class="expense"
          :class="{ active: type === 'expense' }"
          @click="type = 'expense'"
        >
          支出
        </button>
        <button
          type="button"
          class="income"
          :class="{ active: type === 'income' }"
          @click="type = 'income'"
        >
          收入
        </button>
      </div>

      <div class="add-amount">
        <span class="add-currency">¥</span>
        <input
          class="add-amount-input"
          type="text"
          inputmode="decimal"
          placeholder="0.00"
          :value="amountStr"
          @input="onAmountInput"
        />
      </div>

      <div class="add-body">
        <CategoryPicker :type="type" :selected-id="categoryId" @select="categoryId = $event" />

        <!-- 油费字段：仅「油费」分类时显示 -->
        <template v-if="isFuel">
          <div class="add-field">
            <label>油号</label>
            <div class="account-chips">
              <button
                v-for="f in FUEL_TYPE_OPTIONS"
                :key="f"
                type="button"
                class="chip"
                :class="{ active: fuelType === f }"
                @click="fuelType = f"
              >
                {{ f }}
              </button>
            </div>
          </div>
          <div class="add-field">
            <label>里程表读数（选填）</label>
            <input v-model="kmStr" class="text-input" type="number" inputmode="decimal" placeholder="如 80000（总里程 km）" />
          </div>
          <div class="fuel-preview fuel-preview-row">
            <span>当天单价：{{ unitPriceText }}</span>
            <button type="button" class="btn btn-sm" @click="showOilConfig = true">油价配置</button>
          </div>
        </template>

        <div class="add-field">
          <label>账户</label>
          <div class="account-chips">
            <button
              v-for="a in accounts"
              :key="a.id"
              type="button"
              class="chip"
              :class="{ active: accountId === a.id }"
              @click="accountId = a.id"
            >
              <span>{{ a.icon }}</span>
              {{ a.name }}
            </button>
          </div>
        </div>

        <div class="add-field">
          <label>日期</label>
          <input v-model="date" type="date" class="text-input" />
        </div>

        <div class="add-field">
          <label>备注</label>
          <input v-model="note" type="text" class="text-input" placeholder="添加备注（可选）" />
        </div>
      </div>

      <div class="add-keypad">
        <AmountKeypad v-model="amountStr" />
      </div>
    </template>

    <!-- 记行驶 -->
    <template v-else>
      <div class="add-body">
        <div class="add-field">
          <label>日期</label>
          <input v-model="tripDate" type="date" class="text-input" />
        </div>
        <div class="add-field">
          <label>本次行驶距离（km）</label>
          <input v-model="tripKmStr" class="text-input" type="number" inputmode="decimal" placeholder="如 120" />
        </div>
        <div class="add-field">
          <label>使用升数（L）</label>
          <input v-model="tripLitersStr" class="text-input" type="number" inputmode="decimal" placeholder="如 8.5" />
        </div>
        <div class="fuel-preview">
          <span>当天单价：{{ unitPriceText }}</span>
          <span>本次油耗：{{ tripConsumptionText }}</span>
          <span>本次成本：{{ tripCostText }}</span>
        </div>
        <button type="button" class="btn btn-block" @click="showOilConfig = true">油价配置</button>
      </div>
    </template>

    <OilConfigModal v-if="showOilConfig" @close="showOilConfig = false" />
  </div>
</template>
