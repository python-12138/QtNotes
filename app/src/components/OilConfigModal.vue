<script setup lang="ts">
// 油价配置弹窗（车辆账本专用）：历史累计油费/里程 + 油价接口配置 + 获取当天油价
import { ref, watch } from 'vue';
import { useSettings, saveSettings, DEFAULT_SETTINGS } from '../store/useSettings';
import { fetchOilPrice } from '../utils/oilPrice';
import { yuanToFen, fenToYuan } from '../utils/money';
import type { AppSettings } from '../db/types';

const emit = defineEmits<{ (e: 'close'): void }>();

const settings = useSettings();
const OIL_GRADES = ['92#', '95#', '98#', '柴油'];

const fuelBaselineAmountYuan = ref('0');
const fuelBaselineKm = ref('');
const oilProvince = ref(DEFAULT_SETTINGS.oilProvince);
const oilGrade = ref(DEFAULT_SETTINGS.oilGrade);
const oilAppId = ref('');
const oilAppSecret = ref('');
const oilPriceYuan = ref('');

watch(
  settings,
  (s) => {
    fuelBaselineAmountYuan.value = fenToYuan(s.fuelBaselineAmount);
    fuelBaselineKm.value = s.fuelBaselineKm ? String(s.fuelBaselineKm) : '';
    oilProvince.value = s.oilProvince;
    oilGrade.value = s.oilGrade;
    oilAppId.value = s.oilAppId;
    oilAppSecret.value = s.oilAppSecret;
    oilPriceYuan.value = s.oilPrice ? String(s.oilPrice) : '';
  },
  { immediate: true },
);

async function save() {
  await saveSettings({
    fuelBaselineAmount: yuanToFen(fuelBaselineAmountYuan.value),
    fuelBaselineKm: parseFloat(fuelBaselineKm.value) || 0,
    oilProvince: oilProvince.value.trim() || DEFAULT_SETTINGS.oilProvince,
    oilGrade: oilGrade.value,
    oilAppId: oilAppId.value.trim(),
    oilAppSecret: oilAppSecret.value.trim(),
    oilPrice: parseFloat(oilPriceYuan.value) || 0,
  });
  emit('close');
}

async function getOilPrice() {
  const s: AppSettings = {
    ...DEFAULT_SETTINGS,
    oilProvince: oilProvince.value.trim(),
    oilGrade: oilGrade.value,
    oilAppId: oilAppId.value.trim(),
    oilAppSecret: oilAppSecret.value.trim(),
  };
  try {
    const price = await fetchOilPrice(s);
    oilPriceYuan.value = String(price);
    await saveSettings({
      oilProvince: s.oilProvince,
      oilGrade: s.oilGrade,
      oilAppId: s.oilAppId,
      oilAppSecret: s.oilAppSecret,
      oilPrice: price,
      oilPriceUpdatedAt: Date.now(),
    });
    alert(`已获取当天油价：¥${price.toFixed(2)}/升`);
  } catch (e) {
    alert('获取失败：' + (e instanceof Error ? e.message : '未知错误'));
  }
}
</script>

<template>
  <div class="modal-mask" @click="emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <span>油价配置</span>
        <button type="button" class="icon-btn" @click="emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <div class="add-field">
          <label>历史累计油费（元）</label>
          <input v-model="fuelBaselineAmountYuan" class="text-input" type="text" inputmode="decimal" placeholder="如 3527.81" />
        </div>
        <div class="add-field">
          <label>历史累计里程（km）</label>
          <input v-model="fuelBaselineKm" class="text-input" type="text" inputmode="decimal" placeholder="如 4849" />
        </div>
        <div class="add-field">
          <label>省份</label>
          <input v-model="oilProvince" class="text-input" type="text" placeholder="如 上海" />
        </div>
        <div class="add-field">
          <label>默认油号</label>
          <div class="account-chips">
            <button
              v-for="g in OIL_GRADES"
              :key="g"
              type="button"
              class="chip"
              :class="{ active: oilGrade === g }"
              @click="oilGrade = g"
            >
              {{ g }}
            </button>
          </div>
        </div>
        <div class="add-field">
          <label>app_id</label>
          <input v-model="oilAppId" class="text-input" type="text" placeholder="mxnzp 接口 app_id" />
        </div>
        <div class="add-field">
          <label>app_secret</label>
          <input v-model="oilAppSecret" class="text-input" type="text" placeholder="mxnzp 接口 app_secret" />
        </div>
        <div class="add-field">
          <label>当前单价（元/升）</label>
          <input v-model="oilPriceYuan" class="text-input" type="text" inputmode="decimal" placeholder="手动填写或自动获取" />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" @click="getOilPrice">获取当天油价</button>
        <button type="button" class="btn btn-primary" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>
