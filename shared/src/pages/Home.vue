<script setup lang="ts">
// 首页：账本切换入口 + 概览 + 最近记录
//   普通/用车账本 = 本月收支概览 + 最近账单
//   饮食账本 = 今日摄入（热量 + 碳蛋脂）+ 最近饮食
import { computed, ref } from 'vue';
import { useCurrentLedger } from '../store/currentLedger';
import { useTransactions } from '../store/useTransactions';
import { useMeals } from '../store/useMeals';
import { formatMoney } from '../utils/money';
import { currentMonthStr, dateLabel, todayStr } from '../utils/date';
import { mealTypeLabel, formatGrams, calcBMR } from '../utils/diet';
import type { Transaction, MealRecord } from '../types';
import TransactionItem from '../components/TransactionItem.vue';
import Add from './Add.vue';

const emit = defineEmits<{ (e: 'open-ledger'): void }>();

const ledger = useCurrentLedger();
const transactions = useTransactions();
const meals = useMeals();
const month = currentMonthStr();

const isDiet = computed(() => ledger.value?.type === 'diet');

// 本月收入 / 支出 / 结余
const summary = computed(() => {
  let income = 0;
  let expense = 0;
  for (const t of transactions.value) {
    if (!t.date.startsWith(month)) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
});

const recent = computed(() => transactions.value.slice(0, 10));

// —— 饮食账本：今日摄入 ——
const today = todayStr();
const todayMeals = computed(() => meals.value.filter((m) => m.date === today));

// 今日碳蛋脂/热量合计
const todayNutrition = computed(() => {
  let carbs = 0;
  let protein = 0;
  let fat = 0;
  let kcal = 0;
  for (const m of todayMeals.value) {
    carbs += m.carbs;
    protein += m.protein;
    fat += m.fat;
    kcal += m.kcal;
  }
  return { carbs, protein, fat, kcal };
});

// 基础代谢与今日热量盈余（未填身体信息时为 null）
const bmr = computed(() => calcBMR(ledger.value ?? {}));
const surplus = computed(() => (bmr.value != null ? todayNutrition.value.kcal - bmr.value : null));

const recentMeals = computed(() => meals.value.slice(0, 10));

// 点击某条记录后进入编辑（null = 关闭编辑层）
const editingTx = ref<Transaction | null>(null);
const editingMeal = ref<MealRecord | null>(null);
</script>

<template>
  <div class="page home">
    <header class="home-header">
      <button type="button" class="home-ledger-btn" @click="emit('open-ledger')">
        <span
          class="ledger-icon-sm"
          :style="{ background: `${ledger?.color ?? '#22c55e'}22`, color: ledger?.color ?? '#22c55e' }"
        >
          {{ ledger?.icon ?? '📒' }}
        </span>
        <h1>{{ ledger?.name ?? '记账本' }}</h1>
        <span class="home-ledger-arrow">▾</span>
      </button>
    </header>

    <!-- 饮食账本：今日摄入 -->
    <template v-if="isDiet">
      <section class="summary-card diet-summary-card">
        <div class="summary-label">今日摄入</div>
        <div class="summary-expense">{{ todayNutrition.kcal }} <small>kcal</small></div>
        <div v-if="surplus != null" class="summary-surplus">
          今日{{ surplus >= 0 ? '盈余 +' : '缺口 ' }}{{ Math.abs(surplus) }} kcal
        </div>
        <div class="summary-sub">
          <div>
            <span>碳水</span>
            <b>{{ formatGrams(todayNutrition.carbs) }}</b>
          </div>
          <div>
            <span>蛋白质</span>
            <b>{{ formatGrams(todayNutrition.protein) }}</b>
          </div>
          <div>
            <span>脂肪</span>
            <b>{{ formatGrams(todayNutrition.fat) }}</b>
          </div>
        </div>
      </section>

      <section class="card recent">
        <div class="section-title">最近饮食</div>
        <div v-if="recentMeals.length === 0" class="empty">还没有记录，点下方 ＋ 记一顿饭吧</div>
        <div v-for="m in recentMeals" :key="m.id" class="meal-item" @click="editingMeal = m">
          <img v-if="m.image" :src="m.image" class="meal-thumb" alt="食物照片" />
          <span v-else class="meal-thumb meal-thumb-empty">🍽</span>
          <div class="meal-info">
            <div class="meal-top">
              <span class="meal-type">{{ mealTypeLabel(m.mealType) }}</span>
              <span class="meal-summary">{{ m.summary || '未命名' }}</span>
            </div>
            <div class="meal-macros">
              <span>{{ dateLabel(m.date) }}</span>
              <b>{{ m.kcal }} kcal</b>
              <span v-if="m.remainingKcal" class="meal-remaining">剩 {{ m.remainingKcal }} kcal</span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- 普通 / 用车：本月收支概览 -->
    <template v-else>
      <section class="summary-card">
        <div class="summary-label">本月支出</div>
        <div class="summary-expense">¥ {{ formatMoney(summary.expense) }}</div>
        <div class="summary-sub">
          <div>
            <span>收入</span>
            <b>¥ {{ formatMoney(summary.income) }}</b>
          </div>
          <div>
            <span>结余</span>
            <b>¥ {{ formatMoney(summary.balance) }}</b>
          </div>
        </div>
      </section>

      <section class="card recent">
        <div class="section-title">最近账单</div>
        <div v-if="recent.length === 0" class="empty">还没有记录，点下方 ＋ 记一笔吧</div>
        <TransactionItem
          v-for="t in recent"
          :key="t.id"
          :tx="t"
          :meta="`${dateLabel(t.date)}${t.note ? ' · ' + t.note : ''}`"
          @click="editingTx = t"
        />
      </section>
    </template>

    <!-- 编辑层（复用 Add 表单，回填后保存） -->
    <Add v-if="editingTx" :edit-tx="editingTx" @close="editingTx = null" />
    <Add v-if="editingMeal" :edit-meal="editingMeal" @close="editingMeal = null" />
  </div>
</template>
