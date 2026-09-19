// 数据模型类型定义：账本、流水、分类、账户。
// 金额统一以「分」（整数）存储，避免浮点误差。

/** 收支类型 */
export type TxType = 'income' | 'expense';

/** 账本类型：general 普通账本 / vehicle 用车费用 / diet 饮食账本 */
export type LedgerType = 'general' | 'vehicle' | 'diet';

/** 导航标签页 */
export type Tab = 'home' | 'records' | 'stats' | 'settings';

/** 账本（一本账一个独立记账空间） */
/** 活动量等级（饮食账本，用于 BMR → TDEE 折算） */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export interface Ledger {
  id: string;
  name: string;
  type: LedgerType;
  icon: string; // emoji
  color: string; // hex
  createdAt: number;
  deletedAt?: number; // 软删除墓碑（毫秒时间戳），用于多端同步
  // —— 饮食账本：身体信息（用于计算基础代谢 BMR 与每日总消耗 TDEE）——
  gender?: 'male' | 'female'; // 性别
  age?: number; // 年龄（岁）
  heightCm?: number; // 身高（厘米）
  weightKg?: number; // 体重（公斤）
  activityLevel?: ActivityLevel; // 活动量（缺省按久坐）
  // —— 宏量目标参数（可调，缺省用推荐值）——
  proteinPerKgNormal?: number; // 不健身蛋白质（g/kg 体重），默认 1.2
  proteinPerKgFitness?: number; // 健身蛋白质（g/kg 体重），默认 1.8
  fatRatioNormal?: number; // 不健身脂肪占比（0-1），默认 0.25
  fatRatioFitness?: number; // 健身脂肪占比（0-1），默认 0.2
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

/** 餐次类型（饮食账本一顿饭属于哪一餐） */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** 一顿饭的营养记录（饮食账本专用，独立表，不产生 Transaction） */
export interface MealRecord {
  id: string;
  ledgerId: string; // 所属账本
  date: string; // 'YYYY-MM-DD'
  mealType: MealType; // 餐次：早/午/晚/加餐
  summary: string; // 识别出的食物描述，如「米饭 + 红烧肉 + 青菜」
  carbs: number; // 碳水（克）——最终摄入值（吃之前 − 吃结束剩余）
  protein: number; // 蛋白质（克）
  fat: number; // 脂肪（克）
  kcal: number; // 热量（千卡）——最终摄入值
  image?: string; // 压缩缩略图 dataURL（吃之前照片，仅回显，丢弃原图）
  afterImage?: string; // 吃结束后照片 dataURL（选填，仅回显）
  remainingKcal?: number; // 吃结束后剩余热量（千卡），0/缺省 = 吃光
  note: string; // 备注
  createdAt: number; // 时间戳（毫秒）
  deletedAt?: number; // 软删除墓碑
}

/** 食物菜单项（饮食账本：识别过的食物按每 100g 营养沉淀，独立表） */
export interface FoodMenuItem {
  id: string;
  ledgerId: string; // 所属账本
  name: string; // 食物名，如「米饭」
  kcalPer100g: number; // 每 100g 热量（千卡）
  carbsPer100g: number; // 每 100g 碳水（克）
  proteinPer100g: number; // 每 100g 蛋白质（克）
  fatPer100g: number; // 每 100g 脂肪（克）
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
