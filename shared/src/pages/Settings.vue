<script setup lang="ts">
// 我的：深色模式 / 账本管理 / 分类管理 / 账户管理 / 数据备份 / 关于
// （油价配置已迁移到车辆账本的「记油费/记行驶」弹窗里，见 OilConfigModal）
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { getDataProvider, SYNC_SERVER_KEY } from '../data/provider';
import { useCategories } from '../store/useCategories';
import { useAccounts } from '../store/useAccounts';
import { useLedgers, useCurrentLedger, currentLedgerId, setCurrentLedger } from '../store/currentLedger';
import { ensureSettings } from '../store/useSettings';
import { useFoodItems } from '../store/useFoodItems';
import { uid } from '../utils/id';
import { getTheme, applyTheme, type Theme } from '../utils/theme';
import { LEDGER_TYPE_LABELS } from '../presets';
import { getDeepseekKey, setDeepseekKey } from '../utils/deepseekKey';
import { ACTIVITY_OPTIONS } from '../utils/diet';
import type { TxType } from '../types';
import type { SyncSnapshot } from '../data/types';
import { diffCandidates, mergeSnapshots } from '../utils/importDiff';
import CategoryForm from '../components/CategoryForm.vue';
import AccountForm from '../components/AccountForm.vue';
import ImportConfirmModal from '../components/ImportConfirmModal.vue';
import BodyInfoModal from '../components/BodyInfoModal.vue';

const categories = useCategories();
const accounts = useAccounts();
const ledgers = useLedgers();
const currentLedger = useCurrentLedger();
const caps = getDataProvider().capabilities;

// 饮食账本：身体信息配置（用于基础代谢 BMR）
const isDiet = computed(() => currentLedger.value?.type === 'diet');
const showBody = ref(false);
const foodItems = useFoodItems(); // 食物菜单
const showFoodForm = ref(false);
const foodName = ref('');
const foodKcal = ref(''); // 每 100g 热量
const foodCarbs = ref(''); // 每 100g 碳水
const foodProtein = ref(''); // 每 100g 蛋白质
const foodFat = ref(''); // 每 100g 脂肪

// 字符串 → 非负数字（空/非法一律 0）
function numOf(s: string): number {
  const v = parseFloat(s);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

async function addFoodItem() {
  const name = foodName.value.trim();
  const kcal = numOf(foodKcal.value);
  if (!name) {
    alert('请输入食物名');
    return;
  }
  if (kcal <= 0) {
    alert('请输入每 100g 热量');
    return;
  }
  if (foodItems.value.some((f) => f.name === name)) {
    alert('菜单已有同名食物');
    return;
  }
  await getDataProvider().addFoodItem({
    id: uid(),
    ledgerId: currentLedgerId.value,
    name,
    kcalPer100g: kcal,
    carbsPer100g: numOf(foodCarbs.value),
    proteinPer100g: numOf(foodProtein.value),
    fatPer100g: numOf(foodFat.value),
    createdAt: Date.now(),
  });
  foodName.value = '';
  foodKcal.value = '';
  foodCarbs.value = '';
  foodProtein.value = '';
  foodFat.value = '';
  showFoodForm.value = false;
}

async function deleteFoodItem(id: string) {
  if (!confirm('删除该食物？')) return;
  await getDataProvider().deleteFoodItem(id);
}
const bodySummary = computed(() => {
  const l = currentLedger.value;
  if (l?.gender == null) return '未填写';
  const activityLabel = ACTIVITY_OPTIONS.find((o) => o.value === l.activityLevel)?.label.split('（')[0] ?? '';
  const parts = [
    l.gender === 'male' ? '男' : '女',
    l.age != null ? `${l.age}岁` : '',
    l.heightCm != null ? `${l.heightCm}cm` : '',
    l.weightKg != null ? `${l.weightKg}kg` : '',
    activityLabel,
  ].filter(Boolean);
  return parts.join(' · ');
});

const catType = ref<TxType>('expense');
const theme = ref<Theme>(getTheme());
const deepseekKey = ref(getDeepseekKey()); // 饮食识别的 DeepSeek Key（存 localStorage，不进备份/同步）
const showCatForm = ref(false);
const showAccountForm = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importFileRef = ref<HTMLInputElement | null>(null);
const showImportConfirm = ref(false);
const pendingSnap = ref<SyncSnapshot | null>(null);
const pendingCandidates = ref<SyncSnapshot | null>(null);

const typeCategories = computed(() => categories.value.filter((c) => c.type === catType.value));

function toggleTheme() {
  const next: Theme = theme.value === 'light' ? 'dark' : 'light';
  theme.value = next;
  applyTheme(next);
}

// 保存 DeepSeek Key（混淆后写入 localStorage；自动去除复制时带入的多余字符）
function saveDeepseekKey() {
  const before = deepseekKey.value.trim();
  const cleaned = setDeepseekKey(deepseekKey.value);
  deepseekKey.value = cleaned; // 回填清理后的 Key，让用户看到实际存进去的内容
  if (!cleaned) {
    alert('已清除 Key');
  } else if (cleaned !== before) {
    alert('已保存（自动去除了 Key 里的多余字符，请确认末尾正确）');
  } else {
    alert('已保存');
  }
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

// 读文件并校验，返回 6 张表快照；失败或格式错误时 alert 并返回 null
function readSnapshot(file: File): Promise<SyncSnapshot | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
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
        resolve({
          ledgers: data.ledgers,
          transactions: data.transactions,
          categories: data.categories,
          accounts: data.accounts,
          trips: Array.isArray(data.trips) ? data.trips : [],
          meals: Array.isArray(data.meals) ? data.meals : [],
          foodItems: Array.isArray(data.foodItems) ? data.foodItems : [],
          settings: Array.isArray(data.settings) ? data.settings : [],
        });
      } catch (e) {
        alert('导入失败：' + (e instanceof Error ? e.message : '未知错误'));
        resolve(null);
      }
    };
    reader.onerror = () => {
      alert('读取文件失败');
      resolve(null);
    };
    reader.readAsText(file);
  });
}

