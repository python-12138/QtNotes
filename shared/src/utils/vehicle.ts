// 车辆账本油耗/费用计算工具（解耦版 v2）。
// 金额单位为「分」，单价「元/升」，油耗 L/100km，费用 元/km 或 元。
// 两个模块：
//   油费模块：金额 + 里程表读数 → 每公里成本（累计油钱 ÷ 总里程）
//   每次行驶模块：本次距离 + 升数 → 每次油耗 / 每次成本 / 综合油耗

import type { TripRecord } from '../types';

/** 参与油费汇总的单条记录（km 为里程表读数） */
export interface FuelRecord {
  amount: number; // 分
  km?: number; // 里程表读数（总里程）
}

/** 油费模块汇总：累计油钱 / 总里程 / 反算升数 / 每公里成本 / 价格反推平均油耗 */
export function summarizeFuel(
  records: FuelRecord[],
  baselineAmount: number,
  baselineKm: number,
  unitPrice: number,
): {
  totalAmount: number; // 累计油钱 = 基准 + Σ金额（分）
  totalKm: number; // 总里程 = max(基准里程, 最新里程表读数)
  totalLiters: number | null; // 反算升数（约）= 累计油钱 ÷ 当天单价
  avgCostPerKm: number | null; // 每公里成本（元/km）
  avgConsumption: number | null; // 平均油耗（价格反推，L/100km）
} {
  let totalAmount = baselineAmount;
  let totalKm = baselineKm;
  for (const r of records) {
    totalAmount += r.amount;
    if (r.km && r.km > 0) totalKm = Math.max(totalKm, r.km);
  }
  // 升数 = 金额(分) ÷ 100 ÷ 单价
  const totalLiters = unitPrice > 0 ? totalAmount / 100 / unitPrice : null;
  return {
    totalAmount,
    totalKm,
    totalLiters,
    avgCostPerKm: totalKm > 0 ? totalAmount / 100 / totalKm : null,
    avgConsumption: totalKm > 0 && totalLiters != null ? (totalLiters / totalKm) * 100 : null,
  };
}

/** 单次行驶统计结果 */
export interface TripStat {
  id: string;
  date: string;
  km: number;
  liters: number;
  consumption: number | null; // 本次油耗 L/100km
  cost: number | null; // 本次使用成本（元）= 升数 × 单价
}

/** 每次行驶模块汇总：累计行驶里程 / 累计升数 / 综合油耗 + 单条明细 */
export function summarizeTrips(
  trips: TripRecord[],
  unitPrice: number,
): {
  totalKm: number;
  totalLiters: number;
  avgConsumption: number | null;
  avgCostPerKm: number | null;
  list: TripStat[];
} {
  let totalKm = 0;
  let totalLiters = 0;
  const list: TripStat[] = trips.map((t) => {
    totalKm += t.km;
    totalLiters += t.liters;
    return {
      id: t.id,
      date: t.date,
      km: t.km,
      liters: t.liters,
      consumption: t.km > 0 && t.liters > 0 ? (t.liters / t.km) * 100 : null,
      cost: unitPrice > 0 && t.liters > 0 ? t.liters * unitPrice : null,
    };
  });
  return {
    totalKm,
    totalLiters,
    avgConsumption: totalKm > 0 && totalLiters > 0 ? (totalLiters / totalKm) * 100 : null,
    // 每公里使用成本 = 累计升数 × 单价 ÷ 累计行驶里程
    avgCostPerKm: totalKm > 0 && totalLiters > 0 && unitPrice > 0 ? (totalLiters * unitPrice) / totalKm : null,
    list,
  };
}

/** 格式化百公里油耗，如 "7.5 L/100km"；无有效值显示 "—" */
export function formatConsumption(v: number | null): string {
  return v === null ? '—' : `${v.toFixed(1)} L/100km`;
}

/** 格式化每公里费用，如 "0.53 元/km"；无有效值显示 "—" */
export function formatCostPerKm(v: number | null): string {
  return v === null ? '—' : `${v.toFixed(2)} 元/km`;
}
