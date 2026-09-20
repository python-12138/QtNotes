// 拍照识别碳蛋脂：图片压缩 + 直连 DeepSeek 视觉模型。
// 调用方：饮食账本的「记一顿饭」页，拿到图片 File 后先 compressImage 压缩，再 recognizeMeal 识别。

// —— 可调参数（改这里即可） ——
/** DeepSeek 多模态模型名（实验版，若官方更名/下线只改这一处） */
export const DEEPSEEK_VISION_MODEL = 'deepseek-v4-flash-vision-exp';
/** DeepSeek Chat Completions 端点 */
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
/** 压缩后最长边像素：控制上传体积与计费（图片按 token 计费） */
const MAX_IMAGE_SIZE = 1024;
/** 压缩质量 0~1，越小文件越小、越糊 */
const JPEG_QUALITY = 0.8;

/** 识别出的单样食物（用于沉淀进菜单） */
export interface RecognizedFood {
  name: string; // 食物名，如「米饭」
  grams: number; // 本次份量（克）
  carbs: number; // 碳水（克）
  protein: number; // 蛋白质（克）
  fat: number; // 脂肪（克）
  kcal: number; // 热量（千卡）
}

/** 识别结果：字段名与要求模型返回的 JSON 一一对应 */
export interface RecognitionResult {
  summary: string; // 食物描述，如「米饭 + 红烧肉 + 青菜」
  carbs: number; // 碳水（克）
  protein: number; // 蛋白质（克）
  fat: number; // 脂肪（克）
  kcal: number; // 热量（千卡）
  foods?: RecognizedFood[]; // 每样食物的清单（用于「加入菜单」）
}

/** 识别场景：吃之前（整份）/ 吃结束后（剩余） */
export type RecognitionScene = 'before' | 'after';

/** 拼装提示词：hint 为用户补充描述，用于纠偏拍照距离带来的误识别（如鸡蛋被看成鹌鹑蛋） */
function buildPrompt(hint: string, scene: RecognitionScene, heightCm?: number): string {
  const sceneText =
    scene === 'after'
      ? '图中是吃完后剩下的食物，请识别剩余部分'
      : '识别图中全部食物';
  let p =
    '你是营养估算助手。' + sceneText +
    '，只返回一个 JSON 对象，键为 summary/carbs/protein/fat/kcal/foods，' +
    'summary 是食物描述字符串，carbs/protein/fat 是克数、kcal 是千卡（均为整盘合计的目测估算数值），' +
    'foods 是每样食物的数组，每项含 name（名称）/grams（克）/carbs/protein/fat/kcal（该项的营养）。';
  if (hint) {
    p +=
      '用户补充说明：「' + hint + '」。请优先以该说明为准判断食物种类与分量（例如用户已明确是鸡蛋，就不要识别成鹌鹑蛋）。';
  }
  if (heightCm && heightCm > 0) {
    p += `拍照时摄像头距食物约 ${heightCm} 厘米，请据此更准确地估算食物分量。`;
  }
  p += '不要输出任何多余文字、解释或代码块。';
  return p;
}

/**
 * 把用户选择的图片压缩成 JPEG dataURL。
 * 在浏览器用 canvas 等比缩放到最长边 ≤ maxSize，输出 "data:image/jpeg;base64,..."。
 * @param file 拍照或相册选择的图片文件
 */
export function compressImage(file: File, maxSize = MAX_IMAGE_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // 计算缩放比例（只缩小、不放大）
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('当前环境不支持 canvas，无法压缩图片'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片加载失败，请换一张试试'));
    };
    img.src = objectUrl;
  });
}

/**
 * 调 DeepSeek 视觉模型识别一张食物图，返回碳蛋脂与热量。
 * @param imageDataUrl compressImage 输出的 JPEG dataURL
 * @param apiKey DeepSeek API Key（用户自填）
 * @param hint 用户补充描述（选填），帮助模型纠偏拍照距离带来的误识别
 * @param scene 吃之前（整份）/ 吃结束后（剩余）
 * @param heightCm 拍摄时摄像头距食物的距离（厘米，选填）；缺省或 <=0 时不下发，模型按默认目测
 */
export async function recognizeMeal(
  imageDataUrl: string,
  apiKey: string,
  hint = '',
  scene: RecognitionScene = 'before',
  heightCm?: number,
): Promise<RecognitionResult> {
  if (!apiKey) throw new Error('未配置 DeepSeek API Key，请到「设置」里填写');

  // 加超时：网络不通时避免一直卡在「识别中」，30 秒后主动中断并给出可读提示
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  let resp: Response;
  try {
    resp = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: buildPrompt(hint, scene, heightCm) },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch {
    // fetch 网络层失败（iOS Safari 常显示成英文 "Load failed"）：多半是网络不通/波动，与 Key 无关
    throw new Error('网络请求失败，连不上 DeepSeek（请确认手机能正常上网，稍后重试；可切换 WiFi / 流量）');
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    // 尽量取回服务端真实错误信息（如 key 无效、余额不足）
    let detail = '';
    try {
      const d = (await resp.json()) as { error?: { message?: string } };
      detail = d?.error?.message ?? '';
    } catch {
      // 响应体不是 JSON，忽略，走 HTTP 状态码兜底
    }
    throw new Error(detail || `DeepSeek 请求失败（HTTP ${resp.status}）`);
  }

  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data?.choices?.[0]?.message?.content ?? '';
  return parseRecognition(content);
}

/** 解析模型返回的文本为结构化结果；非严格 JSON 时做正则兜底 */
function parseRecognition(text: string): RecognitionResult {
  // 模型可能把 JSON 包在 ```json ... ``` 代码块里，先剥掉围栏
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();

  // 数值兜底：非数字一律置 0，避免表单里出现 NaN
  const toNum = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  try {
    const obj = JSON.parse(raw) as Partial<RecognitionResult>;
    return {
      summary: typeof obj.summary === 'string' ? obj.summary : '',
      carbs: toNum(obj.carbs),
      protein: toNum(obj.protein),
      fat: toNum(obj.fat),
      kcal: toNum(obj.kcal),
      foods: parseFoods(obj.foods),
    };
  } catch {
    // 模型没按 JSON 返回：用正则从文本里抠数值与描述，兜底
    const grab = (key: string): number => {
      const m = raw.match(new RegExp(`"${key}"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)`));
      return m ? parseFloat(m[1]) : 0;
    };
    const sum = raw.match(/"summary"\s*:\s*"([^"]*)"/);
    return {
      summary: sum?.[1] ?? '',
      carbs: grab('carbs'),
      protein: grab('protein'),
      fat: grab('fat'),
      kcal: grab('kcal'),
      foods: [],
    };
  }
}

/** 解析 foods 数组为规范结构；非数组/字段缺失时回退空数组，不阻断合计逻辑 */
function parseFoods(foods: unknown): RecognizedFood[] {
  if (!Array.isArray(foods)) return [];
  const toNum = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return foods
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => ({
      name: typeof f.name === 'string' ? f.name : '',
      grams: toNum(f.grams),
      carbs: toNum(f.carbs),
      protein: toNum(f.protein),
      fat: toNum(f.fat),
      kcal: toNum(f.kcal),
    }))
    .filter((f) => f.name !== '');
}
