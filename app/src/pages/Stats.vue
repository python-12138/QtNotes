<script setup lang="ts">
// 统计：收支汇总 + 分类占比饼图 + 每日趋势；车辆账本额外显示油费综合 + 每次行驶 + 图表标签页
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import VChart from 'vue-echarts';
import { db } from '../db/db';
import { useTransactions } from '../store/useTransactions';
import { useTrips } from '../store/useTrips';
import { useCategories } from '../store/useCategories';
import { useCurrentLedger } from '../store/currentLedger';
import { useSettings } from '../store/useSettings';
import { formatMoney } from '../utils/money';
import { monthLabel, shiftMonth, currentMonthStr } from '../utils/date';
import { summarizeFuel, summarizeTrips, formatConsumption, formatCostPerKm } from '../utils/vehicle';
import type { TxType } from '../db/types';

const ledger = useCurrentLedger();
const transactions = useTransactions();
const trips = useTrips();
const categories = useCategories();
const settings = useSettings();
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

// —— 油费综合：累计油钱 / 总里程 / 每公里成本 / 价格反推平均油耗 ——
const fuelCategoryIds = computed(() => categories.value.filter((c) => c.isFuel).map((c) => c.id));
const fuelRecordsAsc = computed(() =>
  transactions.value
    .filter((t) => fuelCategoryIds.value.includes(t.categoryId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((t) => ({ amount: t.amount, km: t.km })),
);
const unitPrice = computed(() => settings.value.oilPrice || 0);
const fuelSummary = computed(() =>
  summarizeFuel(
    fuelRecordsAsc.value,
    settings.value.fuelBaselineAmount,
    settings.value.fuelBaselineKm,
    unitPrice.value,
  ),
);
const fuelLitersText = computed(() =>
  fuelSummary.value.totalLiters != null ? `约 ${fuelSummary.value.totalLiters.toFixed(1)} L` : '—',
);

// —— 每次行驶：累计行驶里程 / 累计行驶升数 / 平均油耗 / 每公里使用成本 ——
const tripsAsc = computed(() =>
  [...trips.value].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt),
);
const tripSummary = computed(() => summarizeTrips(tripsAsc.value, unitPrice.value));

// 每次行驶列表（最新在前）
const tripListDesc = computed(() => [...tripSummary.value.list].reverse());
async function deleteTrip(id: string) {
  if (!confirm('删除这条行驶记录？')) return;
  await db.trips.delete(id);
}

// —— 图表：每月加油金额（柱状）+ 行驶里程（按天折线） ——
const chartTab = ref<'fuel' | 'mileage'>('fuel');

const monthlyFuel = computed(() => {
  const map = new Map<string, number>();
  for (const t of transactions.value) {
    if (!fuelCategoryIds.value.includes(t.categoryId)) continue;
    const m = t.date.slice(0, 7);
    map.set(m, (map.get(m) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, value]) => ({ month, value }));
});

const monthlyFuelOption = computed<any>(() => ({
  tooltip: { trigger: 'axis', valueFormatter: (v: number) => '¥' + formatMoney(v) },
  grid: { left: 42, right: 12, top: 16, bottom: 24 },
  xAxis: { type: 'category', data: monthlyFuel.value.map((d) => d.month), axisLabel: { fontSize: 10 } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => String(v / 100) } },
  series: [
    {
      type: 'bar',
      data: monthlyFuel.value.map((d) => d.value),
      itemStyle: { color: '#f97316', borderRadius: [3, 3, 0, 0] },
    },
  ],
}));

const dailyMileage = computed(() => {
  const map = new Map<string, number>();
  for (const t of tripsAsc.value) {
    map.set(t.date, (map.get(t.date) ?? 0) + t.km);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, km]) => ({ date, km }));
});

