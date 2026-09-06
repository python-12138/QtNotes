import dayjs from 'dayjs';

export function todayStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function currentMonthStr(): string {
  return dayjs().format('YYYY-MM');
}

/** 列表分组标题：今天 / 昨天 / M月D日 */
export function dateLabel(date: string): string {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, 'day')) return '今天';
  if (d.isSame(now.subtract(1, 'day'), 'day')) return '昨天';
  return d.format('M月D日');
}

export function weekdayLabel(date: string): string {
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return wd[dayjs(date).day()];
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map((n) => Number(n));
  return `${y}年${m}月`;
}

export function shiftMonth(month: string, delta: number): string {
  return dayjs(`${month}-01`).add(delta, 'month').format('YYYY-MM');
}
