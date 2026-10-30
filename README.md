# EvoFit 校赛完整版本 · 本地完成版

EvoFit 是一个本地优先的成年健康记录与自适应计划原型。它覆盖健康画像、个性化训练计划、饮食与运动记录、14 天演示数据、本地确定性统计、只读 Agent 工具轨迹、待审批计划提案、计划版本事务，以及当前模式的数据备份与恢复。

当前状态：**本地校赛完整版本已完成**。画像、目标、食物/训练、身体指标、AI 教练、提案审批、计划历史、备份和离线降级均已实现并通过本地回归；Netlify、真实手机和账单仍受外部条件阻塞。

## 已实现的核心闭环

- 成年用户画像：年龄门槛、健康声明、目标、器械条件和时区。
- 目标驱动的一周训练计划，并支持任务完成/跳过状态持久化。
- 手工餐食记录，以及真实模型返回的餐图候选；用户确认名称和克重后才保存，营养值来自本地食物表。
- 手工运动记录，以及真实模型返回的自然语言运动参数；用户确认后由本地 MET 公式计算能耗。
- 今日驾驶舱从当前 `real` 或 `demo` 空间实时读取数据。
- 独立的 14 天合成演示数据，重置演示空间不会删除真实空间。
- 本地确定性统计和只读 Agent 工具轨迹；模型只能生成结构化计划提案。
- 用户批准后才通过事务创建新计划版本；拒绝、重复批准、版本冲突和跨画像提案均不会修改原计划。
- 当前模式 JSON 导出、严格 schema 校验、导入预览、冲突保留和事务合并。

所有能量、MET、营养和趋势数字都是估算，不构成诊断或治疗建议。

## 本地运行

```powershell
npm ci
npm run typecheck
npm test -- --run
npm run build
npm run dev
```

打开 `http://localhost:5173`。数据默认保存在浏览器 IndexedDB。首次访问会进入画像页；完成画像后可在侧边栏切换真实空间和演示空间。

本地真实模型请求建议保持 `.env` 中 `VITE_API_BASE_URL=/.netlify/functions`。Vite 会把同源请求代理到 `127.0.0.1:8888`，避免浏览器对 `localhost`、IPv4 和 CORS 的差异；修改 `.env` 或 `vite.config.ts` 后需要重启 `npm run dev`。

默认 E2E 会自动启动并回收 Vite：

```powershell
npm run test:e2e
```

真实模型本地回归会自动启动受控 Function harness，并消耗当前 provider 配额。只使用去敏测试输入：

```powershell
$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e
```

本地 Function 也可以单独启动：

```powershell
npm run dev:function
```

## 当前校赛完整版本验证结果

| 命令 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm test -- --run` | 62/62 tests 通过 |
| `npm run build` | 通过；仅有单 bundle 超过 500 kB 的警告 |
| `npm run test:e2e` | 6 个完整 P0 场景通过 |
| `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e` | 6 个本地场景 + 3 个真实模型场景通过 |
| Netlify Function 独立类型检查 | 通过 |
| `npm run smoke:provider` | Responses 文本、结构化 JSON、图像 capability、tool call 均 HTTP 200 |

桌面 1440×900 和移动浏览器模拟 375×812 均无水平溢出。浏览器模拟不能替代真实手机验收。

## 模型与隐私边界

真实模型请求经过 `netlify/functions/ai-proxy.ts`：

- 浏览器不持有模型 API key；密钥只从服务器环境变量读取。
- 餐图只返回食物名、克重候选和置信说明，不返回营养数值。
- 运动只提取参数，MET 和净消耗由本地确定性代码计算。
- 周报模型只能调用固定的只读工具并生成待审批提案，不能直接应用计划。
- 缺少同意、未配置、超时、429、非法 JSON 或非法结构化结果都会回到手工/本地规则路径。
- Function 限制请求体 6 MB，图片客户端限制 4 MB，上游超时默认 45 秒（可由 `MODEL_UPSTREAM_TIMEOUT_MS` 调整），模型输出最多 800 tokens，并使用 provider allowlist。
- 受控预览设置 `PREVIEW_ACCESS_TOKEN` 后，Function 要求 Bearer 访问码；设置页只在当前浏览器会话保存访问码。
- Function 默认按 Netlify 客户端 IP 限制为每 5 分钟 20 次请求，可通过 `MODEL_RATE_LIMIT_MAX` 和 `MODEL_RATE_LIMIT_WINDOW_MS` 收紧。

复制 `.env.example` 为 `.env` 仅用于本地配置。不要把任何密钥放入 `VITE_*` 变量、仓库、构建产物、日志或文档。

## 环境变量

前端安全变量：

- `VITE_API_BASE_URL`：Function 基础路径，例如 `http://localhost:8888/.netlify/functions`。
- `VITE_APP_MODE`：本地默认模式，通常为 `real`。

