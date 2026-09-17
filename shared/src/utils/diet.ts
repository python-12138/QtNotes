// 饮食账本：碳蛋脂汇总与展示工具（纯函数，无数据源依赖）。
import type { MealRecord } from '../types';
import { MEAL_TYPE_OPTIONS } from '../presets';

/** 一天的营养合计（用于统计页趋势图与首页今日摄入） */
export interface DayNutrition {
  date: string; // 'YYYY-MM-DD'
  carbs: number; // 碳水（克）
  protein: number; // 蛋白质（克）
  fat: number; // 脂肪（克）
  kcal: number; // 热量（千卡）
}

/** 把一顿顿的记录聚合成按天合计（升序） */
export function summarizeMealsByDay(meals: MealRecord[]): DayNutrition[] {
  const map = new Map<string, DayNutrition>();
  for (const m of meals) {
    let d = map.get(m.date);
    if (!d) {
      d = { date: m.date, carbs: 0, protein: 0, fat: 0, kcal: 0 };
      map.set(m.date, d);
    }
    d.carbs += m.carbs;
    d.protein += m.protein;
    d.fat += m.fat;
    d.kcal += m.kcal;
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** 餐次类型 → 中文标签（如 'breakfast' → '早餐'） */
export function mealTypeLabel(type: MealRecord['mealType']): string {
  return MEAL_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

/** 克数格式化：整数不带小数，非整数保留一位 */
export function formatGrams(v: number): string {
  return Number.isInteger(v) ? `${v}g` : `${v.toFixed(1)}g`;
}

/** 身体信息（账本维度，用于基础代谢计算） */
export interface BodyProfile {
  gender?: 'male' | 'female';
  age?: number;
  heightCm?: number;
  weightKg?: number;
}

/** 基础代谢 BMR（千卡/天），Mifflin-St Jeor 公式；信息不完整或非法返回 null */
export function calcBMR(profile: BodyProfile): number | null {
  const { gender, age, heightCm, weightKg } = profile;
  if (gender == null || age == null || heightCm == null || weightKg == null) return null;
  if (age <= 0 || heightCm <= 0 || weightKg <= 0) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(base + (gender === 'male' ? 5 : -161));
}
