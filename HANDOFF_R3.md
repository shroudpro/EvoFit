# EvoFit R3 交接与开发冻结

日期：2026-10-30  
状态：**BLOCKED BY EXTERNAL DEPENDENCY（被外部条件阻塞）**

R3 已完成发布前本地审计、阻断性代理安全修复和回归验证，但尚未满足“立即进入受控预览部署”的最终门禁。当前没有执行 Netlify 部署或公开域名操作，等待负责人提供外部验证条件后再继续。

## 本轮完成

- Function 增加可选 `PREVIEW_ACCESS_TOKEN` 服务端访问认证；前端设置页以会话级访问码发送 Bearer 令牌，令牌不进入构建产物、备份或模型输入。
- Function 增加按 `x-nf-client-connection-ip` 的服务端窗口限流，默认 20 次/5 分钟，支持 `MODEL_RATE_LIMIT_MAX` 与 `MODEL_RATE_LIMIT_WINDOW_MS`。
- CORS 预检允许 `Authorization`；6 MB 请求上限、provider allowlist、15 秒上游超时、固定 purpose/schema 和 800 token 输出限制继续生效。
- 新增访问认证/限流单测；更新 `.env.example`、README 和 `docs/deployment.md`。
- 生成 `docs/release-readiness.md`，记录 13 项核心业务证据、A–I 门禁、风险和部署后待验收项。

## 本轮实际命令

```text
npm run typecheck                         PASS
npm test -- --run                        PASS（7 files / 30 tests）
npm run build                             PASS（bundle >500 kB warning）
npm run test:e2e                          PASS（5 场景）
$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e
                                           PASS（5 + 3 个真实模型场景）
npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node
                                           PASS
npm run smoke:provider                    PASS（4/4 HTTP 200，单次探针）
```

桌面 1440×900 与移动浏览器模拟 375×812 均无水平溢出；真实手机尚未验收，不能用模拟结果替代。

## 环境变量名称

服务器 Function：`MODEL_API_KEY`、`MODEL_BASE_URL`、`MODEL_ID`、`APP_ORIGIN`、`PREVIEW_ACCESS_TOKEN`、`MODEL_RATE_LIMIT_MAX`、`MODEL_RATE_LIMIT_WINDOW_MS`。  
浏览器安全配置：`VITE_API_BASE_URL`、`VITE_APP_MODE`。  
实际密钥不得写入仓库、`VITE_*` 变量、文档或聊天。

## 推荐的安全版本快照

当前 `master` 工作区包含 R1/R2 以及本轮 R3 改动，均未提交；没有执行 reset、清库、覆盖 `.env` 或删除 IndexedDB。负责人应先审阅 `git status` 与 `docs/release-readiness.md`，再将整个工作区创建为一个可回滚的本地提交/标签，保留当前 demo dataset version 和上一份可复现构建。

## 受控预览步骤（仅待授权后执行）

1. 创建上述安全版本快照。
2. 在 Netlify 绑定仓库；沿用 `netlify.toml` 的 `npm run build`、`dist` 和 Function 目录。
3. 只在 Netlify 环境变量中配置服务器变量，并设置不可公开的 `PREVIEW_ACCESS_TOKEN`。
4. 开启站点访问保护/等效 SSO，不设置公开域名，不开放无令牌 Function。
5. 发布受控预览后按 `docs/release-readiness.md` 的部署后门禁逐项验收。
6. 若异常，回滚到上一份站点/Function 版本；先导出 IndexedDB 备份，不手工删除真实数据。

## 仍阻塞的验收

- Netlify 权限、真实域名 CORS、线上访问码、持久化限流和账单配额。
- 真实预览深链刷新。
- 真实 iOS/Android 设备验收。
- provider 账单/费用证据。

在上述事项完成并复核 A–I 前，保持开发冻结，不新增功能、不做 UI 美化、不自动部署。
