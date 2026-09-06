<script setup lang="ts">
// 电脑端只读查看器：读取服务端 MySQL 里同步来的数据，做简单汇总与浏览。
import { computed, onMounted, ref } from 'vue';

interface Ledger {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  createdAt: number;
}
interface Transaction {
  id: string;
  ledgerId: string;
  type: 'income' | 'expense';
  amount: number; // 分
  categoryId: string;
  accountId: string;
  date: string;
  note: string;
  fuelType?: string;
  km?: number;
}
interface Category {
  id: string;
  ledgerId: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  isFuel?: boolean;
}
interface Account {
  id: string;
  ledgerId: string;
  name: string;
  icon: string;
}
interface Trip {
  id: string;
  ledgerId: string;
  date: string;
  km: number;
  liters: number;
}
interface Setting {
  id: string;
  oilPrice: number;
  oilProvince: string;
  oilGrade: string;
}

const ledgers = ref<Ledger[]>([]);
const transactions = ref<Transaction[]>([]);
const categories = ref<Category[]>([]);
const accounts = ref<Account[]>([]);
const trips = ref<Trip[]>([]);
const settings = ref<Setting | null>(null);
const selectedLedgerId = ref('');
const loading = ref(true);
const error = ref('');

function fmt(fen: number): string {
  return '¥' + (fen / 100).toFixed(2);
}

const currentLedger = computed(() => ledgers.value.find((l) => l.id === selectedLedgerId.value) ?? null);

const ledgerTransactions = computed(() =>
  transactions.value.filter((t) => t.ledgerId === selectedLedgerId.value),
);
const ledgerTrips = computed(() => trips.value.filter((t) => t.ledgerId === selectedLedgerId.value));

const totals = computed(() => {
  let income = 0;
  let expense = 0;
  for (const t of ledgerTransactions.value) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
});

const catName = (id: string) => categories.value.find((c) => c.id === id)?.name ?? '未分类';
const accName = (id: string) => accounts.value.find((a) => a.id === id)?.name ?? '';

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [ls, txs, cats, accs, trps, sts] = await Promise.all([
      fetch('/api/ledgers').then((r) => r.json()),
      fetch('/api/transactions').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/trips').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]);
    ledgers.value = ls ?? [];
    transactions.value = txs ?? [];
    categories.value = cats ?? [];
    accounts.value = accs ?? [];
    trips.value = trps ?? [];
    settings.value = sts ?? null;
    if (ledgers.value.length > 0 && !selectedLedgerId.value) {
      selectedLedgerId.value = ledgers.value[0].id;
    }
  } catch (e) {
    error.value = '加载失败：' + (e instanceof Error ? e.message : '未知错误');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="wrap">
    <header class="topbar">
      <h1>记账本 · 电脑端</h1>
      <button class="refresh" @click="load">刷新</button>
    </header>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="hint">加载中…</div>

    <template v-else>
      <div v-if="ledgers.length === 0" class="empty">
        暂无数据 —— 先在手机端「我的 → 数据备份 → 同步到电脑」，再点刷新。
      </div>

      <template v-else>
        <div class="tabs">
          <button
            v-for="l in ledgers"
            :key="l.id"
            :class="{ active: l.id === selectedLedgerId }"
            @click="selectedLedgerId = l.id"
          >
            {{ l.icon }} {{ l.name }}
          </button>
        </div>

        <div v-if="currentLedger" class="summary">
          <div><span>收入</span><b class="income">{{ fmt(totals.income) }}</b></div>
          <div><span>支出</span><b class="expense">{{ fmt(totals.expense) }}</b></div>
          <div><span>结余</span><b>{{ fmt(totals.balance) }}</b></div>
          <div><span>笔数</span><b>{{ ledgerTransactions.length }}</b></div>
        </div>

        <div v-if="currentLedger?.type === 'vehicle'" class="panel">
          <div class="panel-title">用车信息</div>
          <div class="row" v-if="settings">
            当前油价：{{ settings.oilPrice > 0 ? settings.oilPrice + ' 元/升（' + settings.oilProvince + ' · ' + settings.oilGrade + '）' : '未设置' }}
          </div>
          <div class="row" v-if="ledgerTrips.length > 0">
            行驶记录 {{ ledgerTrips.length }} 条 · 累计 {{ ledgerTrips.reduce((s, t) => s + t.km, 0).toFixed(1) }} km · {{ ledgerTrips.reduce((s, t) => s + t.liters, 0).toFixed(1) }} L
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">流水明细</div>
          <table v-if="ledgerTransactions.length > 0">
            <thead>
              <tr><th>日期</th><th>类型</th><th>分类</th><th>账户</th><th>备注</th><th class="num">金额</th></tr>
            </thead>
            <tbody>
              <tr v-for="t in ledgerTransactions" :key="t.id">
                <td>{{ t.date }}</td>
                <td><span class="badge" :class="t.type">{{ t.type === 'income' ? '收入' : '支出' }}</span></td>
                <td>{{ catName(t.categoryId) }}</td>
                <td>{{ accName(t.accountId) }}</td>
                <td class="note">{{ t.fuelType ? t.fuelType + (t.km != null ? ' · ' + t.km + 'km' : '') : '' }} {{ t.note }}</td>
                <td class="num" :class="t.type">{{ t.type === 'expense' ? '-' : '+' }}{{ fmt(t.amount) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="hint">暂无流水</div>
        </div>
      </template>
    </template>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  --bg: #f5f6f8;
  --card: #fff;
  --border: #e5e7eb;
  --text: #1f2937;
  --muted: #6b7280;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; background: var(--bg); color: var(--text); }
.wrap { max-width: 860px; margin: 0 auto; padding: 16px; }
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.topbar h1 { font-size: 20px; margin: 0; }
.refresh { border: 1px solid var(--border); background: var(--card); border-radius: 8px; padding: 6px 14px; cursor: pointer; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.tabs button { border: 1px solid var(--border); background: var(--card); border-radius: 8px; padding: 6px 14px; cursor: pointer; }
.tabs button.active { background: #22c55e; color: #fff; border-color: #22c55e; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.summary > div { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
.summary span { display: block; color: var(--muted); font-size: 12px; }
.summary b { font-size: 18px; }
.income { color: #16a34a; }
.expense { color: #dc2626; }
.panel { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.panel-title { font-weight: 600; margin-bottom: 10px; }
.row { color: var(--muted); font-size: 14px; margin-bottom: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--border); }
th { color: var(--muted); font-weight: 500; }
.num { text-align: right; }
.note { color: var(--muted); }
.badge { padding: 2px 8px; border-radius: 6px; font-size: 12px; }
.badge.income { background: #16a34a22; color: #16a34a; }
.badge.expense { background: #dc262622; color: #dc2626; }
.empty, .hint, .error { color: var(--muted); padding: 24px 0; text-align: center; }
.error { color: #dc2626; }
</style>
