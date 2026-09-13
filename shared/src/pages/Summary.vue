<script setup lang="ts">
// 按日期汇总：支持自定义日期周期（开始/结束日期 + 常用预设），按天聚合支出/收入/结余。
// 复用 DataProvider：手机端聚合本地 IndexedDB，电脑端聚合服务端 MySQL 数据，两端同一份代码。
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { useTransactions } from '../store/useTransactions';
import { formatMoney } from '../utils/money';
import { dateLabel, weekdayLabel } from '../utils/date';

const transactions = useTransactions();

// 默认周期：本月（1 号 ~ 今天）
const startDate = ref(dayjs().startOf('month').format('YYYY-MM-DD'));
const endDate = ref(dayjs().format('YYYY-MM-DD'));

type Preset = 'thisMonth' | 'lastMonth' | 'last7' | 'last30' | 'all';

function setPreset(name: Preset) {
  const now = dayjs();
  switch (name) {
    case 'thisMonth':
      startDate.value = now.startOf('month').format('YYYY-MM-DD');
      endDate.value = now.format('YYYY-MM-DD');
      break;
    case 'lastMonth':
      startDate.value = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
      endDate.value = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
      break;
    case 'last7':
      startDate.value = now.subtract(6, 'day').format('YYYY-MM-DD');
      endDate.value = now.format('YYYY-MM-DD');
      break;
    case 'last30':
      startDate.value = now.subtract(29, 'day').format('YYYY-MM-DD');
      endDate.value = now.format('YYYY-MM-DD');
      break;
    case 'all':
      startDate.value = '';
      endDate.value = '';
      break;
  }
}

// 起止日期（若用户填反了自动纠正）；都为空表示「全部」
const range = computed(() => {
  let s = startDate.value;
  let e = endDate.value;
  if (s && e && s > e) {
    const t = s;
    s = e;
    e = t;
  }
  return { s, e };
});

const filtered = computed(() => {
  const { s, e } = range.value;
  return transactions.value.filter((t) => {
    if (s && t.date < s) return false;
    if (e && t.date > e) return false;
    return true;
  });
});

interface DaySummary {
  date: string;
  expense: number;
  income: number;
  net: number;
  count: number;
}

const days = computed<DaySummary[]>(() => {
  const map = new Map<string, DaySummary>();
  for (const t of filtered.value) {
    let d = map.get(t.date);
    if (!d) {
      d = { date: t.date, expense: 0, income: 0, net: 0, count: 0 };
      map.set(t.date, d);
    }
    if (t.type === 'expense') d.expense += t.amount;
    else d.income += t.amount;
    d.count += 1;
  }
  const arr = Array.from(map.values());
  for (const d of arr) d.net = d.income - d.expense;
  return arr.sort((a, b) => a.date.localeCompare(b.date));
});

const totals = computed(() => {
  let expense = 0;
  let income = 0;
  for (const d of days.value) {
    expense += d.expense;
    income += d.income;
  }
  return { expense, income, net: income - expense };
});

const presets: { key: Preset; label: string }[] = [
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'last7', label: '近7天' },
  { key: 'last30', label: '近30天' },
  { key: 'all', label: '全部' },
];
</script>

<template>
  <div class="page summary">
    <header class="page-header">
      <h1>按日期汇总</h1>
    </header>

    <div class="range-bar">
      <input v-model="startDate" type="date" class="text-input" />
      <span class="range-sep">~</span>
      <input v-model="endDate" type="date" class="text-input" />
    </div>

    <div class="filter-tabs">
      <button v-for="p in presets" :key="p.key" type="button" @click="setPreset(p.key)">
        {{ p.label }}
      </button>
    </div>

    <div class="records-summary">
      <span>支出 <b class="expense">¥{{ formatMoney(totals.expense) }}</b></span>
      <span>收入 <b class="income">¥{{ formatMoney(totals.income) }}</b></span>
      <span>结余 <b :class="totals.net < 0 ? 'expense' : 'income'">¥{{ formatMoney(totals.net) }}</b></span>
    </div>

    <div v-if="days.length === 0" class="empty">该时间段暂无记录</div>
    <div v-else class="card summary-table">
      <div class="summary-head">
        <span>日期</span><span>支出</span><span>收入</span><span>结余</span>
      </div>
      <div v-for="d in days" :key="d.date" class="summary-row">
        <span class="summary-date">
          {{ dateLabel(d.date) }} <em>{{ weekdayLabel(d.date) }}</em>
        </span>
        <span class="expense">{{ d.expense ? '¥' + formatMoney(d.expense) : '—' }}</span>
        <span class="income">{{ d.income ? '¥' + formatMoney(d.income) : '—' }}</span>
        <b :class="d.net < 0 ? 'expense' : 'income'">{{ d.net ? '¥' + formatMoney(d.net) : '—' }}</b>
      </div>
    </div>
  </div>
</template>
