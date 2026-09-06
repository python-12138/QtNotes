<script setup lang="ts">
// 我的：深色模式 / 账本管理 / 分类管理 / 账户管理 / 数据备份 / 关于
// （油价配置已迁移到车辆账本的「记油费/记行驶」弹窗里，见 OilConfigModal）
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { getDataProvider, SYNC_SERVER_KEY } from '../data/provider';
import { useCategories } from '../store/useCategories';
import { useAccounts } from '../store/useAccounts';
import { useLedgers, currentLedgerId, setCurrentLedger } from '../store/currentLedger';
import { ensureSettings } from '../store/useSettings';
import { uid } from '../utils/id';
import { getTheme, applyTheme, type Theme } from '../utils/theme';
import type { TxType } from '../types';
import CategoryForm from '../components/CategoryForm.vue';
import AccountForm from '../components/AccountForm.vue';

const categories = useCategories();
const accounts = useAccounts();
const ledgers = useLedgers();
const caps = getDataProvider().capabilities;

const catType = ref<TxType>('expense');
const theme = ref<Theme>(getTheme());
const showCatForm = ref(false);
const showAccountForm = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const typeCategories = computed(() => categories.value.filter((c) => c.type === catType.value));

function toggleTheme() {
  const next: Theme = theme.value === 'light' ? 'dark' : 'light';
  theme.value = next;
  applyTheme(next);
}

// —— 分类 ——
async function addCategory(data: { name: string; icon: string; color: string }) {
  await getDataProvider().addCategory({
    id: uid(),
    ledgerId: currentLedgerId.value,
    name: data.name,
    type: catType.value,
    icon: data.icon,
    color: data.color,
    isDefault: false,
  });
  showCatForm.value = false;
}

async function deleteCategory(id: string) {
  const c = categories.value.find((x) => x.id === id);
  if (c?.protected) {
    alert('系统分类，不能删除');
    return;
  }
  const all = await getDataProvider().listAllTransactions();
  const used = all.filter((t) => t.categoryId === id).length;
  if (used > 0) {
    alert('该分类下已有账单，无法删除');
    return;
  }
  if (!confirm('确定删除该分类？')) return;
  await getDataProvider().deleteCategory(id);
}

// —— 账户 ——
async function addAccount(data: { name: string; icon: string }) {
  await getDataProvider().addAccount({
    id: uid(),
    ledgerId: currentLedgerId.value,
    name: data.name,
    icon: data.icon,
  });
  showAccountForm.value = false;
}

async function deleteAccount(id: string) {
  const all = await getDataProvider().listAllTransactions();
  const used = all.filter((t) => t.accountId === id).length;
  if (used > 0) {
    alert('该账户下已有账单，无法删除');
    return;
  }
  if (!confirm('确定删除该账户？')) return;
  await getDataProvider().deleteAccount(id);
}

// —— 账本 ——
async function onDeleteLedger(id: string) {
  await getDataProvider().deleteLedger(id);
  const list = await getDataProvider().listLedgers();
  if (!list.some((l) => l.id === currentLedgerId.value)) {
    setCurrentLedger(list[0]?.id ?? '');
  }
}

