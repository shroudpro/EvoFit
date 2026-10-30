# EvoFit R1 · 真实 AI 集成开发版

EvoFit 是一个本地优先的成年健康记录与自适应计划原型。R0 纵向闭环包括成年画像、简化一周训练计划、手工饮食/运动记录、固定 14 天演示数据、本地确定性统计、只读工具轨迹和用户审批后的计划版本事务。

## 本地运行

```powershell
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

打开 `http://localhost:5173`。浏览器记录保存在 IndexedDB，左侧可以切换真实/演示空间；演示空间支持一键重置，不会删除真实空间记录。

默认 E2E 会自动启动并回收 Vite：`npm run test:e2e`。PowerShell 设置 `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e` 会额外自动启动并回收 `scripts/local-ai-proxy.mjs`，验证真实餐图、运动解析和 Agent tool loop；该场景会实际消耗模型配额。

## 模型状态

真实模型请求已通过 `netlify/functions/ai-proxy.ts` 受控接入：餐图只生成候选，运动只提取字段，周报只生成待审批提案；营养、能量和计划写入仍由本地确定性代码与用户操作完成。没有 Function 配置、未同意或结构化结果失败时会明确降级到手工/本地规则路径。本地测试中的 mock 只用于验证结构化路径，界面不会把 mock 标成正式 AI 成功。真实模型默认模型名为 `gpt-6-luna`，密钥只能放服务器环境变量。

复制 `.env.example` 为 `.env` 仅用于本地占位；不要把密钥放入 `VITE_*` 变量、仓库或日志。

受控 Netlify 预览必须在 Function 环境配置 `PREVIEW_ACCESS_TOKEN`，用户在“我的”页面输入访问码后才会调用模型代理；Function 默认按客户端 IP 限制为每 5 分钟 20 次请求。`MODEL_RATE_LIMIT_MAX` 和 `MODEL_RATE_LIMIT_WINDOW_MS` 可在受控环境中收紧。

## 代码结构

- `src/shared`：类型、Zod schema 与通用工具。
- `src/db`：Dexie 数据库、mode 隔离仓储、demo seed、审批事务。
- `src/domain/calculation.ts`：REE、营养、kJ/kcal、MET、趋势质量的确定性函数。
- `src/api`：模型适配状态和本地 Agent 编排。
- `src/pages`：六个入口与今日/饮食/训练/成长/设置页面。
- `netlify/functions/ai-proxy.ts`：受控模型代理，不读取 IndexedDB。
- `scripts/local-ai-proxy.mjs`：受控本地 Function harness，仅用于本地真实 E2E。
- `tests/unit`：计算、隔离、审批和 Agent trace 测试。

## 交付记录

请查看 [HANDOFF.md](HANDOFF.md)、[docs/progress.md](docs/progress.md)、[docs/acceptance.md](docs/acceptance.md)、[docs/architecture.md](docs/architecture.md)、[docs/deployment.md](docs/deployment.md)。真实提供商兼容性可用 `npm run smoke:provider` 重复验证；未执行的公网部署和页面真实餐图链路不会被宣称为已通过。
