import Dexie, { type Table } from 'dexie';
import type { Ledger, Transaction, Category, Account, AppSettings, TripRecord } from '@shared/types';

// 本地数据库封装（基于 IndexedDB）。Dexie 自动管理表结构与索引。
export class BookkeepingDB extends Dexie {
  ledgers!: Table<Ledger, string>;
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;
  settings!: Table<AppSettings, string>;
  trips!: Table<TripRecord, string>;

  constructor() {
    super('bookkeeping');

    // v1：旧 schema（保留升级链；v2 重写后旧数据不再迁移）
    this.version(1).stores({
      transactions: 'id, type, date, categoryId, accountId, createdAt',
      categories: 'id, type',
      accounts: 'id',
    });

    // v2：多账本 + 加油字段（每个表都带 ledgerId 做账本隔离）
    this.version(2).stores({
      ledgers: 'id, type, createdAt',
      transactions: 'id, ledgerId, type, date, categoryId, accountId, createdAt',
      categories: 'id, ledgerId, type',
      accounts: 'id, ledgerId',
    });

    // v3：全局设置（油价配置 + 历史累计油费/里程）
    this.version(3).stores({
      ledgers: 'id, type, createdAt',
      transactions: 'id, ledgerId, type, date, categoryId, accountId, createdAt',
      categories: 'id, ledgerId, type',
      accounts: 'id, ledgerId',
      settings: 'id',
    });

    // v4：每次行驶记录（车辆账本独立模块）
    this.version(4).stores({
      ledgers: 'id, type, createdAt',
      transactions: 'id, ledgerId, type, date, categoryId, accountId, createdAt',
      categories: 'id, ledgerId, type',
      accounts: 'id, ledgerId',
      settings: 'id',
      trips: 'id, ledgerId, date, createdAt',
    });
  }
}

export const db = new BookkeepingDB();
