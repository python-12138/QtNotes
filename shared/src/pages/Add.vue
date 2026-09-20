<script setup lang="ts">
// 记一笔（按账本类型分三种形态，支持「新增」与「编辑」两种模式）：
//   普通账本 = 支出/收入 + 金额 + 分类 + 账户
//   用车费用 = 「记油费」支出/收入 + 金额 + 油号 + 里程表读数；「记行驶」本次距离 + 升数
//   饮食账本 = 「记一顿饭」拍照/相册识别碳蛋脂 + 手动可改
// 编辑模式：传入 editTx / editTrip / editMeal 之一，表单回填该记录，保存时走 update 而非 add。
import { computed, ref, watch } from 'vue';
import { getDataProvider } from '../data/provider';
import { currentLedgerId, useCurrentLedger } from '../store/currentLedger';
import { useCategories } from '../store/useCategories';
import { useAccounts } from '../store/useAccounts';
import { useSettings } from '../store/useSettings';
import { yuanToFen, fenToYuan } from '../utils/money';
import { todayStr } from '../utils/date';
import { uid } from '../utils/id';
import { compressImage, recognizeMeal } from '../utils/dietRecognition';
import type { RecognizedFood } from '../utils/dietRecognition';
import { getDeepseekKey } from '../utils/deepseekKey';
import { FUEL_TYPE_OPTIONS, MEAL_TYPE_OPTIONS } from '../presets';
import { useFoodItems } from '../store/useFoodItems';
import { foodToNutritionPer100g, nutritionForMenu, type Nutrition } from '../utils/diet';
import type { FoodMenuItem, MealRecord, MealType, Transaction, TripRecord, TxType } from '../types';
import CategoryPicker from '../components/CategoryPicker.vue';
import OilConfigModal from '../components/OilConfigModal.vue';

