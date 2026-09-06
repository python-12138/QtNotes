# 记账本（Bookkeeping PWA）

一个纯本地的记账软件，通过 PWA 技术实现，可在 iPhone / 安卓 / 电脑上使用——无需 Mac、无需 Apple 开发者账号、无需 App Store，完全免费。

## 技术栈

| 类别 | 技术 | 说明 |
|---|---|---|
| 框架 | Vue 3 + TypeScript | 组合式 API + 类型安全，减少记账金额相关的 bug |
| 构建 | Vite | 快速构建与开发服务器 |
| 数据层 | Dexie.js（IndexedDB） | 本地离线存储，数据保存在浏览器 |
| 图表 | ECharts + vue-echarts | 统计饼图、趋势图 |
| PWA | vite-plugin-pwa（Workbox） | manifest + Service Worker，支持离线与安装 |
| 日期 | dayjs | 日期格式化 |
| 图标 | Emoji + 自绘 SVG | 无需图标库 |

## 功能

- **多账本**：可新建多个账本（分类/账户/流水各自独立），首页一键切换；支持「普通账本」与「用车费用」两种类型
- **用车费用账本**：记加油时录「油费类型 + 加油升数 + 行驶公里数」，自动算出百公里油耗与每公里费用；统计页展示「最近一次油耗 + 综合油耗 + 每公里费用」
- **记一笔**：支出/收入切换、金额键盘、分类、账户、日期、备注
- **首页**：本月收入/支出/结余、最近账单
- **明细**：按月筛选、按日期分组、类型筛选
- **统计**：分类占比饼图、每日收支趋势图（车辆账本额外含油耗统计）
- **分类/账户管理**：内置默认分类与账户，支持自定义增删；「油费」等系统分类不可删除
- **数据备份**：JSON 导出/导入
- **PWA**：可安装到主屏幕、离线可用、深色模式

## 本地运行

需要 Node.js 18+。

```bash
npm install
npm run dev      # 开发模式
npm run build    # 生产构建（类型检查 + 打包）
npm run preview  # 预览构建产物
npm run icons    # 重新生成 PWA 图标（需要时）
```

## 部署到 GitHub Pages（免费）

一键脚本部署，完整教程见 [DEPLOY.md](DEPLOY.md)。

```bash
bash deploy-pwa.sh
```

访问 `https://<用户名>.github.io/<仓库名>/`。

> `app/vite.config.ts` 中 `base: './'` 使用相对路径，部署到任意子路径都无需改配置。

## 在 iPhone 上使用

1. 用 **Safari** 打开部署后的网址。
2. 点底部「分享」按钮 →「**添加到主屏幕**」。
3. 桌面会出现「记账本」图标，点击即可像原生 App 一样使用（支持离线）。

## 数据备份

数据保存在本机浏览器 IndexedDB 中，**不上传任何服务器**。可在「我的 → 数据备份」中导出 JSON 文件；换设备时用「导入数据」恢复。

## 目录结构

```
QTNotes/
├── .github/workflows/deploy.yml   # GitHub Actions 部署
├── public/icons/                  # PWA 图标
├── scripts/generate-icons.mjs     # 图标生成脚本
├── src/
│   ├── db/                        # 类型、Dexie 数据库、种子数据、预设
│   ├── store/                     # 响应式数据 hooks（Dexie liveQuery）
│   ├── components/                # 金额键盘、账目条目、选择器、弹窗等
│   ├── pages/                     # 首页 / 记一笔 / 明细 / 统计 / 设置
│   ├── plugins/                   # ECharts 按需注册
│   ├── utils/                     # 金额、日期、id、主题、油耗计算
│   └── styles/index.css           # 全局样式（CSS 变量，浅色/深色主题）
└── vite.config.ts                 # Vite + PWA 配置
```

## 金额精度说明

所有金额统一以「分」（整数）存储，避免浮点误差；展示时再格式化为「元」（两位小数、千分位）。