仅供 Netlify Function 使用的服务器变量：

- `MODEL_API_KEY` 或 `OPENAI_API_KEY`
- `MODEL_BASE_URL` 或 `OPENAI_BASE_URL`
- `MODEL_ID` 或 `OPENAI_MODEL`
- `APP_ORIGIN`
- `PREVIEW_ACCESS_TOKEN`
- `MODEL_RATE_LIMIT_MAX`
- `MODEL_RATE_LIMIT_WINDOW_MS`
- `MODEL_UPSTREAM_TIMEOUT_MS`

受控预览必须配置 `PREVIEW_ACCESS_TOKEN`，并启用 Netlify 站点访问保护或等效 SSO。不要把服务器变量改成 `VITE_*` 变量。

## 代码结构

- `src/shared`：类型、Zod schema 和通用工具。
- `src/db`：Dexie 数据库、版本迁移、mode 隔离、演示数据、审批事务、备份恢复。
- `src/domain/calculation.ts`：REE、营养、kJ/kcal、MET 和趋势质量计算。
- `src/api`：模型适配器和本地 Agent 编排。
- `src/pages`：画像、今日、饮食、训练、成长和设置页面。
- `netlify/functions/ai-proxy.ts`：受控模型代理，不读取 IndexedDB。
- `scripts/local-ai-proxy.mjs`：本地 Function harness，仅用于受控真实 E2E。
- `tests/unit`：计算、隔离、审批、备份、模型适配器和 Function 测试。

## Netlify 受控预览

`netlify.toml` 已配置：

- 构建命令：`npm run build`
- 发布目录：`dist`
- Function 目录：`netlify/functions`
- SPA 深链回退：`/* → /index.html`

部署前需要先创建当前工作区的可回滚安全版本快照，再在 Netlify 配置服务器变量和访问保护。部署后必须验证真实域名的 CORS、访问码、限流、账单配额、深链刷新、模型失败降级和真实手机体验。

当前尚无 Netlify 权限、云端账单证据或真实手机验收，因此不能宣称已部署或已完成公网验收。不要自动部署、不要设置公开域名、不要开放无保护模型代理。

故障恢复时回滚站点/Function 版本；本地数据先导出 JSON 备份，不手工删除真实 IndexedDB 数据。

## 文档

- [R3 发布准备审计](docs/release-readiness.md)
- [最新交接与开发冻结](HANDOFF-LATEST.MD)
- [部署与回滚](docs/deployment.md)
- [阿里云 nip.io 部署与验收](docs/alicloud-nipio-deployment.md)
- [验收矩阵](docs/acceptance.md)
- [需求追踪](docs/requirements-trace.md)
- [架构说明](docs/architecture.md)
- [AI 评测记录](docs/ai-evaluation.md)
- [校赛完整版本准备报告](docs/school-competition-complete-readiness.md)
- [开发进度](docs/progress.md)

当前 `master` 已按阶段提交本地实现；没有执行 reset、清库或覆盖 `.env`。在外部门禁完成前，不执行公网部署。