const props = defineProps<{
  editTx?: Transaction | null; // 编辑：待改的流水
  editTrip?: TripRecord | null; // 编辑：待改的行驶记录
  editMeal?: MealRecord | null; // 编辑：待改的饮食记录
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const categories = useCategories();
const accounts = useAccounts();
const ledger = useCurrentLedger();
const settings = useSettings();

const isVehicle = computed(() => ledger.value?.type === 'vehicle');
const isDiet = computed(() => ledger.value?.type === 'diet');
const mode = ref<'tx' | 'trip'>('tx');

// 是否处于编辑模式（三种实体各自判断）
const isEditTx = computed(() => !!props.editTx);
const isEditTrip = computed(() => !!props.editTrip);
const isEditMeal = computed(() => !!props.editMeal);

// 顶部标题：饮食账本「记/编辑一顿饭」，车辆账本按入口「记油费/记行驶」，其余「记/编辑一笔」
const title = computed(() => {
  if (isDiet.value) return isEditMeal.value ? '编辑这顿饭' : '记一顿饭';
  if (mode.value === 'trip') return isEditTrip.value ? '编辑行驶' : '记行驶';
  return isEditTx.value ? '编辑这笔' : '记一笔';
});

// —— 记油费 ——
const type = ref<TxType>(props.editTx?.type ?? 'expense');
// 金额：编辑时把「分」转回「元字符串」回填
const amountStr = ref(props.editTx ? fenToYuan(props.editTx.amount) : '');
const categoryId = ref<string | null>(props.editTx?.categoryId ?? null);
const accountId = ref<string | null>(props.editTx?.accountId ?? null);
const date = ref(props.editTx?.date ?? todayStr());
const note = ref(props.editTx?.note ?? '');
const fuelType = ref(props.editTx?.fuelType ?? FUEL_TYPE_OPTIONS[0] ?? '');
const kmStr = ref(props.editTx?.km != null ? String(props.editTx.km) : ''); // 里程表读数（总里程）

// —— 记行驶 ——
const tripDate = ref(props.editTrip?.date ?? todayStr());
const tripKmStr = ref(props.editTrip ? String(props.editTrip.km) : '');
const tripLitersStr = ref(props.editTrip ? String(props.editTrip.liters) : '');

const showOilConfig = ref(false);

// —— 记一顿饭（饮食账本） ——
const mealType = ref<MealType>(props.editMeal?.mealType ?? 'lunch'); // 餐次，默认午餐
const dietDate = ref(props.editMeal?.date ?? todayStr());
const dietSummary = ref(props.editMeal?.summary ?? ''); // 食物描述（识别自动填，可改）
const carbsStr = ref(props.editMeal?.carbs ? String(props.editMeal.carbs) : ''); // 碳水克数（可改）
const proteinStr = ref(props.editMeal?.protein ? String(props.editMeal.protein) : ''); // 蛋白质克数（可改）
const fatStr = ref(props.editMeal?.fat ? String(props.editMeal.fat) : ''); // 脂肪克数（可改）
const kcalStr = ref(props.editMeal?.kcal ? String(props.editMeal.kcal) : ''); // 热量千卡（可改）
const dietNote = ref(props.editMeal?.note ?? '');
const dietImage = ref(props.editMeal?.image ?? ''); // 吃之前照片 dataURL（仅回显）
const dietAfterImage = ref(props.editMeal?.afterImage ?? ''); // 吃结束后照片 dataURL（仅回显）
const dietHint = ref(''); // 吃之前补充描述（选填，帮助模型判断食物种类，如「这是鸡蛋」）
const dietAfterHint = ref(''); // 吃结束后补充描述（选填）
const dietHeight = ref(''); // 吃之前拍摄高度（cm，选填，借助测距仪测；留空则不传给模型）
const dietAfterHeight = ref(''); // 吃结束后拍摄高度（cm，选填）
const recognizing = ref(false); // 识别中：禁用按钮 + 显示提示
const dietError = ref(''); // 识别错误信息
const dietFoods = ref<RecognizedFood[]>([]); // 吃之前识别出的每样食物（用于「加入菜单」）

// 吃之前/吃结束后识别到的营养基准，最终摄入 = before − after（两者均为 0 时即纯手动录入）
const beforeN = ref<Nutrition>({ carbs: 0, protein: 0, fat: 0, kcal: 0 });
const afterN = ref<Nutrition>({ carbs: 0, protein: 0, fat: 0, kcal: 0 });
const remainingKcal = ref<number>(props.editMeal?.remainingKcal ?? 0); // 吃结束后剩余热量（0 = 吃光）

// 菜单选择
const foodItems = useFoodItems();
const showMenu = ref(false); // 是否展开菜单
const menuGrams = ref<Record<string, string>>({}); // 每项待填克数

// 拍照 / 相册隐藏 input（吃之前 + 吃结束后各一组）
const cameraInput = ref<HTMLInputElement | null>(null);
const albumInput = ref<HTMLInputElement | null>(null);
const afterCameraInput = ref<HTMLInputElement | null>(null);
const afterAlbumInput = ref<HTMLInputElement | null>(null);

const typeCategories = computed(() => categories.value.filter((c) => c.type === type.value));
const selectedCat = computed(() => categories.value.find((c) => c.id === categoryId.value));
const isFuel = computed(() => selectedCat.value?.isFuel === true);

// 默认选中第一个分类
watch(typeCategories, (list) => {
  if (!categoryId.value || !list.some((c) => c.id === categoryId.value)) {
    categoryId.value = list[0]?.id ?? null;
  }
}, { immediate: true });

// 默认选中第一个账户
watch(accounts, (list) => {
  if (!accountId.value && list.length) {
    accountId.value = list[0].id;
  }
}, { immediate: true });

const amountFen = computed(() => yuanToFen(amountStr.value));
const odometer = computed(() => parseFloat(kmStr.value) || 0);
// 当天单价来自油价配置
const unitPrice = computed(() => settings.value.oilPrice || 0);
const unitPriceText = computed(() =>
  unitPrice.value > 0 ? `¥${unitPrice.value.toFixed(2)}/升` : '未配置油价',
);

// 记行驶预览：本次油耗 / 本次成本
const tripKm = computed(() => parseFloat(tripKmStr.value) || 0);
const tripLiters = computed(() => parseFloat(tripLitersStr.value) || 0);
const tripConsumption = computed(() =>
  tripKm.value > 0 && tripLiters.value > 0 ? (tripLiters.value / tripKm.value) * 100 : null,
);
const tripCost = computed(() =>
  unitPrice.value > 0 && tripLiters.value > 0 ? tripLiters.value * unitPrice.value : null,
);
const tripConsumptionText = computed(() =>
  tripConsumption.value != null ? `${tripConsumption.value.toFixed(1)} L/100km` : '—',
);
const tripCostText = computed(() => (tripCost.value != null ? `¥${tripCost.value.toFixed(2)}` : '—'));

// 金额输入过滤：只保留数字与一个小数点，小数最多两位，整数最多 9 位
function sanitizeAmount(raw: string): string {
  let s = raw.replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    const int = s.slice(0, firstDot);
    const dec = s.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
    s = int + '.' + dec;
  }
  s = s.replace(/^0+(?=\d)/, '');
  const dot = s.indexOf('.');
  const intPart = dot === -1 ? s : s.slice(0, dot);
  const rest = dot === -1 ? '' : s.slice(dot);
  if (intPart.length > 9) s = intPart.slice(0, 9) + rest;
  if (s.startsWith('.')) s = '0' + s;
  return s;
}

