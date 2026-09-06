#!/usr/bin/env bash
# ============================================================================
# 记账本 PWA 一键部署脚本
# ----------------------------------------------------------------------------
# 用法（在项目根目录执行，二选一）：
#   bash deploy-pwa.sh
#   ./deploy-pwa.sh          # 需先 chmod +x deploy-pwa.sh
#
# 原理：
#   1. 构建手机端 app/（类型检查 + 打包 → app/dist）
#   2. 用 git worktree 检出 gh-pages 分支到临时目录
#   3. 清空旧产物，复制新产物，提交
#   4. 推送 gh-pages 分支 → GitHub Pages 自动发布
#
# 前置条件：Node.js 18+、git、已配置好 GitHub 远程仓库
# ============================================================================
set -euo pipefail

# —— 站点配置（换仓库名时改这里） ——
GITHUB_USER="python-12138"
REPO_NAME="QtNotes"
SITE_URL="https://${GITHUB_USER}.github.io/${REPO_NAME}/"

# —— 路径 ——
ROOT="$(cd "$(dirname "$0")" && pwd)"
WORKTREE="$ROOT/.gh-pages-worktree"

echo "==> [1/4] 构建 PWA（类型检查 + 打包）..."
(cd "$ROOT/app" && npm run build)

echo "==> [2/4] 检出 gh-pages 分支到临时目录..."
# 清理上次可能残留的 worktree（幂等）
git -C "$ROOT" worktree remove --force "$WORKTREE" 2>/dev/null || true
git -C "$ROOT" worktree add "$WORKTREE" gh-pages

echo "==> [3/4] 替换产物并提交..."
cd "$WORKTREE"
# 清空 worktree 顶层（保留 .git 指针文件）
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r "$ROOT/app/dist/." .
git add -A
if git diff --cached --quiet; then
  echo "    产物无变化，跳过提交"
else
  git commit -m "deploy: PWA 更新 $(date '+%Y-%m-%d %H:%M')"
fi

echo "==> [4/4] 推送 gh-pages 分支..."
git push origin gh-pages

# 清理临时 worktree
cd "$ROOT"
git worktree remove --force "$WORKTREE"

echo ""
echo "=============================================="
echo " 部署完成！访问地址："
echo "   $SITE_URL"
echo ""
echo " 提示：若手机端没更新，是 Service Worker 缓存，"
echo " 可硬刷新一次，或等它自动更新（下次打开时）。"
echo "=============================================="
