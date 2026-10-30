# Netlify 部署与回滚

> 当前阿里云公网部署请优先阅读：[阿里云 nip.io 部署与验收](./alicloud-nipio-deployment.md)。本文保留 Netlify 方案，作为历史部署路径和 Function 边界说明。

## 本地

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

## Netlify

`netlify.toml` 已配置 `dist`、`netlify/functions` 和 SPA fallback。只在 Netlify 控制台配置 `MODEL_API_KEY`、`MODEL_BASE_URL`、`MODEL_ID`、`APP_ORIGIN`、`PREVIEW_ACCESS_TOKEN`、`MODEL_RATE_LIMIT_MAX`、`MODEL_RATE_LIMIT_WINDOW_MS`、`MODEL_UPSTREAM_TIMEOUT_MS` 等服务器变量；不要配置 `VITE_*` 密钥。Function 只允许白名单模型地址和固定 purpose，并只向配置的 Origin 返回 CORS 头。

受控预览必须设置 `PREVIEW_ACCESS_TOKEN`。用户在“我的 → 受控预览”输入访问码后，浏览器只在当前会话为 Function 请求发送 `Authorization: Bearer …`；令牌不会进入构建产物、备份或模型输入。Function 还按 Netlify 客户端 IP 做服务端窗口限流（默认 20 次/5 分钟），超限返回 429。该限流是无状态函数实例上的成本护栏，部署后仍需检查 Netlify 访问保护和账单配额。

当前没有 Netlify 访问授权，因此未执行公网部署；发布前需验证深链刷新、Function 限流、模型错误降级和密钥扫描。

## R2 上线前检查结果

- SPA fallback：`netlify.toml` 已将 `/*` 回退到 `/index.html`，本地 `npm run build` 已验证产物生成。
- Function：入口为 `netlify/functions/ai-proxy.ts`，固定 `purpose`、输出 JSON schema、provider allowlist、6 MB 请求上限和默认 45 秒上游超时；密钥只从服务器变量读取。可通过 `MODEL_UPSTREAM_TIMEOUT_MS` 调整超时。
- 浏览器边界：构建产物只包含 `VITE_API_BASE_URL` 等前端安全变量；源码/dist 脱敏扫描不包含 API key。`.env` 仅用于受控本地测试并被 Git 忽略。
- 成本与访问：Function 要求 `PREVIEW_ACCESS_TOKEN`，并有服务端 IP 窗口限流；Netlify 公网发布前仍必须配置站点访问保护和账单/用量上限，不能把浏览器同意标志当作身份认证。
- 本地数据：IndexedDB 不会自动上传；只有用户明确同意的最小摘要/图片才会发送到代理。未进行真实私人健康数据上传。
- 移动端与演示：代码有响应式断点和 demo 重置按钮，但手机真机验收仍待执行。

当前结论：本地预览和发布配置准备完成，公网部署、线上鉴权/限流、真实域名 CORS 和移动端真机验收均为阻塞项，不能宣称已上线。

本地真实闭环可用 `npm run dev:function` 启动受控 Function；或直接执行 `PowerShell $env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`，E2E 会自动管理该进程。两者都会读取本地 `.env`，仅适用于受控开发环境。

## 回滚

保留上一份可复现构建和 demo dataset version；线上异常先回滚站点/Function 版本，不手工删除 IndexedDB 数据。涉及 schema 不可逆变更时先导出备份。