function onAmountInput(e: Event) {
  const el = e.target as HTMLInputElement;
  const next = sanitizeAmount(el.value);
  amountStr.value = next;
  if (el.value !== next) el.value = next;
}

async function saveTx() {
  if (amountFen.value <= 0) {
    alert('请输入金额');
    return;
  }
  if (!categoryId.value) {
    alert('请选择分类');
    return;
  }
  if (!accountId.value) {
    alert('请选择账户');
    return;
  }
  const tx: Transaction = {
    id: props.editTx?.id ?? uid(),
    ledgerId: props.editTx?.ledgerId ?? currentLedgerId.value,
    type: type.value,
    amount: amountFen.value,
    categoryId: categoryId.value,
    accountId: accountId.value,
    date: date.value,
    note: note.value.trim(),
    createdAt: props.editTx?.createdAt ?? Date.now(),
    // 油费记录才写入这些字段；里程表读数选填
    ...(isFuel.value
      ? {
          fuelType: fuelType.value,
          ...(odometer.value > 0 ? { km: odometer.value } : {}),
        }
      : {}),
  };
  if (isEditTx.value) await getDataProvider().updateTransaction(tx);
  else await getDataProvider().addTransaction(tx);
  emit('close');
}

async function saveTrip() {
  if (tripKm.value <= 0) {
    alert('请输入行驶距离');
    return;
  }
  if (tripLiters.value <= 0) {
    alert('请输入使用升数');
    return;
  }
  const trip: TripRecord = {
    id: props.editTrip?.id ?? uid(),
    ledgerId: props.editTrip?.ledgerId ?? currentLedgerId.value,
    date: tripDate.value,
    km: tripKm.value,
    liters: tripLiters.value,
    createdAt: props.editTrip?.createdAt ?? Date.now(),
  };
  if (isEditTrip.value) await getDataProvider().updateTrip(trip);
  else await getDataProvider().addTrip(trip);
  emit('close');
}

// —— 饮食账本：拍照/相册 → 识别 → 自动填充 ——

