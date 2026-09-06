// 数据访问层统一接口：把「领域逻辑 + UI」与具体数据源解耦。
// 手机端 = DexieProvider（IndexedDB）；电脑端 = ServerProvider（fetch 服务端 MySQL）。
// store / 页面 / 组件一律通过 getDataProvider() 访问数据，不直接 import 具体数据源。
import type { ComputedRef, Ref } from 'vue';
import type { Account, AppSettings, Category, Ledger, LedgerType, Transaction, TripRecord } from '../types';
import type { SyncResult, SyncSnapshot } from './types';

export interface DataProvider {
  /** 能力标记：控制「同步到电脑 / 导出导入」等 UI 是否显示 */
  readonly capabilities: {
    syncToServer: boolean; // 手机端 true / 电脑端 false
    localBackup: boolean; // 手机端 true / 电脑端 false
  };

  /** 初始化：建默认账本、确保设置行存在、恢复当前账本 */
  init(): Promise<void>;

  // —— 一次性读取 ——
  listLedgers(): Promise<Ledger[]>;
  /** 跨账本全部流水（分类/账户「是否被引用」计数用） */
  listAllTransactions(): Promise<Transaction[]>;

  // —— 响应式查询（返回 ComputedRef） ——
  queryLedgers(): ComputedRef<Ledger[]>;
  queryTransactions(ledgerId: Ref<string>): ComputedRef<Transaction[]>;
  queryCategories(ledgerId: Ref<string>): ComputedRef<Category[]>;
  queryAccounts(ledgerId: Ref<string>): ComputedRef<Account[]>;
  queryTrips(ledgerId: Ref<string>): ComputedRef<TripRecord[]>;
  querySettings(): ComputedRef<AppSettings>;

  // —— 写（实体对象由调用方构造好 id/createdAt 后传入） ——
  createLedger(name: string, type: LedgerType): Promise<Ledger>;
  deleteLedger(id: string): Promise<void>;
  addCategory(c: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  addAccount(a: Account): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  addTransaction(t: Transaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  addTrip(t: TripRecord): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  saveSettings(patch: Partial<AppSettings>): Promise<void>;
  getSettings(): Promise<AppSettings>;

  // —— 备份 / 同步（手机端专用；电脑端实现抛「不支持」） ——
  exportAll(): Promise<SyncSnapshot>;
  importAll(s: SyncSnapshot): Promise<void>;
  syncToServer(): Promise<SyncResult>;
}

/** 手机端「同步到电脑」服务地址的 localStorage key（电脑端无同步，不使用） */
export const SYNC_SERVER_KEY = 'qtnotes-sync-server';

let _provider: DataProvider | null = null;

/** 注入数据源（必须在应用挂载前调用一次） */
export function setDataProvider(p: DataProvider): void {
  _provider = p;
}

/** 获取数据源；未注入时抛错（store 在 setup 期才调用，模块 import 期不触发） */
export function getDataProvider(): DataProvider {
  if (!_provider) throw new Error('DataProvider 未初始化：请在应用挂载前调用 setDataProvider');
  return _provider;
}
