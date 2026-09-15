<script setup lang="ts">
// 统计：收支汇总 + 分类占比饼图 + 收支趋势；顶部支持按日期区间筛选。
// 车辆账本额外显示油费综合 + 每次行驶 + 图表标签页。
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import VChart from 'vue-echarts';
import { getDataProvider } from '../data/provider';
import { useTransactions } from '../store/useTransactions';
import { useTrips } from '../store/useTrips';
import { useMeals } from '../store/useMeals';
import { useCategories } from '../store/useCategories';
import { useCurrentLedger } from '../store/currentLedger';
import { useSettings } from '../store/useSettings';
import { formatMoney } from '../utils/money';
import { summarizeFuel, summarizeTrips, formatConsumption, formatCostPerKm } from '../utils/vehicle';
import { summarizeMealsByDay, formatGrams } from '../utils/diet';
import type { TxType, TripRecord } from '../types';
import Add from './Add.vue';

const ledger = useCurrentLedger();
const transactions = useTransactions();
const trips = useTrips();
const meals = useMeals();
const categories = useCategories();
const settings = useSettings();
const type = ref<TxType>('expense');

const isVehicle = computed(() => ledger.value?.type === 'vehicle');
const isDiet = computed(() => ledger.value?.type === 'diet');

// —— 日期区间筛选（默认本月） ——
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

// 起止日期（填反自动纠正）；都为空表示「全部」
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

function inRange(date: string): boolean {
  const { s, e } = range.value;
  if (s && date < s) return false;
  if (e && date > e) return false;
  return true;
}

const rangeTx = computed(() => transactions.value.filter((t) => inRange(t.date)));
const rangeTrips = computed(() => trips.value.filter((t) => inRange(t.date)));

// 收支合计
const totals = computed(() => {
  let income = 0;
  let expense = 0;
  for (const t of rangeTx.value) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
});

// —— 油费综合：累计油钱 / 总里程 / 每公里成本 / 价格反推平均油耗 ——
const fuelCategoryIds = computed(() => categories.value.filter((c) => c.isFuel).map((c) => c.id));
const fuelRecordsAsc = computed(() =>
  rangeTx.value
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
  [...rangeTrips.value].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt),
);
const tripSummary = computed(() => summarizeTrips(tripsAsc.value, unitPrice.value));

// 每次行驶列表（最新在前）
const tripListDesc = computed(() => [...tripSummary.value.list].reverse());
async function deleteTrip(id: string) {
  if (!confirm('删除这条行驶记录？')) return;
  await getDataProvider().deleteTrip(id);
}

// 点击行驶条目进入编辑：TripStat 缺 ledgerId/createdAt，按 id 反查完整 TripRecord 再传给编辑层
const editingTrip = ref<TripRecord | null>(null);
function editTrip(stat: { id: string }) {
  editingTrip.value = trips.value.find((t) => t.id === stat.id) ?? null;
}

// —— 图表：每月加油金额（柱状）+ 行驶里程（按天折线） ——
const chartTab = ref<'fuel' | 'mileage'>('fuel');