const dailyMileageOption = computed<any>(() => ({
  tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v.toFixed(1)} km` },
  grid: { left: 42, right: 12, top: 16, bottom: 24 },
  xAxis: { type: 'category', data: dailyMileage.value.map((d) => d.date.slice(5)), axisLabel: { fontSize: 10 } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
  series: [
    {
      type: 'line',
      smooth: true,
      data: dailyMileage.value.map((d) => d.km),
      itemStyle: { color: '#3b82f6' },
      areaStyle: { opacity: 0.12, color: '#3b82f6' },
    },
  ],
}));

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

    <!-- 车辆账本：油费 · 综合 -->
    <div v-if="isVehicle" class="fuel-summary">
      <div class="section-title">油费 · 综合</div>
      <div class="fuel-summary-row">
        <div class="fuel-stat"><span>每公里成本</span><b>{{ formatCostPerKm(fuelSummary.avgCostPerKm) }}</b></div>
        <div class="fuel-stat"><span>平均油耗</span><b>{{ formatConsumption(fuelSummary.avgConsumption) }}</b></div>
      </div>
      <div class="fuel-summary-row">
        <div class="fuel-stat"><span>累计油费</span><b>¥{{ formatMoney(fuelSummary.totalAmount) }}</b></div>
        <div class="fuel-stat"><span>累计里程</span><b>{{ fuelSummary.totalKm }} km</b></div>
      </div>
      <div class="fuel-summary-row">
        <div class="fuel-stat"><span>反算升数（约）</span><b>{{ fuelLitersText }}</b></div>
      </div>
      <div v-if="fuelSummary.avgCostPerKm === null" class="fuel-hint">
        在「油价配置」填写历史累计里程，或记录里程表读数，即可算出每公里成本
      </div>
    </div>

    <!-- 车辆账本：每次行驶 -->
    <div v-if="isVehicle" class="fuel-summary">
      <div class="section-title">每次行驶</div>
      <div class="fuel-summary-row">
        <div class="fuel-stat"><span>平均油耗</span><b>{{ formatConsumption(tripSummary.avgConsumption) }}</b></div>
        <div class="fuel-stat"><span>每公里使用成本</span><b>{{ formatCostPerKm(tripSummary.avgCostPerKm) }}</b></div>
      </div>
      <div class="fuel-summary-row">
        <div class="fuel-stat"><span>累计行驶里程</span><b>{{ tripSummary.totalKm.toFixed(1) }} km</b></div>
        <div class="fuel-stat"><span>累计行驶升数</span><b>{{ tripSummary.totalLiters.toFixed(1) }} L</b></div>
      </div>
      <ul v-if="tripListDesc.length > 0" class="trip-list">
        <li v-for="t in tripListDesc" :key="t.id" class="trip-item">
          <span class="trip-date">{{ t.date.slice(5) }}</span>
          <span class="trip-km">{{ t.km }} km · {{ t.liters }} L</span>
          <span class="trip-consumption">{{ t.consumption != null ? t.consumption.toFixed(1) + ' L/100km' : '—' }}</span>
          <b class="trip-cost">{{ t.cost != null ? '¥' + t.cost.toFixed(2) : '—' }}</b>
          <button type="button" class="icon-btn danger trip-del" @click="deleteTrip(t.id)">🗑</button>
        </li>
      </ul>
    </div>

    <!-- 车辆账本：图表标签页 -->
    <div v-if="isVehicle" class="card">
      <div class="card-head"><span class="card-title">图表</span></div>
      <div class="filter-tabs">
        <button type="button" :class="{ active: chartTab === 'fuel' }" @click="chartTab = 'fuel'">每月加油</button>
        <button type="button" :class="{ active: chartTab === 'mileage' }" @click="chartTab = 'mileage'">行驶里程</button>
      </div>
      <VChart v-if="chartTab === 'fuel' && monthlyFuel.length > 0" class="chart-box" :option="monthlyFuelOption" autoresize />
      <VChart v-else-if="chartTab === 'mileage' && dailyMileage.length > 0" class="chart-box" :option="dailyMileageOption" autoresize />
      <div v-else class="empty">暂无数据</div>
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
