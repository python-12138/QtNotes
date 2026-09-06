<script setup lang="ts">
// 明细：按月 + 类型筛选，按日期分组；油费记录在副标题展示油号/里程，支持删除
import { computed, ref } from 'vue';
import { getDataProvider } from '../data/provider';
import { useTransactions } from '../store/useTransactions';
import { useAccounts } from '../store/useAccounts';
import { useCategories } from '../store/useCategories';
import { formatMoney } from '../utils/money';
import { dateLabel, weekdayLabel, monthLabel, shiftMonth, currentMonthStr } from '../utils/date';
import type { Transaction } from '../types';
import TransactionItem from '../components/TransactionItem.vue';

type Filter = 'all' | 'expense' | 'income';

const transactions = useTransactions();
const accounts = useAccounts();
const categories = useCategories();
const month = ref(currentMonthStr());
const filter = ref<Filter>('all');

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
</script>

<template>
  <div class="page records">
    <header class="page-header">
      <button type="button" class="icon-btn" @click="month = shiftMonth(month, -1)">‹</button>
      <h1>{{ monthLabel(month) }}</h1>
      <button type="button" class="icon-btn" @click="month = shiftMonth(month, 1)">›</button>
    </header>

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
        @delete="deleteTx(t)"
      />
    </section>
  </div>
</template>
