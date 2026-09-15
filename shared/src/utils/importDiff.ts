// 导入差异对比（纯函数，不依赖 Vue）：
// - diffCandidates：找出「电脑端有、手机文件里没有」的存活行——这些是覆盖导入后会被删除的候选。
// - mergeSnapshots：把用户选择保留的电脑端独有行并回手机快照，再交给 /api/import 覆盖重建。
import type { SyncSnapshot } from '../data/types';

interface Row {
  id: string;
  deletedAt?: number;
}

/** 候选删除 = current 中 id 不在 snap 存活行 id 集合里的行 */
export function diffCandidates(current: SyncSnapshot, snap: SyncSnapshot): SyncSnapshot {
  return {
    ledgers: diffTable(current.ledgers, snap.ledgers),
    transactions: diffTable(current.transactions, snap.transactions),
    categories: diffTable(current.categories, snap.categories),
    accounts: diffTable(current.accounts, snap.accounts),
    trips: diffTable(current.trips, snap.trips),
    meals: diffTable(current.meals, snap.meals),
    settings: diffTable(current.settings, snap.settings),
  };
}

function diffTable<T extends Row>(cur: T[], inc: T[]): T[] {
  const aliveIds = new Set(inc.filter((x) => x.deletedAt == null).map((x) => x.id));
  return cur.filter((x) => !aliveIds.has(x.id));
}

/** 合并：手机快照 + 保留的电脑端独有行（每张表拼接） */
export function mergeSnapshots(snap: SyncSnapshot, retained: SyncSnapshot): SyncSnapshot {
  return {
    ledgers: [...snap.ledgers, ...retained.ledgers],
    transactions: [...snap.transactions, ...retained.transactions],
    categories: [...snap.categories, ...retained.categories],
    accounts: [...snap.accounts, ...retained.accounts],
    trips: [...snap.trips, ...retained.trips],
    meals: [...snap.meals, ...retained.meals],
    settings: [...snap.settings, ...retained.settings],
  };
}
