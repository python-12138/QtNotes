// 数据模型类型定义：账本、流水、分类、账户。
// 金额统一以「分」（整数）存储，避免浮点误差。

/** 收支类型 */
export type TxType = 'income' | 'expense';

/** 账本类型：general 普通账本 / vehicle 用车费用 */
export type LedgerType = 'general' | 'vehicle';

/** 账本（一本账一个独立记账空间） */
export interface Ledger {
  id: string;
  name: string;
  type: LedgerType;
  icon: string; // emoji
  color: string; // hex
  createdAt: number;
}

/** 流水（一笔账目） */
export interface Transaction {
  id: string;
  ledgerId: string; // 所属账本
  type: TxType;
  amount: number; // 单位：分（整数）
  categoryId: string;
  accountId: string;
  date: string; // 'YYYY-MM-DD'
  note: string;
  createdAt: number; // 时间戳（毫秒）
  // —— 加油记录专用字段（仅车辆账本「油费」分类时才有）——
  fuelType?: string; // 油费类型：92# / 95# / 柴油 / 充电 …
  liters?: number; // 加油升数
  km?: number; // 行驶公里数
}

/** 分类 */
export interface Category {
  id: string;
  ledgerId: string;
  name: string;
  type: TxType;
  icon: string;
  color: string;
  isDefault: boolean;
  protected?: boolean; // 系统保护：禁止删除
  isFuel?: boolean; // 是否「油费」分类（触发油耗计算）
}

/** 账户 */
export interface Account {
  id: string;
  ledgerId: string;
  name: string;
  icon: string;
}
