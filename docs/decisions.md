# 工程决策记录

## ADR-001 · 空仓库采用 React + Vite + TypeScript

- 背景：工作区无既有应用；PRD/技术总方案冻结 React + Vite + TypeScript。
- 决定：采用 React Router、Dexie、Zod、Vitest；R0 使用轻量 CSS token，不引入无必要组件库。
- 理由：满足冻结技术路线并降低单人 MVP 依赖量。
- 影响：UI 组件使用本地可访问实现，后续可平滑迁移 shadcn/ui。
- 回退：保留纯 CSS 与路由边界，移除 UI 依赖即可。

## ADR-002 · 无真实密钥时保留适配层并显式 mock

- 背景：当前没有模型凭证，无法声称 AI-01～AI-04 已通过。
- 决定：`src/api/modelAdapter.ts` 默认返回“未连接”状态；Agent 的本地统计和工具 trace 仍真实执行，mock 只用于自动化测试且在 UI 标注。
- 理由：不伪造模型成功，同时保持手工路径和 R0 可开发性。
- 回退：配置 Function 环境变量后启用真实请求，不改业务写入边界。

## ADR-003 · 业务查询统一要求 mode

- 背景：demo 不得污染 real。
- 决定：Repository 的所有读写函数首参数为 `mode: real | demo`，demo 种子带 `isSynthetic` 和 `datasetVersion`。
- 回退：数据库版本迁移保留 mode 字段，不提供无 mode 的兼容查询。

## ADR-004 · 第三方模型地址先做能力验证再接入产品

- 背景：当前 `.env` 提供了第三方 Responses 兼容端点和有效密钥，不能仅依据官方规格推断其图像、结构化输出和工具调用兼容性。
- 决定：先用 `scripts/provider-smoke.mjs` 做真实、脱敏的四项能力验证；当前四项均通过。产品 Function 仍只允许受控 provider，不提供任意 URL 透明代理。
- 理由：把“端点可用”与“产品页面已接入”分开记录，避免把 smoke 结果冒充完整业务验收。
- 回退：若后续请求失败，保留手工路径和本地规则 Agent；真实模型不能直接获得数据库写权限。
