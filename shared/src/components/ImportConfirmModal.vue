<script setup lang="ts">
// 导入确认弹窗：逐条列出「电脑端有、手机文件里没有」的数据，勾选 = 删除，取消勾选 = 保留。
import { computed, ref } from 'vue';
import type { SyncSnapshot } from '../data/types';
import { formatMoney } from '../utils/money';

const props = defineProps<{ candidates: SyncSnapshot }>();
const emit = defineEmits<{
  (e: 'confirm', retained: SyncSnapshot): void;
  (e: 'cancel'): void;
}>();

type Table = keyof SyncSnapshot;

interface Item {
  key: string;
  table: Table;
  label: string;
  checked: boolean;
  row: unknown;
}

const GROUPS: { table: Table; title: string }[] = [
  { table: 'ledgers', title: '账本' },
  { table: 'transactions', title: '流水' },
  { table: 'categories', title: '分类' },
  { table: 'accounts', title: '账户' },
  { table: 'trips', title: '行驶记录' },
  { table: 'meals', title: '饮食记录' },
  { table: 'foodItems', title: '食物菜单' },
  { table: 'settings', title: '设置' },
];

function labelOf(table: Table, row: any): string {
  switch (table) {
    case 'ledgers':
      return `账本「${row.name}」`;
    case 'transactions':
      return `流水 ${row.date} ${row.note || '无备注'} · ¥${formatMoney(row.amount)}`;
    case 'categories':
      return `分类「${row.name}」`;
    case 'accounts':
      return `账户「${row.name}」`;
    case 'trips':
      return `行驶 ${row.date} · ${row.km}km ${row.liters}L`;
    case 'meals':
      return `饮食 ${row.date} · ${row.summary || '未命名'} ${row.kcal}kcal`;
    case 'foodItems':
      return `食物「${row.name}」 ${row.kcalPer100g}kcal/100g`;
    case 'settings':
      return '设置';
  }
}

const items = ref<Item[]>(buildItems());
function buildItems(): Item[] {
  const list: Item[] = [];
  for (const g of GROUPS) {
    for (const row of props.candidates[g.table] as any[]) {
      list.push({
        key: `${g.table}:${row.id}`,
        table: g.table,
        label: labelOf(g.table, row),
        checked: true,
        row,
      });
    }
  }
  return list;
}

const grouped = computed(() =>
  GROUPS.map((g) => ({ ...g, rows: items.value.filter((i) => i.table === g.table) })).filter(
    (g) => g.rows.length > 0,
  ),
);

const total = computed(() => items.value.length);
const checkedCount = computed(() => items.value.filter((i) => i.checked).length);
const allChecked = computed(() => checkedCount.value === total.value);

function toggleAll() {
  const target = !allChecked.value;
  items.value.forEach((i) => (i.checked = target));
}

function confirmImport() {
  const retained: SyncSnapshot = {
    ledgers: [],
    transactions: [],
    categories: [],
    accounts: [],
    trips: [],
    meals: [],
    foodItems: [],
    settings: [],
  };
  for (const i of items.value) {
    if (!i.checked) (retained[i.table] as any[]).push(i.row);
  }
  emit('confirm', retained);
}
</script>

<template>
  <div class="modal-mask" @click="emit('cancel')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <span>确认删除</span>
        <button type="button" class="icon-btn" @click="emit('cancel')">✕</button>
      </div>
      <div class="modal-body">
        <p class="hint" style="margin-top: 0">以下数据在手机文件中不存在，导入后将被删除。取消勾选可保留。</p>
        <label class="imp-select-all">
          <input type="checkbox" :checked="allChecked" @change="toggleAll" />
          <span>全选（{{ checkedCount }}/{{ total }}）</span>
        </label>
        <div class="imp-groups">
          <div v-for="g in grouped" :key="g.table" class="imp-group">
            <div class="imp-group-title">{{ g.title }}（{{ g.rows.length }}）</div>
            <label v-for="row in g.rows" :key="row.key" class="imp-item">
              <input type="checkbox" v-model="row.checked" />
              <span>{{ row.label }}</span>
            </label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" @click="emit('cancel')">取消</button>
        <button type="button" class="btn btn-primary" @click="confirmImport">确认导入</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.imp-select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}
.imp-select-all input,
.imp-item input {
  flex: none;
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
}
.imp-group {
  margin-bottom: 12px;
}
.imp-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.imp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 14px;
  color: var(--text);
}
.imp-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