// 导入后的收尾：确保设置存在、恢复当前账本、提示成功
async function doImport(snap: SyncSnapshot) {
  try {
    await getDataProvider().importAll(snap);
    await ensureSettings();
    const saved = currentLedgerId.value;
    const list = await getDataProvider().listLedgers();
    if (!list.some((l) => l.id === saved)) {
      setCurrentLedger(list[0]?.id ?? '');
    }
    alert('导入成功');
  } catch (e) {
    alert('导入失败：' + (e instanceof Error ? e.message : '未知错误'));
  }
}

async function onImportFile(file: File) {
  const snap = await readSnapshot(file);
  if (!snap) return;

  if (caps.fileImport) {
    // 电脑端：对比现状，行级勾选确认要删除的数据
    const current = await getDataProvider().exportAll();
    const candidates = diffCandidates(current, snap);
    const hasCandidates = Object.values(candidates).some((arr) => arr.length > 0);
    if (!hasCandidates) {
      await doImport(snap);
      return;
    }
    pendingSnap.value = snap;
    pendingCandidates.value = candidates;
    showImportConfirm.value = true;
  } else {
    // 手机端：确认后覆盖本机
    if (!confirm('导入将覆盖当前所有数据，确定继续？')) return;
    await doImport(snap);
  }
}

function onConfirmImport(retained: SyncSnapshot) {
  showImportConfirm.value = false;
  const base = pendingSnap.value;
  if (!base) return;
  pendingSnap.value = null;
  pendingCandidates.value = null;
  doImport(mergeSnapshots(base, retained));
}

function onCancelImport() {
  showImportConfirm.value = false;
  pendingSnap.value = null;
  pendingCandidates.value = null;
}

// 提示输入电脑端服务地址并保存，返回规范化后的 base（取消或留空返回 null）
function promptServer(): string | null {
  const saved = localStorage.getItem(SYNC_SERVER_KEY) ?? '';
  const server = window.prompt('电脑端服务地址（如 http://192.168.1.100:5000）', saved);
  if (server == null) return null; // 取消
  const base = server.trim().replace(/\/+$/, '');
  if (!base) return null;
  localStorage.setItem(SYNC_SERVER_KEY, base);
  return base;
}

// —— 同步到电脑（单向备份：手机 → 电脑端服务）——
async function syncToServer() {
  if (promptServer() == null) return;
  try {
    const r = await getDataProvider().syncToServer();
    alert(
      `同步成功！\n账本 ${r.ledgers} · 流水 ${r.transactions} · 分类 ${r.categories} · 账户 ${r.accounts} · 行驶 ${r.trips} · 饮食 ${r.meals}`,
    );
  } catch (e) {
    alert('同步失败：' + (e instanceof Error ? e.message : '请确认电脑端服务已启动、且手机与电脑在同一局域网'));
  }
}

