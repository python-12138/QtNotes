// 金额统一以「分」（整数）存储，避免浮点误差。

/** 元字符串（如 "12.34"）转为分 */
export function yuanToFen(yuan: string): number {
  const trimmed = yuan.trim();
  if (!trimmed) return 0;
  const [intPart = '0', decPart = ''] = trimmed.split('.');
  const int = parseInt(intPart, 10) || 0;
  const dec = parseInt((decPart + '00').slice(0, 2), 10) || 0;
  return int * 100 + dec;
}

/** 分转为元字符串（两位小数，可带负号） */
export function fenToYuan(fen: number): string {
  const sign = fen < 0 ? '-' : '';
  const abs = Math.abs(Math.round(fen));
  const int = Math.floor(abs / 100);
  const dec = abs % 100;
  return `${sign}${int}.${String(dec).padStart(2, '0')}`;
}

/** 分转为带千分位的金额显示，如 "1,234.56" */
export function formatMoney(fen: number): string {
  const s = fenToYuan(fen);
  const neg = s.startsWith('-');
  const abs = neg ? s.slice(1) : s;
  const [int, dec] = abs.split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${intFmt}.${dec}`;
}
