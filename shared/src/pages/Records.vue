<script setup lang="ts">
// 明细：按月筛选、按日期分组；点击条目进入编辑，垃圾桶删除。
//   普通/用车账本 = 金额流水（副标题展示账户/油号/里程）
//   饮食账本 = 每顿饭（缩略图 + 餐次 + 碳蛋脂 + 热量）
import { computed, ref } from 'vue';
import { getDataProvider } from '../data/provider';
import { useTransactions } from '../store/useTransactions';
import { useMeals } from '../store/useMeals';
import { useAccounts } from '../store/useAccounts';
import { useCategories } from '../store/useCategories';
import { useCurrentLedger } from '../store/currentLedger';
import { formatMoney } from '../utils/money';
import { dateLabel, weekdayLabel, monthLabel, shiftMonth, currentMonthStr } from '../utils/date';
import { mealTypeLabel, formatGrams } from '../utils/diet';
import type { Transaction, MealRecord } from '../types';
import TransactionItem from '../components/TransactionItem.vue';
import Add from './Add.vue';

type Filter = 'all' | 'expense' | 'income';

const transactions = useTransactions();
const meals = useMeals();
const accounts = useAccounts();
const categories = useCategories();
const ledger = useCurrentLedger();
const month = ref(currentMonthStr());
const filter = ref<Filter>('all');

const isDiet = computed(() => ledger.value?.type === 'diet');

// 点击某条记录后进入编辑（null = 关闭编辑层）
const editingTx = ref<Transaction | null>(null);
const editingMeal = ref<MealRecord | null>(null);

// —— 普通/用车：金额流水 ——
const list = computed(() =>
  transactions.value.filter((t) => {
    if (!t.date.startsWith(month.value)) return false;
    if (filter.value !== 'all' && t.type !== filter.value) return false;
    return true;
  }),
);

// 按日期分组
const groups = computed(() => {
  const map = new Map<string, Transaction[]>();
  for (const t of list.value) {
    if (!map.has(t.date)) map.set(t.date, []);
    map.get(t.date)!.push(t);
  }
  return Array.from(map.entries());
});

const totals = computed(() => {
  let expense = 0;
  let income = 0;
  for (const t of list.value) {
    if (t.type === 'expense') expense += t.amount;
    else income += t.amount;
  }
  return { expense, income };
});

const accMap = computed(() => new Map(accounts.value.map((a) => [a.id, a])));

// 组合条目副标题：账户 + 油号/里程 + 备注
function metaFor(t: Transaction): string {
  const acc = accMap.value.get(t.accountId);
  let meta = acc?.name ?? '';
  if (t.fuelType) meta += (meta ? ' · ' : '') + t.fuelType;
  if (t.km && t.km > 0) meta += (meta ? ' · ' : '') + `里程 ${t.km}km`;
  if (t.note) meta += (meta ? ' · ' : '') + t.note;
  return meta;
}

async function deleteTx(t: Transaction) {
  if (!confirm('删除这笔记录？')) return;
  await getDataProvider().deleteTransaction(t.id);
}

function dayTotal(items: Transaction[]): number {
  return items.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0);
}

// —— 饮食账本：每顿饭 ——
const monthMeals = computed(() => meals.value.filter((m) => m.date.startsWith(month.value)));

// 按日期分组（最新日期在前；每天内已按创建时间倒序）
const mealGroups = computed(() => {
  const map = new Map<string, MealRecord[]>();
  for (const m of monthMeals.value) {
    if (!map.has(m.date)) map.set(m.date, []);
    map.get(m.date)!.push(m);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
});

// 一天的热量合计（标题右侧展示）
function dayKcal(items: MealRecord[]): number {
  return items.reduce((s, m) => s + m.kcal, 0);
}

async function deleteMeal(m: MealRecord) {
  if (!confirm('删除这条饮食记录？')) return;
  await getDataProvider().deleteMeal(m.id);
}
</script>

<template>
  <div class="page records">
    <header class="page-header">
      <button type="button" class="icon-btn" @click="month = shiftMonth(month, -1)">‹</button>
      <h1>{{ monthLabel(month) }}</h1>
      <button type="button" class="icon-btn" @click="month = shiftMonth(month, 1)">›</button>
    </header>

    <!-- 饮食账本：每顿饭 -->
    <template v-if="isDiet">
      <div v-if="mealGroups.length === 0" class="empty">本月暂无饮食记录</div>
      <section v-for="[date, items] in mealGroups" :key="date" class="day-group">
        <div class="day-header">
          <span>{{ dateLabel(date) }} {{ weekdayLabel(date) }}</span>
          <span class="diet-day-kcal">{{ dayKcal(items) }} kcal</span>
        </div>
        <div v-for="m in items" :key="m.id" class="meal-item" @click="editingMeal = m">
          <img v-if="m.image" :src="m.image" class="meal-thumb" alt="食物照片" />
          <span v-else class="meal-thumb meal-thumb-empty">🍽</span>
          <div class="meal-info">
            <div class="meal-top">
              <span class="meal-type">{{ mealTypeLabel(m.mealType) }}</span>
              <span class="meal-summary">{{ m.summary || '未命名' }}</span>
            </div>
            <div class="meal-macros">
              <span>碳水 {{ formatGrams(m.carbs) }}</span>
              <span>蛋白质 {{ formatGrams(m.protein) }}</span>
              <span>脂肪 {{ formatGrams(m.fat) }}</span>
              <b>{{ m.kcal }} kcal</b>
              <span v-if="m.remainingKcal" class="meal-remaining">剩 {{ m.remainingKcal }} kcal</span>
            </div>
          </div>
          <button type="button" class="icon-btn danger meal-del" @click.stop="deleteMeal(m)">🗑</button>
        </div>
      </section>
    </template>

    <!-- 普通 / 用车：金额明细 -->
    <template v-else>
      <div class="records-summary">
        <span>支出 <b class="expense">¥{{ formatMoney(totals.expense) }}</b></span>
        <span>收入 <b class="income">¥{{ formatMoney(totals.income) }}</b></span>
      </div>

      <div class="filter-tabs">
        <button type="button" :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</button>
        <button type="button" :class="{ active: filter === 'expense' }" @click="filter = 'expense'">支出</button>
        <button type="button" :class="{ active: filter === 'income' }" @click="filter = 'income'">收入</button>
      </div>

      <div v-if="groups.length === 0" class="empty">本月暂无记录</div>
      <section v-for="[date, items] in groups" :key="date" class="day-group">
        <div class="day-header">
          <span>{{ dateLabel(date) }} {{ weekdayLabel(date) }}</span>
          <span :class="dayTotal(items) < 0 ? 'expense' : 'income'">¥{{ formatMoney(dayTotal(items)) }}</span>
        </div>
        <TransactionItem
          v-for="t in items"
          :key="t.id"
          :tx="t"
          :meta="metaFor(t)"
          deletable
          @click="editingTx = t"
          @delete="deleteTx(t)"
        />
      </section>
    </template>

    <!-- 编辑层（复用 Add 表单，回填后保存） -->
    <Add v-if="editingTx" :edit-tx="editingTx" @close="editingTx = null" />
    <Add v-if="editingMeal" :edit-meal="editingMeal" @close="editingMeal = null" />
  </div>
</template>
