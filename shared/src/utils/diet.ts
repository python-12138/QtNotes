// 饮食账本：碳蛋脂汇总与展示工具（纯函数，无数据源依赖）。
import type { ActivityLevel, FoodMenuItem, MealRecord } from '../types';
import type { RecognizedFood } from './dietRecognition';
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
  activityLevel?: ActivityLevel;
  proteinPerKgNormal?: number;
  proteinPerKgFitness?: number;
  fatRatioNormal?: number;
  fatRatioFitness?: number;
}

/** 基础代谢 BMR（千卡/天），Mifflin-St Jeor 公式；信息不完整或非法返回 null */
export function calcBMR(profile: BodyProfile): number | null {
  const { gender, age, heightCm, weightKg } = profile;
  if (gender == null || age == null || heightCm == null || weightKg == null) return null;
  if (age <= 0 || heightCm <= 0 || weightKg <= 0) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(base + (gender === 'male' ? 5 : -161));
}

/** 活动量等级 → 活动系数（BMR × 系数 = TDEE） */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

/** 活动量选项（身体信息弹窗 / 展示用） */
export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: '久坐（几乎不运动）' },
  { value: 'light', label: '轻度（每周 1-3 次）' },
  { value: 'moderate', label: '中度（每周 3-5 次）' },
  { value: 'active', label: '高强度（每周 6-7 次）' },
];

/** 每日总消耗 TDEE（千卡/天）= BMR × 活动系数；信息不完整返回 null */
export function calcTDEE(profile: BodyProfile): number | null {
  const bmr = calcBMR(profile);
  if (bmr == null) return null;
  const factor = ACTIVITY_FACTORS[profile.activityLevel ?? 'sedentary'];
  return Math.round(bmr * factor);
}

/** 健身 / 不健身两档（用于碳蛋脂目标） */
export type FitnessMode = 'fitness' | 'normal';

/** 宏量目标参数的推荐默认值（用户未自定义时使用） */
export const MACRO_DEFAULTS = {
  proteinPerKgNormal: 1.2, // 不健身蛋白质 g/kg
  proteinPerKgFitness: 1.8, // 健身蛋白质 g/kg
  fatRatioNormal: 0.25, // 不健身脂肪占比
  fatRatioFitness: 0.2, // 健身脂肪占比
};

/** 每日宏量目标（碳水/蛋白/脂肪克数 + 目标热量），按健身/不健身与可调参数给出；信息不完整返回 null */
export function macroTargets(profile: BodyProfile, mode: FitnessMode): Nutrition | null {
  const tdee = calcTDEE(profile);
  const weightKg = profile.weightKg;
  if (tdee == null || weightKg == null || weightKg <= 0) return null;
  const proteinPerKg =
    mode === 'fitness'
      ? profile.proteinPerKgFitness ?? MACRO_DEFAULTS.proteinPerKgFitness
      : profile.proteinPerKgNormal ?? MACRO_DEFAULTS.proteinPerKgNormal;
  const fatRatio =
    mode === 'fitness'
      ? profile.fatRatioFitness ?? MACRO_DEFAULTS.fatRatioFitness
      : profile.fatRatioNormal ?? MACRO_DEFAULTS.fatRatioNormal;
  const protein = round1(weightKg * proteinPerKg);
  const fat = round1((tdee * fatRatio) / 9);
  // 碳水 = 剩余热量（碳水 4 kcal/g，蛋白 4 kcal/g，脂肪 9 kcal/g）
  const carbsKcal = tdee - protein * 4 - fat * 9;
  const carbs = round1(Math.max(0, carbsKcal) / 4);
  return { carbs, protein, fat, kcal: tdee };
}

/** 营养四要素（克/千卡），供「按每 100g 折算」的纯函数复用 */
export interface Nutrition {
  carbs: number;
  protein: number;
  fat: number;
  kcal: number;
}

/** 把识别出的单样食物折算成每 100g 营养；份量非法时按 0 */
export function foodToNutritionPer100g(food: RecognizedFood): Nutrition {
  const grams = food.grams > 0 ? food.grams : 0;
  if (grams === 0) return { carbs: 0, protein: 0, fat: 0, kcal: 0 };
  const k = 100 / grams;
  return {
    carbs: round1(food.carbs * k),
    protein: round1(food.protein * k),
    fat: round1(food.fat * k),
    kcal: round1(food.kcal * k),
  };
}

/** 按菜单项（每 100g）+ 份量折算实际营养；份量非法时按 0 */
export function nutritionForMenu(item: FoodMenuItem, grams: number): Nutrition {
  const g = grams > 0 ? grams : 0;
  const k = g / 100;
  return {
    carbs: round1(item.carbsPer100g * k),
    protein: round1(item.proteinPer100g * k),
    fat: round1(item.fatPer100g * k),
    kcal: round1(item.kcalPer100g * k),
  };
}

/** 保留一位小数（营养估算本就近似，一位足够） */
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
