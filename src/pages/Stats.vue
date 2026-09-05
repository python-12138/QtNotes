<script setup lang="ts">
// 统计：收支汇总 + 分类占比饼图 + 每日趋势；车辆账本额外显示油耗统计
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import VChart from 'vue-echarts';
import { useTransactions } from '../store/useTransactions';
import { useCategories } from '../store/useCategories';
import { useCurrentLedger } from '../store/currentLedger';
import { formatMoney } from '../utils/money';
import { monthLabel, shiftMonth, currentMonthStr } from '../utils/date';
import { summarizeFuel, fuelConsumption, formatConsumption, formatCostPerKm } from '../utils/vehicle';
import type { TxType } from '../db/types';

const ledger = useCurrentLedger();
const transactions = useTransactions();
const categories = useCategories();
const month = ref(currentMonthStr());
const type = ref<TxType>('expense');

const isVehicle = computed(() => ledger.value?.type === 'vehicle');

const monthTx = computed(() => transactions.value.filter((t) => t.date.startsWith(month.value)));

// 收支合计
const totals = computed(() => {
  let income = 0;
  let expense = 0;
  for (const t of monthTx.value) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
});

// 油耗统计（车辆账本）：所有有效加油记录
const fuelRecords = computed(() =>
  transactions.value.filter((t) => (t.liters ?? 0) > 0 && (t.km ?? 0) > 0),
);
const fuelSummary = computed(() => summarizeFuel(fuelRecords.value));
// 流水已按日期倒序，第一条即最近一次加油
const lastFuel = computed(() => fuelRecords.value[0] ?? null);
const lastConsumption = computed(() =>
  lastFuel.value ? fuelConsumption(lastFuel.value.liters, lastFuel.value.km) : null,
);

// 分类占比数据
const pieData = computed(() => {
  const byCat = new Map<string, number>();
  for (const t of monthTx.value) {
    if (t.type !== type.value) continue;
    byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + t.amount);
  }
  return Array.from(byCat.entries()).map(([catId, value]) => {
    const c = categories.value.find((x) => x.id === catId);
    return { name: c?.name ?? '未分类', value, color: c?.color ?? '#999999' };
  });
});

// 图表 option 用 any 以避免 echarts 严格类型带来的编译噪音
const pieOption = computed<any>(() => ({
  tooltip: { trigger: 'item', valueFormatter: (v: number) => '¥' + formatMoney(v) },
  series: [
    {
      type: 'pie',
      radius: ['45%', '72%'],
      data: pieData.value.map((d) => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
      label: { show: false },
    },
  ],
}));

// 每日趋势数据
const trendData = computed(() => {
  const days = dayjs(`${month.value}-01`).daysInMonth();
  const data: { day: string; value: number }[] = [];
  for (let d = 1; d <= days; d++) {
    const date = `${month.value}-${String(d).padStart(2, '0')}`;
    let value = 0;
    for (const t of monthTx.value) {
      if (t.type === type.value && t.date === date) value += t.amount;
    }
    data.push({ day: String(d), value });
  }
  return data;
});

const barOption = computed<any>(() => ({
  tooltip: { trigger: 'axis', valueFormatter: (v: number) => '¥' + formatMoney(v) },
  grid: { left: 42, right: 12, top: 16, bottom: 24 },
  xAxis: { type: 'category', data: trendData.value.map((d) => d.day), axisLabel: { fontSize: 10 } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => String(v / 100) } },
  series: [
    {
      type: 'bar',
      data: trendData.value.map((d) => d.value),
      itemStyle: { color: type.value === 'expense' ? '#f43f5e' : '#22c55e', borderRadius: [3, 3, 0, 0] },
    },
  ],
}));
</script>

<template>
  <div class="page stats">
    <header class="page-header">
      <button type="button" class="icon-btn" @click="month = shiftMonth(month, -1)">‹</button>
      <h1>{{ monthLabel(month) }}</h1>
      <button type="button" class="icon-btn" @click="month = shiftMonth(month, 1)">›</button>
    </header>

    <!-- 车辆账本：油耗统计 -->
    <div v-if="isVehicle" class="fuel-summary">
      <div class="fuel-summary-row">
        <div class="fuel-stat"><span>最近一次油耗</span><b>{{ formatConsumption(lastConsumption) }}</b></div>
        <div class="fuel-stat"><span>综合油耗</span><b>{{ formatConsumption(fuelSummary.avgConsumption) }}</b></div>
      </div>
      <div class="fuel-summary-row">
        <div class="fuel-stat"><span>每公里费用</span><b>{{ formatCostPerKm(fuelSummary.avgCostPerKm) }}</b></div>
        <div class="fuel-stat"><span>累计里程</span><b>{{ fuelSummary.totalKm }} km</b></div>
      </div>
    </div>

    <div class="stats-summary">
      <div><span>收入</span><b class="income">¥{{ formatMoney(totals.income) }}</b></div>
      <div><span>支出</span><b class="expense">¥{{ formatMoney(totals.expense) }}</b></div>
      <div><span>结余</span><b>¥{{ formatMoney(totals.balance) }}</b></div>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">分类占比</span>
        <div class="filter-tabs small">
          <button type="button" :class="{ active: type === 'expense' }" @click="type = 'expense'">支出</button>
          <button type="button" :class="{ active: type === 'income' }" @click="type = 'income'">收入</button>
        </div>
      </div>
      <div v-if="pieData.length === 0" class="empty">暂无数据</div>
      <template v-else>
        <VChart class="chart-box" :option="pieOption" autoresize />
        <ul class="legend">
          <li v-for="(e, i) in pieData" :key="i">
            <span class="legend-dot" :style="{ background: e.color }" />
            <span class="legend-name">{{ e.name }}</span>
            <b>¥{{ formatMoney(e.value) }}</b>
          </li>
        </ul>
      </template>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="card-title">每日{{ type === 'expense' ? '支出' : '收入' }}趋势</span>
      </div>
      <VChart class="chart-box" :option="barOption" autoresize />
    </div>
  </div>
</template>