// —— 备份 ——
async function exportData() {
  const snap = await getDataProvider().exportAll();
  const data = {
    app: 'bookkeeping-pwa',
    version: 4,
    exportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    ...snap,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `记账备份-${dayjs().format('YYYYMMDD-HHmm')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function onImportFile(file: File) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (
        !Array.isArray(data.ledgers) ||
        !Array.isArray(data.transactions) ||
        !Array.isArray(data.categories) ||
        !Array.isArray(data.accounts)
      ) {
        throw new Error('文件格式不正确');
      }
      if (!confirm('导入将覆盖当前所有数据，确定继续？')) return;
      await getDataProvider().importAll({
        ledgers: data.ledgers,
        transactions: data.transactions,
        categories: data.categories,
        accounts: data.accounts,
        trips: Array.isArray(data.trips) ? data.trips : [],
        settings: Array.isArray(data.settings) ? data.settings : [],
      });
      await ensureSettings();
      // 恢复当前账本
      const saved = currentLedgerId.value;
      const list = await getDataProvider().listLedgers();
      if (!list.some((l) => l.id === saved)) {
        setCurrentLedger(list[0]?.id ?? '');
      }
      alert('导入成功');
    } catch (e) {
      alert('导入失败：' + (e instanceof Error ? e.message : '未知错误'));
    }
  };
  reader.readAsText(file);
}

// —— 同步到电脑（单向备份：手机 → 电脑端服务）——
async function syncToServer() {
  const saved = localStorage.getItem(SYNC_SERVER_KEY) ?? '';
  const server = window.prompt('电脑端服务地址（如 http://192.168.1.100:5000）', saved);
  if (server == null) return; // 取消
  const base = server.trim().replace(/\/+$/, '');
  if (!base) return;
  localStorage.setItem(SYNC_SERVER_KEY, base);

  try {
    const r = await getDataProvider().syncToServer();
    alert(
      `同步成功！\n账本 ${r.ledgers} · 流水 ${r.transactions} · 分类 ${r.categories} · 账户 ${r.accounts} · 行驶 ${r.trips}`,
    );
  } catch (e) {
    alert('同步失败：' + (e instanceof Error ? e.message : '请确认电脑端服务已启动、且手机与电脑在同一局域网'));
  }
}
</script>

<template>
  <div class="page settings">
    <header class="page-header"><h1>我的</h1></header>

    <div class="card">
      <div class="setting-row" @click="toggleTheme">
        <span>深色模式</span>
        <span class="switch" :class="{ 'switch-on': theme === 'dark' }" role="switch" :aria-checked="theme === 'dark'">
          <span class="switch-thumb" :class="{ on: theme === 'dark' }" />
        </span>
      </div>
    </div>

    <div class="card">
      <div class="section-title">账本管理</div>
      <ul class="manage-list">
        <li v-for="l in ledgers" :key="l.id" class="manage-item">
          <span class="tx-icon" :style="{ background: `${l.color}22`, color: l.color }">{{ l.icon }}</span>
          <span class="manage-name">{{ l.name }}（{{ l.type === 'vehicle' ? '用车' : '普通' }}）</span>
          <button
            v-if="ledgers.length > 1"
            type="button"
            class="icon-btn danger"
            @click="onDeleteLedger(l.id)"
          >
            🗑
          </button>
        </li>
      </ul>
    </div>

    <div class="card">
      <div class="section-title">分类管理</div>
      <div class="filter-tabs">
        <button type="button" :class="{ active: catType === 'expense' }" @click="catType = 'expense'">支出</button>
        <button type="button" :class="{ active: catType === 'income' }" @click="catType = 'income'">收入</button>
      </div>
      <ul class="manage-list">
        <li v-for="c in typeCategories" :key="c.id" class="manage-item">
          <span class="tx-icon" :style="{ background: `${c.color}22`, color: c.color }">{{ c.icon }}</span>
          <span class="manage-name">{{ c.name }}</span>
          <span v-if="c.protected" class="lock-mark" title="系统分类，不能删除">🔒</span>
          <button type="button" class="icon-btn danger" @click="deleteCategory(c.id)">🗑</button>
        </li>
      </ul>
      <button type="button" class="btn btn-block" @click="showCatForm = true">＋ 添加分类</button>
    </div>

    <div class="card">
      <div class="section-title">账户管理</div>
      <ul class="manage-list">
        <li v-for="a in accounts" :key="a.id" class="manage-item">
          <span class="tx-icon">{{ a.icon }}</span>
          <span class="manage-name">{{ a.name }}</span>
          <button type="button" class="icon-btn danger" @click="deleteAccount(a.id)">🗑</button>
        </li>
      </ul>
      <button type="button" class="btn btn-block" @click="showAccountForm = true">＋ 添加账户</button>
    </div>

    <div v-if="caps.localBackup" class="card">
      <div class="section-title">数据备份</div>
      <p class="hint">数据保存在本机浏览器中，建议定期导出备份，换设备时可用导入恢复。</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" @click="exportData">导出数据</button>
        <button type="button" class="btn" @click="fileInputRef?.click()">导入数据</button>
      </div>
      <button type="button" class="btn btn-block" @click="syncToServer">同步到电脑</button>
      <p class="hint" style="margin-top: 6px">需先在电脑端启动服务（见 server/ 目录），手机与电脑连同一 Wi-Fi。</p>
      <input
        ref="fileInputRef"
        type="file"
        accept="application/json,.json"
        style="display: none"
        @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) onImportFile(f); (e.target as HTMLInputElement).value = ''; }"
      />
    </div>

    <div class="card about">
      <div class="section-title">关于</div>
      <p class="hint">记账本 · 纯本地记账 PWA</p>
      <p class="hint">数据存本机，可同步到你自己的电脑服务端（不出局域网）。</p>
    </div>

    <CategoryForm v-if="showCatForm" :type="catType" @cancel="showCatForm = false" @save="addCategory" />
    <AccountForm v-if="showAccountForm" @cancel="showAccountForm = false" @save="addAccount" />
  </div>
</template>
