// 同步 / 备份相关的数据结构（与实体类型分离，供 DataProvider 使用）
import type { Account, AppSettings, Category, Ledger, MealRecord, Transaction, TripRecord } from '../types';

/** 全量快照：手机端 7 张表的完整导出，也是 /api/sync 的请求体 */
export interface SyncSnapshot {
  ledgers: Ledger[];
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  trips: TripRecord[];
  meals: MealRecord[];
  settings: AppSettings[];
}

/** 同步结果（服务端 /api/sync 返回） */
export interface SyncResult {
  ledgers: number;
  transactions: number;
  categories: number;
  accounts: number;
  trips: number;
  meals: number;
  settings: number;
  syncedAt: number;
}