const monthlyFuel = computed(() => {
  const map = new Map<string, number>();
  for (const t of rangeTx.value) {
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
  for (const t of rangeTx.value) {
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

// 收支趋势：起止都填且不超过 62 天 → 按天；否则（全部 / 跨度太大）→ 按月
const trendData = computed(() => {
  const { s, e } = range.value;
  const data: { label: string; value: number }[] = [];
  if (s && e && dayjs(e).diff(dayjs(s), 'day') + 1 <= 62) {
    let cur = dayjs(s);
    const stop = dayjs(e);
    while (cur.isBefore(stop) || cur.isSame(stop, 'day')) {
      const date = cur.format('YYYY-MM-DD');
      let value = 0;
      for (const t of rangeTx.value) {
        if (t.type === type.value && t.date === date) value += t.amount;
      }
      data.push({ label: date.slice(5), value });
      cur = cur.add(1, 'day');
    }
  } else {
    const map = new Map<string, number>();
    for (const t of rangeTx.value) {
      if (t.type !== type.value) continue;
      const m = t.date.slice(0, 7);
      map.set(m, (map.get(m) ?? 0) + t.amount);
    }
    for (const [m, value] of Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      data.push({ label: m, value });
    }
  }
  return data;
});

const trendTitle = computed(() => {
  const { s, e } = range.value;
  const daily = !!s && !!e && dayjs(e).diff(dayjs(s), 'day') + 1 <= 62;
  return `${daily ? '每日' : '每月'}${type.value === 'expense' ? '支出' : '收入'}趋势`;
});

const barOption = computed<any>(() => ({
  tooltip: { trigger: 'axis', valueFormatter: (v: number) => '¥' + formatMoney(v) },
  grid: { left: 42, right: 12, top: 16, bottom: 24 },
  xAxis: { type: 'category', data: trendData.value.map((d) => d.label), axisLabel: { fontSize: 10 } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => String(v / 100) } },
  series: [
    {
      type: 'bar',
      data: trendData.value.map((d) => d.value),
      itemStyle: { color: type.value === 'expense' ? '#f43f5e' : '#22c55e', borderRadius: [3, 3, 0, 0] },
    },
  ],
}));

// —— 饮食账本：碳蛋脂汇总与每日趋势 ——
const rangeMeals = computed(() => meals.value.filter((m) => inRange(m.date)));
const dietDays = computed(() => summarizeMealsByDay(rangeMeals.value));

// 区间累计 + 日均（日均按「有记录的天数」平均）
const dietTotals = computed(() => {
  let carbs = 0;
  let protein = 0;
  let fat = 0;
  let kcal = 0;
  for (const d of dietDays.value) {
    carbs += d.carbs;
    protein += d.protein;
    fat += d.fat;
    kcal += d.kcal;
  }
  const days = dietDays.value.length || 1;
  return {
    kcal,
    carbs,
    protein,
    fat,
    avgKcal: Math.round(kcal / days),
    avgCarbs: Math.round(carbs / days),
    avgProtein: Math.round(protein / days),
    avgFat: Math.round(fat / days),
  };
});

// 每日碳蛋脂堆叠柱状图（单位：克）
const dietChartOption = computed<any>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['碳水', '蛋白质', '脂肪'], bottom: 0, textStyle: { fontSize: 10 } },
  grid: { left: 42, right: 12, top: 16, bottom: 40 },
  xAxis: { type: 'category', data: dietDays.value.map((d) => d.date.slice(5)), axisLabel: { fontSize: 10 } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
  series: [
    { name: '碳水', type: 'bar', stack: 'total', data: dietDays.value.map((d) => d.carbs), itemStyle: { color: '#f59e0b' } },
    { name: '蛋白质', type: 'bar', stack: 'total', data: dietDays.value.map((d) => d.protein), itemStyle: { color: '#3b82f6' } },
    { name: '脂肪', type: 'bar', stack: 'total', data: dietDays.value.map((d) => d.fat), itemStyle: { color: '#f43f5e' } },
  ],
}));

const presets: { key: Preset; label: string }[] = [
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'last7', label: '近7天' },
  { key: 'last30', label: '近30天' },
  { key: 'all', label: '全部' },
];
</script>

<template>
  <div class="page stats">
    <header class="page-header">
      <h1>统计</h1>
    </header>

    <!-- 日期区间筛选 -->
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

    <!-- 饮食账本：碳蛋脂汇总 + 每日趋势 -->
    <template v-if="isDiet">
      <div class="stats-summary">
        <div><span>累计热量</span><b>{{ dietTotals.kcal }} kcal</b></div>
        <div><span>日均热量</span><b>{{ dietTotals.avgKcal }} kcal</b></div>
      </div>
      <div class="stats-summary">
        <div><span>日均碳水</span><b>{{ formatGrams(dietTotals.avgCarbs) }}</b></div>
        <div><span>日均蛋白</span><b>{{ formatGrams(dietTotals.avgProtein) }}</b></div>
        <div><span>日均脂肪</span><b>{{ formatGrams(dietTotals.avgFat) }}</b></div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">每日碳蛋脂（克）</span></div>
        <VChart v-if="dietDays.length > 0" class="chart-box" :option="dietChartOption" autoresize />
        <div v-else class="empty">暂无数据</div>
      </div>
    </template>

    <!-- 普通 / 用车 -->
    <template v-else>
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
        <li v-for="t in tripListDesc" :key="t.id" class="trip-item" @click="editTrip(t)">
          <span class="trip-date">{{ t.date.slice(5) }}</span>
          <span class="trip-km">{{ t.km }} km · {{ t.liters }} L</span>
          <span class="trip-consumption">{{ t.consumption != null ? t.consumption.toFixed(1) + ' L/100km' : '—' }}</span>
          <b class="trip-cost">{{ t.cost != null ? '¥' + t.cost.toFixed(2) : '—' }}</b>
          <button type="button" class="icon-btn danger trip-del" @click.stop="deleteTrip(t.id)">🗑</button>
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

    <div class="chart-grid">
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
          <span class="card-title">{{ trendTitle }}</span>
        </div>
        <VChart class="chart-box" :option="barOption" autoresize />
      </div>
    </div>
    </template>

    <!-- 编辑层（复用 Add 表单，回填后保存） -->
    <Add v-if="editingTrip" :edit-trip="editingTrip" @close="editingTrip = null" />
  </div>
</template>
