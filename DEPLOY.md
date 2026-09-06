# PWA 部署教程（GitHub Pages）

手机端 PWA 通过 `deploy-pwa.sh` 脚本一键构建并发布到 GitHub Pages，免费、HTTPS、支持离线安装。

---

## 一、前置条件

| 要求 | 说明 |
|---|---|
| Node.js 18+ | 构建 PWA 需要 |
| git | 推送 gh-pages 分支 |
| GitHub 公开仓库 | 免费 Pages 仅公开仓库可用 |
| 代码已推送 | `main` / `dev` 分支已在远程 |

## 二、首次部署（一次性配置）

只需配置一次 GitHub Pages 的来源分支：

1. 打开仓库 **Settings → Pages**
2. 在 **Build and deployment** 下：
   - **Source** 选 `Deploy from a branch`
   - **Branch** 选 `gh-pages`，目录选 `/ (root)`
   - 点 **Save**
3. 回到项目根目录，运行脚本：

```bash
bash deploy-pwa.sh
```

首次运行后，稍等 1–2 分钟，访问：

```
https://python-12138.github.io/QtNotes/
```

> 若换了 GitHub 用户名或仓库名，改脚本顶部的 `GITHUB_USER` 和 `REPO_NAME` 两个变量即可。

## 三、日常更新（改完代码后）

改了手机端代码后，在项目根目录执行一条命令即可重新发布：

```bash
bash deploy-pwa.sh
```

脚本会自动完成：**构建 → 检出 gh-pages → 替换产物 → 提交 → 推送**，无需手动操作。

## 四、脚本做了什么（原理）

```
1. npm run build           # 在 app/ 下类型检查 + 打包，产物在 app/dist
2. git worktree add        # 把 gh-pages 分支检出到临时目录 .gh-pages-worktree
3. 清空旧产物 + 复制新产物  # 用 app/dist 内容替换 worktree 全部文件
4. git commit + push       # 提交并推送 gh-pages 分支
```

`gh-pages` 分支只存 PWA 的**构建产物**（index.html / assets / manifest / sw.js / icons），与源码分支（main/dev）完全分离。GitHub Pages 检测到 gh-pages 分支更新后自动发布。

## 五、手机端安装 PWA

1. 手机浏览器打开 `https://python-12138.github.io/QtNotes/`
2. **Chrome/安卓**：菜单 →「添加到主屏幕」
3. **iPhone/Safari**：底部「分享」→「添加到主屏幕」
4. 桌面出现「记账本」图标，点开即全屏独立运行、离线可用

## 六、常见问题

| 问题 | 原因 & 解决 |
|---|---|
| 手机端更新后没变化 | Service Worker 缓存了旧版本。硬刷新一次，或关掉重开等它自动更新（`registerType: autoUpdate`） |
| 构建报类型错误 | 改了代码但类型没对齐，看 `npm run build` 的输出修 |
| push 报 SSL 错误 | 本地网络到 GitHub 不稳定，重试 `bash deploy-pwa.sh` |
| 首次访问 404 | Pages 刚启用还在构建，等 1–2 分钟；或检查 Settings → Pages 的 Branch 是否选了 gh-pages |
| 改了仓库名 | 改 `deploy-pwa.sh` 顶部的 `GITHUB_USER` / `REPO_NAME`，并同步改 README |

## 七、数据安全

- 手机端数据存**本机浏览器 IndexedDB**，不经过 GitHub
- 同步功能是「手机 → 你自己电脑的服务端」，也不走 GitHub
- `gh-pages` 上只有**界面代码**，没有任何用户数据
