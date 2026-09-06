// 手机端数据源：IndexedDB/Dexie 实现 DataProvider 接口。
// 这是 app 里唯一直接 import `db` 与 `useLiveQuery` 的地方，其余代码一律走 getDataProvider()。
// 删除采用软删除（置 deletedAt 墓碑），读路径统一过滤墓碑行；exportAll 保留墓碑以便同步下发。
import { computed, type ComputedRef, type Ref } from 'vue';
import { db } from '../db/db';
import { useLiveQuery } from '../store/useLiveQuery';
import { uid } from '@shared/utils/id';
import { categoriesFor, defaultAccounts } from '@shared/domain/seedDefaults';
import { DEFAULT_SETTINGS, SETTINGS_ID } from '@shared/domain/defaults';
import { initCurrentLedger } from '@shared/store/currentLedger';
import { SYNC_SERVER_KEY, type DataProvider } from '@shared/data/provider';
import type { SyncSnapshot, SyncResult } from '@shared/data/types';
import type {
  Account,
  AppSettings,
  Category,
  Ledger,
  LedgerType,
  Transaction,
  TripRecord,
} from '@shared/types';

export class DexieProvider implements DataProvider {
  readonly capabilities = { syncToServer: true, localBackup: true };

  async init(): Promise<void> {
    await this.seedIfEmpty();
    await this.ensureSettings();
    await initCurrentLedger();
  }

  // —— 一次性读取（过滤软删） ——
  async listLedgers(): Promise<Ledger[]> {
    const all = await db.ledgers.toArray();
    return all.filter((l) => !l.deletedAt);
  }

  async listAllTransactions(): Promise<Transaction[]> {
    const all = await db.transactions.toArray();
    return all.filter((t) => !t.deletedAt);
  }

  // —— 响应式查询（过滤软删，返回 ComputedRef） ——
  queryLedgers(): ComputedRef<Ledger[]> {
    const list = useLiveQuery(() => db.ledgers.toArray(), []);
    return computed(() => (list.value ?? []).filter((l) => !l.deletedAt));
  }

  queryTransactions(ledgerId: Ref<string>): ComputedRef<Transaction[]> {
    const list = useLiveQuery(
      () => db.transactions.where('ledgerId').equals(ledgerId.value).toArray(),
      [ledgerId],
    );
    return computed(() => (list.value ?? []).filter((t) => !t.deletedAt));
  }

  queryCategories(ledgerId: Ref<string>): ComputedRef<Category[]> {
    const list = useLiveQuery(
      () => db.categories.where('ledgerId').equals(ledgerId.value).toArray(),
      [ledgerId],
    );
    return computed(() => (list.value ?? []).filter((c) => !c.deletedAt));
  }

  queryAccounts(ledgerId: Ref<string>): ComputedRef<Account[]> {
    const list = useLiveQuery(
      () => db.accounts.where('ledgerId').equals(ledgerId.value).toArray(),
      [ledgerId],
    );
    return computed(() => (list.value ?? []).filter((a) => !a.deletedAt));
  }

  queryTrips(ledgerId: Ref<string>): ComputedRef<TripRecord[]> {
    const list = useLiveQuery(
      () => db.trips.where('ledgerId').equals(ledgerId.value).toArray(),
      [ledgerId],
    );
    return computed(() => (list.value ?? []).filter((t) => !t.deletedAt));
  }

  querySettings(): ComputedRef<AppSettings> {
    const s = useLiveQuery(() => db.settings.get(SETTINGS_ID), []);
    return computed<AppSettings>(() => s.value ?? { ...DEFAULT_SETTINGS });
  }

  // —— 写 ——
  async createLedger(name: string, type: LedgerType): Promise<Ledger> {
    const ledger: Ledger = {
      id: uid(),
      name,
      type,
      icon: type === 'vehicle' ? '🚗' : '📒',
      color: type === 'vehicle' ? '#3b82f6' : '#22c55e',
      createdAt: Date.now(),
    };
    await db.transaction('rw', db.ledgers, db.categories, db.accounts, async () => {
      await db.ledgers.add(ledger);
      await db.categories.bulkAdd(categoriesFor(ledger.id, type));
      await db.accounts.bulkAdd(defaultAccounts(ledger.id));
    });
    return ledger;
  }

