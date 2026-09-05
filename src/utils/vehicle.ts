// 车辆账本油耗计算工具。
// 金额单位为「分」，百公里油耗单位 L/100km，每公里费用单位 元/km。

/** 单次百公里油耗 = 升数 ÷ 公里 × 100；升数或公里数无效时返回 null */
export function fuelConsumption(liters?: number, km?: number): number | null {
  if (!liters || !km || km <= 0) return null;
  return (liters / km) * 100;
}

/** 单次每公里费用（元/km）= 金额(分) ÷ 100 ÷ 公里 */
export function costPerKm(amountFen: number, km?: number): number | null {
  if (!km || km <= 0) return null;
  return amountFen / 100 / km;
}

/** 汇总多条加油记录，得到累计金额/升数/公里 + 综合油耗 + 平均每公里费用 */
export function summarizeFuel(records: { liters?: number; km?: number; amount: number }[]): {
  totalAmount: number;
  totalLiters: number;
  totalKm: number;
  avgConsumption: number | null;
  avgCostPerKm: number | null;
} {
  let liters = 0;
  let km = 0;
  let amount = 0;
  for (const r of records) {
    amount += r.amount;
    if (r.liters && r.km && r.km > 0) {
      liters += r.liters;
      km += r.km;
    }
  }
  return {
    totalAmount: amount,
    totalLiters: liters,
    totalKm: km,
    avgConsumption: fuelConsumption(liters, km),
    avgCostPerKm: costPerKm(amount, km),
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