// 字符串 → 非负数字（空/非法一律 0）
function numOf(s: string): number {
  const v = parseFloat(s);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

// 识别失败时统一提示（不区分吃前/吃后）
function failDiet(e: unknown) {
  dietError.value = e instanceof Error ? e.message : '识别失败，请重试';
}

// 统一识别：点一次自动识别已上传的照片。吃之前必有；若拍了吃结束后则顺带识别剩余并扣减。
async function runAllRecognition() {
  if (!dietImage.value) return;
  dietError.value = '';
  recognizing.value = true;
  try {
    const apiKey = getDeepseekKey();
    if (!apiKey) {
      dietError.value = '未配置 DeepSeek API Key，请到「我的」里填写';
      return;
    }
    // 吃之前（必有）
    const before = await recognizeMeal(dietImage.value, apiKey, dietHint.value.trim(), 'before', numOf(dietHeight.value));
    beforeN.value = { carbs: before.carbs, protein: before.protein, fat: before.fat, kcal: before.kcal };
    dietFoods.value = before.foods ?? [];
    dietSummary.value = before.summary;
    // 吃结束后（可选）：没拍则剩余记 0，等于默认吃光
    if (dietAfterImage.value) {
      const after = await recognizeMeal(dietAfterImage.value, apiKey, dietAfterHint.value.trim(), 'after', numOf(dietAfterHeight.value));
      afterN.value = { carbs: after.carbs, protein: after.protein, fat: after.fat, kcal: after.kcal };
      remainingKcal.value = after.kcal;
    } else {
      afterN.value = { carbs: 0, protein: 0, fat: 0, kcal: 0 };
      remainingKcal.value = 0;
    }
    fillFromRecognition();
  } catch (e) {
    failDiet(e);
  } finally {
    recognizing.value = false;
  }
}

// 依据 before/after 基准重算四个输入框（最终摄入 = before − after，负值归零）。
// before 识别后直接填 before；after 识别后扣剩余。两者均为 0 时说明是纯手动录入，不覆盖。
function fillFromRecognition() {
  const b = beforeN.value;
  const a = afterN.value;
  const hasPhoto = b.kcal > 0 || b.carbs > 0 || b.protein > 0 || b.fat > 0 || a.kcal > 0;
  if (!hasPhoto) return;
  const carbs = Math.max(0, b.carbs - a.carbs);
  const protein = Math.max(0, b.protein - a.protein);
  const fat = Math.max(0, b.fat - a.fat);
  const kcal = Math.max(0, b.kcal - a.kcal);
  carbsStr.value = carbs > 0 ? String(carbs) : '';
  proteinStr.value = protein > 0 ? String(protein) : '';
  fatStr.value = fat > 0 ? String(fat) : '';
  kcalStr.value = kcal > 0 ? String(kcal) : '';
}

// 选择图片后的统一入口：压缩 → 回显（识别由用户点「识别」按钮触发，不自动跑）
async function onPickDietImage(file: File, scene: 'before' | 'after') {
  dietError.value = '';
  try {
    const dataUrl = await compressImage(file);
    if (scene === 'before') dietImage.value = dataUrl; // 只回显缩略图
    else dietAfterImage.value = dataUrl;
  } catch (e) {
    failDiet(e);
  }
}

// 拍照 / 相册 input 的 change 事件（用完后清空 value，方便下次再选同一张）
function onCameraChange(e: Event, scene: 'before' | 'after') {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) onPickDietImage(f, scene);
  (e.target as HTMLInputElement).value = '';
}

// 识别出的某样食物「加入菜单」：折算每 100g 后沉淀（同名已存在则跳过）
async function addFoodToMenu(food: RecognizedFood) {
  if (foodItems.value.some((f) => f.name === food.name)) {
    alert(`「${food.name}」已在菜单中`);
    return;
  }
  const per100 = foodToNutritionPer100g(food);
  if (per100.kcal <= 0) {
    alert('该食物份量或热量无效，无法加入菜单');
    return;
  }
  await getDataProvider().addFoodItem({
    id: uid(),
    ledgerId: currentLedgerId.value,
    name: food.name,
    kcalPer100g: per100.kcal,
    carbsPer100g: per100.carbs,
    proteinPer100g: per100.protein,
    fatPer100g: per100.fat,
    createdAt: Date.now(),
  });
}

// 菜单里某样食物按克数累加进当前这顿
function addMenuToMeal(item: FoodMenuItem) {
  const grams = numOf(menuGrams.value[item.id] ?? '');
  if (grams <= 0) {
    alert('请输入克数');
    return;
  }
  const n = nutritionForMenu(item, grams);
  carbsStr.value = String(numOf(carbsStr.value) + n.carbs);
  proteinStr.value = String(numOf(proteinStr.value) + n.protein);
  fatStr.value = String(numOf(fatStr.value) + n.fat);
  kcalStr.value = String(numOf(kcalStr.value) + n.kcal);
  dietSummary.value = dietSummary.value.trim()
    ? `${dietSummary.value.trim()} + ${item.name}`
    : item.name;
  menuGrams.value[item.id] = '';
}

