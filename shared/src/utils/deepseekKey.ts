// DeepSeek API Key 的本地存取（「防君子不防小人」）。
// 说明：
//   1) Key 由用户自己在设置页输入，只存在本机浏览器 localStorage，
//      不进代码 / 仓库 / 备份 / 同步，因此不会随开源仓库或备份文件泄漏。
//   2) 这里的「加密」只是可逆混淆（XOR + base64），并非真加密——纯前端无法真正加密，
//      因为浏览器最终要拿到明文 Key 才能发请求。目的仅是挡一下随手翻看 localStorage 的人。
//   3) 想要更强的保护，唯一可靠办法是把识别挪到服务端代理（本方案已放弃，见开发计划）。

/** localStorage 存储键 */
const STORAGE_KEY = 'qtnotes-deepseek-key';
/** 混淆盐：写死在代码里，仅用于把 Key 打散；不提供任何安全性，可随意改 */
const XOR_SALT = 'qtnotes#diet#2026';

/** 把明文 Key 混淆成可安全存入 localStorage 的字符串（XOR 打散 + base64） */
function obfuscate(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    // 逐字符与盐做 XOR（Key 为 ASCII，XOR 结果仍 < 0x80，btoa 安全）
    out += String.fromCharCode(text.charCodeAt(i) ^ XOR_SALT.charCodeAt(i % XOR_SALT.length));
  }
  return btoa(out);
}

/** 反混淆：还原明文 Key；存储内容损坏时返回空串 */
function deobfuscate(encoded: string): string {
  let bin: string;
  try {
    bin = atob(encoded);
  } catch {
    return '';
  }
  let out = '';
  for (let i = 0; i < bin.length; i++) {
    out += String.fromCharCode(bin.charCodeAt(i) ^ XOR_SALT.charCodeAt(i % XOR_SALT.length));
  }
  return out;
}

/** 读取用户配置的 DeepSeek API Key（未配置返回空串） */
export function getDeepseekKey(): string {
  const encoded = localStorage.getItem(STORAGE_KEY);
  return encoded ? deobfuscate(encoded) : '';
}

/**
 * 从粘贴文本里提取合法 Key：`sk-` 开头 + 字母/数字/下划线/连字符（至少 10 位）。
 * 复制 Key 时末尾常混入 `/`、空格、换行、`>` 等多余字符，这里只保留合法段、其余丢弃，
 * 从而避免「末尾带 / 导致认证失败」这类问题。若文本里根本没有合法 Key，原样 trim 返回
 * （交由服务端报错，不做误判截断）。
 */
function extractDeepseekKey(input: string): string {
  const m = input.match(/sk-[A-Za-z0-9_-]{10,}/);
  return m ? m[0] : input.trim();
}

/**
 * 保存 DeepSeek API Key（自动清理多余字符；传空串等同清除）。
 * 返回实际保存的 Key，供界面回填、让用户确认存进去的到底是什么。
 */
export function setDeepseekKey(key: string): string {
  const cleaned = extractDeepseekKey(key);
  if (!cleaned) {
    localStorage.removeItem(STORAGE_KEY);
    return '';
  }
  localStorage.setItem(STORAGE_KEY, obfuscate(cleaned));
  return cleaned;
}

/** 是否已配置 Key（决定「拍照识别」入口是否可用） */
export function hasDeepseekKey(): boolean {
  return getDeepseekKey() !== '';
}
