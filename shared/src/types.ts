// 数据模型类型定义：账本、流水、分类、账户。
// 金额统一以「分」（整数）存储，避免浮点误差。

/** 收支类型 */
export type TxType = 'income' | 'expense';

/** 账本类型：general 普通账本 / vehicle 用车费用 */
export type LedgerType = 'general' | 'vehicle';

/** 底部导航的四个标签页 */
export type Tab = 'home' | 'records' | 'stats' | 'settings';

/** 账本（一本账一个独立记账空间） */
export interface Ledger {
  id: string;
  name: string;
  type: LedgerType;
  icon: string; // emoji
  color: string; // hex
  createdAt: number;
  deletedAt?: number; // 软删除墓碑（毫秒时间戳），用于多端同步
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
  deletedAt?: number; // 软删除墓碑
  // —— 加油记录专用字段（仅车辆账本「油费」分类时才有）——
  fuelType?: string; // 油号：92# / 95# / 98# / 柴油 / 充电 …
  km?: number; // 加油时里程表读数（总里程 km）
}

/** 每次行驶记录（车辆账本独立模块：本次距离 + 升数） */
export interface TripRecord {
  id: string;
  ledgerId: string;
  date: string; // 'YYYY-MM-DD'
  km: number; // 本次行驶距离（km）
  liters: number; // 本次使用升数（L）
  createdAt: number; // 时间戳（毫秒）
  deletedAt?: number; // 软删除墓碑
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
  deletedAt?: number; // 软删除墓碑
}

/** 账户 */
export interface Account {
  id: string;
  ledgerId: string;
  name: string;
  icon: string;
  deletedAt?: number; // 软删除墓碑
}

/** 全局设置（单行，id 固定为 'main'） */
export interface AppSettings {
  id: string;
  fuelBaselineAmount: number; // 历史累计油费（分），作为每公里费用起点
  fuelBaselineKm: number; // 历史累计总里程（km），作为每公里费用起点
  oilProvince: string; // 油价接口：省份
  oilGrade: string; // 默认油号：92# / 95# / 98# / 柴油
  oilAppId: string; // 接口 app_id
  oilAppSecret: string; // 接口 app_secret
  oilPrice: number; // 当前单价（元/升），0 表示未设置
  oilPriceUpdatedAt: number; // 最近一次获取单价的时间戳
  deletedAt?: number; // 软删除墓碑
}