async function saveMeal() {
  const carbs = numOf(carbsStr.value);
  const protein = numOf(proteinStr.value);
  const fat = numOf(fatStr.value);
  const kcal = numOf(kcalStr.value);
  // 碳蛋脂/热量至少填一项才算有效
  if (carbs === 0 && protein === 0 && fat === 0 && kcal === 0) {
    alert('请拍照识别或手动填写碳蛋脂/热量');
    return;
  }
  const meal: MealRecord = {
    id: props.editMeal?.id ?? uid(),
    ledgerId: props.editMeal?.ledgerId ?? currentLedgerId.value,
    date: dietDate.value,
    mealType: mealType.value,
    summary: dietSummary.value.trim(),
    carbs,
    protein,
    fat,
    kcal,
    ...(dietImage.value ? { image: dietImage.value } : {}),
    ...(dietAfterImage.value ? { afterImage: dietAfterImage.value } : {}),
    ...(remainingKcal.value > 0 ? { remainingKcal: remainingKcal.value } : {}),
    note: dietNote.value.trim(),
    createdAt: props.editMeal?.createdAt ?? Date.now(),
  };
  if (isEditMeal.value) await getDataProvider().updateMeal(meal);
  else await getDataProvider().addMeal(meal);
  emit('close');
}

function save() {
  if (isDiet.value) {
    saveMeal();
    return;
  }
  if (mode.value === 'trip') saveTrip();
  else saveTx();
}
</script>

