import type { AppSettings } from '../db/types';

// 油价获取（mxnzp 免费接口）。返回当天某油号的单价（元/升）。
// 接口文档：https://www.mxnzp.com/api/oil/search?province=上海&app_id=xx&app_secret=xx

/** 油号 → 接口返回字段 */
const GRADE_FIELD: Record<string, string> = {
  '92#': 't92',
  '95#': 't95',
  '98#': 't98',
  柴油: 't0',
};

/** 获取当天油价；失败抛出 Error（由调用方兜底为手动单价） */
export async function fetchOilPrice(s: AppSettings): Promise<number> {
  if (!s.oilAppId || !s.oilAppSecret) {
    throw new Error('请先填写 app_id 和 app_secret');
  }
  const field = GRADE_FIELD[s.oilGrade];
  if (!field) throw new Error('当前油号不支持查价（如充电）');

  const url =
    'https://www.mxnzp.com/api/oil/search' +
    `?province=${encodeURIComponent(s.oilProvince)}` +
    `&app_id=${encodeURIComponent(s.oilAppId)}` +
    `&app_secret=${encodeURIComponent(s.oilAppSecret)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('接口请求失败：' + res.status);

  const json = await res.json();
  if (json.code !== 1) throw new Error('接口错误：' + (json.msg || 'app_id/app_secret 不合法'));

  const item = Array.isArray(json.data) ? json.data[0] : json.data;
  if (item == null) throw new Error('未返回油价数据');

  const price = parseFloat(String(item[field]));
  if (!price || price <= 0) throw new Error('价格解析失败');
  return price;
}
