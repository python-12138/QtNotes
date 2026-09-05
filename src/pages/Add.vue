<script setup lang="ts">
// 记一笔：普通账目；车辆账本选「油费」分类时额外录入升数/公里数并实时算油耗
import { computed, ref, watch } from 'vue';
import { db } from '../db/db';
import { currentLedgerId } from '../store/currentLedger';
import { useCategories } from '../store/useCategories';
import { useAccounts } from '../store/useAccounts';
import { yuanToFen } from '../utils/money';
import { todayStr } from '../utils/date';
import { uid } from '../utils/id';
import { fuelConsumption, costPerKm, formatConsumption, formatCostPerKm } from '../utils/vehicle';
import { FUEL_TYPE_OPTIONS } from '../db/presets';
import type { TxType } from '../db/types';
import AmountKeypad from '../components/AmountKeypad.vue';
import CategoryPicker from '../components/CategoryPicker.vue';

const emit = defineEmits<{ (e: 'close'): void }>();

const categories = useCategories();
const accounts = useAccounts();

const type = ref<TxType>('expense');
const amountStr = ref('');
const categoryId = ref<string | null>(null);
const accountId = ref<string | null>(null);
const date = ref(todayStr());
const note = ref('');
// 加油记录字段
const fuelType = ref(FUEL_TYPE_OPTIONS[0] ?? '');
const litersStr = ref('');
const kmStr = ref('');

const typeCategories = computed(() => categories.value.filter((c) => c.type === type.value));
const selectedCat = computed(() => categories.value.find((c) => c.id === categoryId.value));
// 是否为「油费」分类（显示加油字段）
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
const liters = computed(() => parseFloat(litersStr.value) || 0);
const km = computed(() => parseFloat(kmStr.value) || 0);

// 实时油耗预览
const consumption = computed(() => fuelConsumption(liters.value, km.value));
const perKm = computed(() => costPerKm(amountFen.value, km.value));

async function save() {
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
  if (isFuel.value) {
    if (liters.value <= 0) {
      alert('请输入加油升数');
      return;
    }
    if (km.value <= 0) {
      alert('请输入行驶公里数');
      return;
    }
  }
  await db.transactions.add({
    id: uid(),
    ledgerId: currentLedgerId.value,
    type: type.value,
    amount: amountFen.value,
    categoryId: categoryId.value,
    accountId: accountId.value,
    date: date.value,
    note: note.value.trim(),
    createdAt: Date.now(),
    // 油费记录才写入这三个字段
    ...(isFuel.value ? { fuelType: fuelType.value, liters: liters.value, km: km.value } : {}),
  });
  emit('close');
}
</script>

<template>
  <div class="add-page">
    <header class="add-header">
      <button type="button" class="icon-btn" @click="emit('close')">✕</button>
      <span class="add-title">记一笔</span>
      <button type="button" class="save-btn" @click="save">保存</button>
    </header>

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
      <span class="add-amount-value">{{ amountStr || '0.00' }}</span>
    </div>

    <div class="add-body">
      <CategoryPicker :type="type" :selected-id="categoryId" @select="categoryId = $event" />

      <!-- 加油字段：仅「油费」分类时显示 -->
      <template v-if="isFuel">
        <div class="add-field">
          <label>油费类型</label>
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
          <label>加油升数</label>
          <input v-model="litersStr" class="text-input" type="number" inputmode="decimal" placeholder="如 35.5（升）" />
        </div>
        <div class="add-field">
          <label>行驶公里数</label>
          <input v-model="kmStr" class="text-input" type="number" inputmode="decimal" placeholder="如 480（公里）" />
        </div>
        <div class="fuel-preview">
          <span>百公里油耗：{{ formatConsumption(consumption) }}</span>
          <span>每公里：{{ formatCostPerKm(perKm) }}</span>
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
  </div>
</template>
