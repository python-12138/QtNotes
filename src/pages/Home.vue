<script setup lang="ts">
// 首页：账本切换入口 + 本月收支概览 + 最近账单
import { computed } from 'vue';
import { useCurrentLedger } from '../store/currentLedger';
import { useTransactions } from '../store/useTransactions';
import { formatMoney } from '../utils/money';
import { currentMonthStr, dateLabel } from '../utils/date';
import TransactionItem from '../components/TransactionItem.vue';

const emit = defineEmits<{ (e: 'open-ledger'): void }>();

const ledger = useCurrentLedger();
const transactions = useTransactions();
const month = currentMonthStr();

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
      />
    </section>
  </div>
</template>