// —— 从电脑还原（反向：电脑端服务 → 手机，覆盖本机）——
async function restoreFromServer() {
  if (promptServer() == null) return;
  if (!confirm('从电脑还原将覆盖本机所有数据，确定继续？')) return;
  try {
    const r = await getDataProvider().restoreFromServer();
    await ensureSettings();
    const cur = currentLedgerId.value;
    const list = await getDataProvider().listLedgers();
    if (!list.some((l) => l.id === cur)) setCurrentLedger(list[0]?.id ?? '');
    alert(
      `还原成功！\n账本 ${r.ledgers} · 流水 ${r.transactions} · 分类 ${r.categories} · 账户 ${r.accounts} · 行驶 ${r.trips} · 饮食 ${r.meals}`,
    );
  } catch (e) {
    alert('还原失败：' + (e instanceof Error ? e.message : '请确认电脑端服务已启动、且手机与电脑在同一局域网'));
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
          <span class="manage-name">{{ l.name }}（{{ LEDGER_TYPE_LABELS[l.type] }}）</span>
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
      <button type="button" class="btn btn-block btn-danger" @click="restoreFromServer">从电脑还原</button>
      <p class="hint" style="margin-top: 6px">需先在电脑端启动服务（见 server/ 目录），手机与电脑连同一 Wi-Fi。</p>
      <input
        ref="fileInputRef"
        type="file"
        accept="application/json,.json"
        style="display: none"
        @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) onImportFile(f); (e.target as HTMLInputElement).value = ''; }"
      />
    </div>

    <div v-if="caps.fileImport" class="card">
      <div class="section-title">数据备份</div>
      <p class="hint">电脑端数据直连服务端。可导出 JSON 备份，或导入手机端导出的 JSON 文件覆盖服务端。</p>
      <div class="btn-row">
        <button type="button" class="btn" @click="exportData">导出数据</button>
        <button type="button" class="btn btn-primary" @click="importFileRef?.click()">导入 JSON 文件</button>
      </div>
      <input
        ref="importFileRef"
        type="file"
        accept="application/json,.json"
        style="display: none"
        @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) onImportFile(f); (e.target as HTMLInputElement).value = ''; }"
      />
    </div>

    <div v-if="isDiet" class="card">
      <div class="section-title">身体信息</div>
      <div class="setting-row" @click="showBody = true">
        <span>身高 / 体重 / 年龄</span>
        <span class="setting-value">{{ bodySummary }} ▸</span>
      </div>
    </div>

    <div v-if="isDiet" class="card">
      <div class="section-title">食物菜单</div>
      <p class="hint">识别过的食物按每 100g 营养存成菜单，记饭时可直接选、按克数折算。</p>
      <ul class="manage-list">
        <li v-for="f in foodItems" :key="f.id" class="manage-item">
          <span class="manage-name">{{ f.name }}</span>
          <span class="food-meta">{{ f.kcalPer100g }} kcal/100g</span>
          <button type="button" class="icon-btn danger" @click="deleteFoodItem(f.id)">🗑</button>
        </li>
      </ul>
      <div v-if="showFoodForm" class="food-form">
        <input v-model="foodName" type="text" class="text-input" placeholder="食物名（如 米饭）" />
        <div class="diet-macro-grid">
          <label class="macro-field">
            <span class="macro-label">热量/100g</span>
            <input v-model="foodKcal" class="text-input" type="number" inputmode="decimal" placeholder="kcal" />
          </label>
          <label class="macro-field">
            <span class="macro-label">碳水/100g</span>
            <input v-model="foodCarbs" class="text-input" type="number" inputmode="decimal" placeholder="g" />
          </label>
          <label class="macro-field">
            <span class="macro-label">蛋白质/100g</span>
            <input v-model="foodProtein" class="text-input" type="number" inputmode="decimal" placeholder="g" />
          </label>
          <label class="macro-field">
            <span class="macro-label">脂肪/100g</span>
            <input v-model="foodFat" class="text-input" type="number" inputmode="decimal" placeholder="g" />
          </label>
        </div>
        <button type="button" class="btn btn-primary btn-block" @click="addFoodItem">保存到菜单</button>
      </div>
      <button type="button" class="btn btn-block" @click="showFoodForm = !showFoodForm">
        {{ showFoodForm ? '取消' : '＋ 手动添加食物' }}
      </button>
    </div>

    <div class="card">
      <div class="section-title">饮食识别（DeepSeek）</div>
      <p class="hint">在「饮食账本」拍照识别碳蛋脂/热量时需要。Key 仅存本机浏览器，不进代码、不进备份，只对你可见。</p>
      <input
        v-model="deepseekKey"
        type="password"
        class="text-input"
        placeholder="粘贴 DeepSeek API Key（sk-…）"
        autocomplete="off"
      />
      <button type="button" class="btn btn-primary btn-block" @click="saveDeepseekKey">保存 Key</button>
    </div>

    <div class="card about">
      <div class="section-title">关于</div>
      <p class="hint">记账本 · 纯本地记账 PWA</p>
      <p class="hint">数据存本机，可同步到你自己的电脑服务端（不出局域网）。</p>
    </div>

    <CategoryForm v-if="showCatForm" :type="catType" @cancel="showCatForm = false" @save="addCategory" />
    <AccountForm v-if="showAccountForm" @cancel="showAccountForm = false" @save="addAccount" />
    <ImportConfirmModal
      v-if="showImportConfirm && pendingCandidates"
      :candidates="pendingCandidates"
      @confirm="onConfirmImport"
      @cancel="onCancelImport"
    />
    <BodyInfoModal v-if="showBody" @close="showBody = false" />
  </div>
</template>