  async deleteLedger(id: string): Promise<void> {
    const alive = await db.ledgers.filter((l) => !l.deletedAt).count();
    if (alive <= 1) {
      alert('至少保留一本账本');
      return;
    }
    if (!confirm('删除账本将同时删除其下所有账单，确定？')) return;
    const now = Date.now();
    await db.transaction(
      'rw',
      [db.ledgers, db.transactions, db.categories, db.accounts, db.trips],
      async () => {
        await db.ledgers.update(id, { deletedAt: now });
        await db.transactions.where('ledgerId').equals(id).modify({ deletedAt: now });
        await db.categories.where('ledgerId').equals(id).modify({ deletedAt: now });
        await db.accounts.where('ledgerId').equals(id).modify({ deletedAt: now });
        await db.trips.where('ledgerId').equals(id).modify({ deletedAt: now });
      },
    );
  }

  async addCategory(c: Category): Promise<void> {
    await db.categories.add(c);
  }
  async deleteCategory(id: string): Promise<void> {
    await db.categories.update(id, { deletedAt: Date.now() });
  }
  async addAccount(a: Account): Promise<void> {
    await db.accounts.add(a);
  }
  async deleteAccount(id: string): Promise<void> {
    await db.accounts.update(id, { deletedAt: Date.now() });
  }
  async addTransaction(t: Transaction): Promise<void> {
    await db.transactions.add(t);
  }
  async deleteTransaction(id: string): Promise<void> {
    await db.transactions.update(id, { deletedAt: Date.now() });
  }
  async addTrip(t: TripRecord): Promise<void> {
    await db.trips.add(t);
  }
  async deleteTrip(id: string): Promise<void> {
    await db.trips.update(id, { deletedAt: Date.now() });
  }

  async saveSettings(patch: Partial<AppSettings>): Promise<void> {
    await this.ensureSettings();
    await db.settings.update(SETTINGS_ID, patch);
  }

  async getSettings(): Promise<AppSettings> {
    return this.ensureSettings();
  }

  // —— 备份 / 同步 ——
  // 注意：exportAll 保留墓碑行（deletedAt 非空），以便同步把「删除」也下发给服务端。
  async exportAll(): Promise<SyncSnapshot> {
    const [ledgers, transactions, categories, accounts, trips, settings] = await Promise.all([
      db.ledgers.toArray(),
      db.transactions.toArray(),
      db.categories.toArray(),
      db.accounts.toArray(),
      db.trips.toArray(),
      db.settings.toArray(),
    ]);
    return { ledgers, transactions, categories, accounts, trips, settings };
  }

  async importAll(s: SyncSnapshot): Promise<void> {
    await db.transaction(
      'rw',
      [db.ledgers, db.transactions, db.categories, db.accounts, db.trips, db.settings],
      async () => {
        await db.ledgers.clear();
        await db.transactions.clear();
        await db.categories.clear();
        await db.accounts.clear();
        await db.trips.clear();
        await db.settings.clear();
        await db.ledgers.bulkAdd(s.ledgers);
        await db.transactions.bulkAdd(s.transactions);
        await db.categories.bulkAdd(s.categories);
        await db.accounts.bulkAdd(s.accounts);
        if (s.trips.length) await db.trips.bulkAdd(s.trips);
        if (s.settings.length) await db.settings.bulkAdd(s.settings);
      },
    );
  }

  async syncToServer(): Promise<SyncResult> {
    const base = (localStorage.getItem(SYNC_SERVER_KEY) ?? '').trim().replace(/\/+$/, '');
    if (!base) throw new Error('未配置电脑端服务地址');
    const payload = await this.exportAll();
    const resp = await fetch(`${base}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const r = await resp.json();
    return {
      ledgers: r.ledgers ?? 0,
      transactions: r.transactions ?? 0,
      categories: r.categories ?? 0,
      accounts: r.accounts ?? 0,
      trips: r.trips ?? 0,
      settings: r.settings ?? 0,
      syncedAt: r.syncedAt ?? Date.now(),
    };
  }

  // —— 内部 ——
  private async seedIfEmpty(): Promise<void> {
    if ((await db.ledgers.count()) === 0) {
      await this.createLedger('日常账本', 'general');
    }
  }

  private async ensureSettings(): Promise<AppSettings> {
    const s = await db.settings.get(SETTINGS_ID);
    if (s) return s;
    const created = { ...DEFAULT_SETTINGS };
    await db.settings.add(created);
    return created;
  }
}
