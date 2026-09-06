// 电脑端数据源：fetch 服务端 MySQL 的 REST 接口，实现 DataProvider。
// 与手机端 DexieProvider 的区别：无本地存储、无同步/导入导出；所有写直接落服务端。
// 响应式：内存里维护 6 张表全量 ref，写操作成功后 reloadAll() 重拉，query* 返回的 computed 随之更新。
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { uid } from '@shared/utils/id';
import { categoriesFor, defaultAccounts } from '@shared/domain/seedDefaults';
import { DEFAULT_SETTINGS, SETTINGS_ID } from '@shared/domain/defaults';
import { initCurrentLedger } from '@shared/store/currentLedger';
import type { DataProvider } from '@shared/data/provider';
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

export class ServerProvider implements DataProvider {
  readonly capabilities = { syncToServer: false, localBackup: false };

  private ledgers = ref<Ledger[]>([]);
  private transactions = ref<Transaction[]>([]);
  private categories = ref<Category[]>([]);
  private accounts = ref<Account[]>([]);
  private trips = ref<TripRecord[]>([]);
  private settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });

  async init(): Promise<void> {
    await this.reloadAll();
    await initCurrentLedger();
  }

  // —— 一次性读取（内存缓存，已过滤软删） ——
  async listLedgers(): Promise<Ledger[]> {
    return this.ledgers.value.filter((l) => !l.deletedAt);
  }

  async listAllTransactions(): Promise<Transaction[]> {
    return this.transactions.value.filter((t) => !t.deletedAt);
  }

  // —— 响应式查询（基于内存全量 ref 过滤，返回 ComputedRef） ——
  queryLedgers(): ComputedRef<Ledger[]> {
    return computed(() => this.ledgers.value.filter((l) => !l.deletedAt));
  }

  queryTransactions(ledgerId: Ref<string>): ComputedRef<Transaction[]> {
    return computed(() =>
      this.transactions.value.filter((t) => t.ledgerId === ledgerId.value && !t.deletedAt),
    );
  }

  queryCategories(ledgerId: Ref<string>): ComputedRef<Category[]> {
    return computed(() =>
      this.categories.value.filter((c) => c.ledgerId === ledgerId.value && !c.deletedAt),
    );
  }

  queryAccounts(ledgerId: Ref<string>): ComputedRef<Account[]> {
    return computed(() =>
      this.accounts.value.filter((a) => a.ledgerId === ledgerId.value && !a.deletedAt),
    );
  }

  queryTrips(ledgerId: Ref<string>): ComputedRef<TripRecord[]> {
    return computed(() =>
      this.trips.value.filter((t) => t.ledgerId === ledgerId.value && !t.deletedAt),
    );
  }

  querySettings(): ComputedRef<AppSettings> {
    return computed(() => this.settings.value);
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
    await this.req('POST', '/api/ledgers', {
      ledger,
      categories: categoriesFor(ledger.id, type),
      accounts: defaultAccounts(ledger.id),
    });
    await this.reloadAll();
    return ledger;
  }

  async deleteLedger(id: string): Promise<void> {
    const alive = this.ledgers.value.filter((l) => !l.deletedAt).length;
    if (alive <= 1) {
      alert('至少保留一本账本');
      return;
    }
    if (!confirm('删除账本将同时删除其下所有账单，确定？')) return;
    await this.req('DELETE', `/api/ledgers/${id}`);
    await this.reloadAll();
  }

  async addCategory(c: Category): Promise<void> {
    await this.req('POST', '/api/categories', c);
    await this.reloadAll();
  }
  async deleteCategory(id: string): Promise<void> {
    await this.delWithConflict(`/api/categories/${id}`, '该分类下已有账单，无法删除');
  }
  async addAccount(a: Account): Promise<void> {
    await this.req('POST', '/api/accounts', a);
    await this.reloadAll();
  }
  async deleteAccount(id: string): Promise<void> {
    await this.delWithConflict(`/api/accounts/${id}`, '该账户下已有账单，无法删除');
  }
  async addTransaction(t: Transaction): Promise<void> {
    await this.req('POST', '/api/transactions', t);
    await this.reloadAll();
  }
  async deleteTransaction(id: string): Promise<void> {
    await this.req('DELETE', `/api/transactions/${id}`);
    await this.reloadAll();
  }
  async addTrip(t: TripRecord): Promise<void> {
    await this.req('POST', '/api/trips', t);
    await this.reloadAll();
  }
  async deleteTrip(id: string): Promise<void> {
    await this.req('DELETE', `/api/trips/${id}`);
    await this.reloadAll();
  }

  async saveSettings(patch: Partial<AppSettings>): Promise<void> {
    const merged = { ...this.settings.value, ...patch, id: SETTINGS_ID };
    await this.req('PUT', '/api/settings', merged);
    this.settings.value = merged;
  }

  async getSettings(): Promise<AppSettings> {
    return this.settings.value;
  }

  // —— 备份 / 同步：电脑端直连服务端，导入/同步不适用 ——
  async exportAll(): Promise<SyncSnapshot> {
    return {
      ledgers: this.ledgers.value,
      transactions: this.transactions.value,
      categories: this.categories.value,
      accounts: this.accounts.value,
      trips: this.trips.value,
      settings: [this.settings.value],
    };
  }
  async importAll(): Promise<void> {
    throw new Error('电脑端数据直连服务端，不支持导入');
  }
  async syncToServer(): Promise<SyncResult> {
    throw new Error('电脑端数据直连服务端，无需同步');
  }

  // —— 内部 ——
  private async reloadAll(): Promise<void> {
    const [ls, txs, cats, accs, trps, sts] = await Promise.all([
      this.req<Ledger[]>('GET', '/api/ledgers'),
      this.req<Transaction[]>('GET', '/api/transactions'),
      this.req<Category[]>('GET', '/api/categories'),
      this.req<Account[]>('GET', '/api/accounts'),
      this.req<TripRecord[]>('GET', '/api/trips'),
      this.req<AppSettings | null>('GET', '/api/settings'),
    ]);
    this.ledgers.value = ls ?? [];
    this.transactions.value = txs ?? [];
    this.categories.value = cats ?? [];
    this.accounts.value = accs ?? [];
    this.trips.value = trps ?? [];
    this.settings.value = sts ?? { ...DEFAULT_SETTINGS };
  }

  private async delWithConflict(path: string, msg: string): Promise<void> {
    const resp = await fetch(path, { method: 'DELETE' });
    if (resp.status === 409) {
      alert(msg);
      return;
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    await this.reloadAll();
  }

  private async req<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const resp = await fetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    if (resp.status === 204) return undefined as T;
    return (await resp.json()) as T;
  }
}