<template>
  <div class="add-page">
    <header class="add-header">
      <button type="button" class="icon-btn" @click="emit('close')">✕</button>
      <span class="add-title">{{ title }}</span>
      <button type="button" class="save-btn" @click="save">保存</button>
    </header>

    <!-- 饮食账本：拍照识别 / 手动录入 -->
    <template v-if="isDiet">
      <div class="add-body">
        <div class="add-field">
          <label>吃之前（拍照识别整份，自动填充可改）</label>
          <div class="diet-photo-actions">
            <button type="button" class="btn" :disabled="recognizing" @click="cameraInput?.click()">📷 拍照</button>
            <button type="button" class="btn" :disabled="recognizing" @click="albumInput?.click()">🖼 相册</button>
          </div>
          <div class="photo-slot">
            <img v-if="dietImage" :src="dietImage" class="diet-photo-preview" alt="吃之前照片" />
            <div v-else class="photo-placeholder">🍽 吃之前拍照</div>
          </div>
          <input
            v-model="dietHint"
            type="text"
            class="text-input diet-hint"
            placeholder="补充描述（可选，如：这是鸡蛋）"
          />
          <input
            v-model="dietHeight"
            type="number"
            inputmode="decimal"
            class="text-input diet-hint"
            placeholder="拍摄高度 cm（可选，可用测距仪测）"
          />
          <input ref="cameraInput" type="file" accept="image/*" capture="environment" style="display: none" @change="onCameraChange($event, 'before')" />
          <input ref="albumInput" type="file" accept="image/*" style="display: none" @change="onCameraChange($event, 'before')" />
        </div>

        <div class="add-field">
          <label>吃结束后（可选，识别剩余并自动扣减）</label>
          <div class="diet-photo-actions">
            <button type="button" class="btn" :disabled="recognizing" @click="afterCameraInput?.click()">📷 拍照</button>
            <button type="button" class="btn" :disabled="recognizing" @click="afterAlbumInput?.click()">🖼 相册</button>
          </div>
          <div class="photo-slot">
            <img v-if="dietAfterImage" :src="dietAfterImage" class="diet-photo-preview" alt="吃结束后照片" />
            <div v-else class="photo-placeholder">🫗 吃结束后拍照（可选，未拍则默认吃光）</div>
          </div>
          <input
            v-model="dietAfterHint"
            type="text"
            class="text-input diet-hint"
            placeholder="补充描述（可选）"
          />
          <input
            v-model="dietAfterHeight"
            type="number"
            inputmode="decimal"
            class="text-input diet-hint"
            placeholder="拍摄高度 cm（可选）"
          />
          <input ref="afterCameraInput" type="file" accept="image/*" capture="environment" style="display: none" @change="onCameraChange($event, 'after')" />
          <input ref="afterAlbumInput" type="file" accept="image/*" style="display: none" @change="onCameraChange($event, 'after')" />
        </div>

        <div v-if="recognizing" class="hint">识别中…</div>
        <div v-else-if="dietError" class="diet-error">{{ dietError }}</div>

        <!-- 统一识别：点一次自动识别已上传的照片（吃之前必有，吃结束后可选） -->
        <div v-if="dietImage" class="diet-photo-actions">
          <button type="button" class="btn btn-sm" :disabled="recognizing" @click="runAllRecognition()">🔍 识别</button>
        </div>

        <div v-if="remainingKcal > 0" class="hint">已扣减剩余 {{ remainingKcal }} kcal，下方为本次实际摄入</div>

        <!-- 识别出的食物清单：可逐样加入菜单 -->
        <div v-if="dietFoods.length" class="add-field">
          <label>识别出的食物（可加入菜单）</label>
          <div class="food-list">
            <div v-for="f in dietFoods" :key="f.name" class="food-row">
              <span class="food-name">{{ f.name }}</span>
              <span class="food-meta">{{ f.grams }}g · {{ f.kcal }} kcal</span>
              <button type="button" class="btn btn-sm" @click="addFoodToMenu(f)">＋菜单</button>
            </div>
          </div>
        </div>

        <!-- 菜单选择：从已沉淀的食物里挑，按克数累加 -->
        <div class="add-field">
          <button type="button" class="btn btn-block" @click="showMenu = !showMenu">
            📖 {{ showMenu ? '收起菜单' : '从菜单选择' }}
          </button>
          <div v-if="showMenu" class="menu-picker">
            <div v-if="foodItems.length === 0" class="hint">菜单为空，先拍照识别并把食物「加入菜单」吧</div>
            <div v-for="it in foodItems" :key="it.id" class="menu-row">
              <span class="food-name">{{ it.name }}</span>
              <span class="food-meta">{{ it.kcalPer100g }} kcal/100g</span>
              <input v-model="menuGrams[it.id]" type="number" inputmode="decimal" class="text-input menu-grams" placeholder="克" />
              <button type="button" class="btn btn-sm" @click="addMenuToMeal(it)">＋</button>
            </div>
          </div>
        </div>

        <div class="add-field">
          <label>餐次</label>
          <div class="account-chips">
            <button
              v-for="m in MEAL_TYPE_OPTIONS"
              :key="m.value"
              type="button"
              class="chip"
              :class="{ active: mealType === m.value }"
              @click="mealType = m.value"
            >
              {{ m.label }}
            </button>
          </div>
        </div>

        <div class="add-field">
          <label>食物描述</label>
          <input v-model="dietSummary" type="text" class="text-input" placeholder="如 米饭 + 红烧肉 + 青菜" />
        </div>

        <!-- 营养（每个输入固定带标签，填了值也知道是碳蛋脂哪个） -->
        <div class="add-field">
          <label>营养</label>
          <div class="diet-macro-grid">
            <label class="macro-field">
              <span class="macro-label">碳水（克）</span>
              <input v-model="carbsStr" class="text-input" type="number" inputmode="decimal" placeholder="0" />
            </label>
            <label class="macro-field">
              <span class="macro-label">蛋白质（克）</span>
              <input v-model="proteinStr" class="text-input" type="number" inputmode="decimal" placeholder="0" />
            </label>
            <label class="macro-field">
              <span class="macro-label">脂肪（克）</span>
              <input v-model="fatStr" class="text-input" type="number" inputmode="decimal" placeholder="0" />
            </label>
            <label class="macro-field">
              <span class="macro-label">热量（千卡）</span>
              <input v-model="kcalStr" class="text-input" type="number" inputmode="decimal" placeholder="0" />
            </label>
          </div>
        </div>

        <div class="add-field">
          <label>日期</label>
          <input v-model="dietDate" type="date" class="text-input" />
        </div>

        <div class="add-field">
          <label>备注</label>
          <input v-model="dietNote" type="text" class="text-input" placeholder="添加备注（可选）" />
        </div>
      </div>
    </template>

    <!-- 普通 / 用车费用：沿用金额记账 -->
    <template v-else>
      <!-- 车辆账本：双入口切换 -->
      <div v-if="isVehicle" class="add-type-toggle add-mode-toggle">
        <button type="button" :class="{ active: mode === 'tx' }" @click="mode = 'tx'">记油费</button>
        <button type="button" :class="{ active: mode === 'trip' }" @click="mode = 'trip'">记行驶</button>
      </div>

      <!-- 记油费 -->
      <template v-if="mode === 'tx'">
        <div class="add-type-toggle">
          <button
            type="button"
            class="expense"
            :class="{ active: type === 'expense' }"
            @click="type = 'expense'"
          >
            支出
          </button>
          <button
            type="button"
            class="income"
            :class="{ active: type === 'income' }"
            @click="type = 'income'"
          >
            收入
          </button>
        </div>

        <div class="add-amount">
          <span class="add-currency">¥</span>
          <input
            class="add-amount-input"
            type="text"
            inputmode="decimal"
            placeholder="0.00"
            :value="amountStr"
            @input="onAmountInput"
          />
        </div>

        <div class="add-body">
          <CategoryPicker :type="type" :selected-id="categoryId" @select="categoryId = $event" />

          <!-- 油费字段：仅「油费」分类时显示 -->
          <template v-if="isFuel">
            <div class="add-field">
              <label>油号</label>
              <div class="account-chips">
                <button
                  v-for="f in FUEL_TYPE_OPTIONS"
                  :key="f"
                  type="button"
                  class="chip"
                  :class="{ active: fuelType === f }"
                  @click="fuelType = f"
                >
                  {{ f }}
                </button>
              </div>
            </div>
            <div class="add-field">
              <label>里程表读数（选填）</label>
              <input v-model="kmStr" class="text-input" type="number" inputmode="decimal" placeholder="如 80000（总里程 km）" />
            </div>
            <div class="fuel-preview fuel-preview-row">
              <span>当天单价：{{ unitPriceText }}</span>
              <button type="button" class="btn btn-sm" @click="showOilConfig = true">油价配置</button>
            </div>
          </template>

          <div class="add-field">
            <label>账户</label>
            <div class="account-chips">
              <button
                v-for="a in accounts"
                :key="a.id"
                type="button"
                class="chip"
                :class="{ active: accountId === a.id }"
                @click="accountId = a.id"
              >
                <span>{{ a.icon }}</span>
                {{ a.name }}
              </button>
            </div>
          </div>

          <div class="add-field">
            <label>日期</label>
            <input v-model="date" type="date" class="text-input" />
          </div>

          <div class="add-field">
            <label>备注</label>
            <input v-model="note" type="text" class="text-input" placeholder="添加备注（可选）" />
          </div>
        </div>
      </template>

      <!-- 记行驶 -->
      <template v-else>
        <div class="add-body">
          <div class="add-field">
            <label>日期</label>
            <input v-model="tripDate" type="date" class="text-input" />
          </div>
          <div class="add-field">
            <label>本次行驶距离（km）</label>
            <input v-model="tripKmStr" class="text-input" type="number" inputmode="decimal" placeholder="如 120" />
          </div>
          <div class="add-field">
            <label>使用升数（L）</label>
            <input v-model="tripLitersStr" class="text-input" type="number" inputmode="decimal" placeholder="如 8.5" />
          </div>
          <div class="fuel-preview">
            <span>当天单价：{{ unitPriceText }}</span>
            <span>本次油耗：{{ tripConsumptionText }}</span>
            <span>本次成本：{{ tripCostText }}</span>
          </div>
          <button type="button" class="btn btn-block" @click="showOilConfig = true">油价配置</button>
        </div>
      </template>
    </template>

    <OilConfigModal v-if="showOilConfig" @close="showOilConfig = false" />
  </div>
</template>
