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

## ADR-005 · 受控 Function + 用户同意 + 本地确定性写入

- 背景：R1 需要真实模型能力，但 API 密钥不能进入静态资源，模型也不能直接写入健康记录或计划。
- 决定：浏览器仅发送固定用途和最小输入到 `ai-proxy`；Function 固定输出 schema；餐图营养和运动能耗全部在本地确定性代码中计算，用户确认后才写入 IndexedDB。
- 理由：把密钥、结构化校验、业务规则和可审批写入边界分开，模型失败时可以无损回退手工路径。
- 回退：Function 不可用、未同意或结构化解析失败时，显示原因并保留手工录入。

## ADR-006 · Tool loop 使用受控 input 回放

- 背景：当前第三方 Responses 兼容端点支持 function call，但真实请求表明 HTTP `previous_response_id` 需要官方 OpenAI API key 账户。
- 决定：适配器保留用户输入、模型 function call output 和本地 function_call_output，在最多 3 轮内回放到下一次 Responses 请求；Function 仍只提供固定只读工具定义。
- 理由：兼容当前已验证的 provider，同时保持模型不能直接访问 IndexedDB 或计划写入权限。
- 证据：真实本地 Function E2E 的 Agent 场景通过；直接使用 `previous_response_id` 的脱敏探测返回 `400 unsupported_parameter`，因此没有把它作为默认协议。

## ADR-007 · 备份采用严格校验后的当前 mode 合并

- 背景：R1 只有导出，没有导入；覆盖式恢复可能破坏真实数据或把 demo 写入 real。
- 决定：备份必须包含 `source=evofit-local`、`schemaVersion=1`、mode 和严格实体数组；导入先预览，再在用户确认后只插入目标 mode 中不存在的 ID，冲突保留本地记录。
- 理由：解析和 mode 检查在事务前完成，异常不会产生部分写入，也不覆盖真实记录。

## ADR-008 · 训练任务状态写回当前计划

- 背景：训练任务 status 原先只存在 seed/内存对象，刷新后丢失。
- 决定：在 Dexie 当前计划记录中更新 `status`、`completedAt`/`skippedAt` 和 `updatedAt`；不升 Dexie 版本，因为新增字段是兼容的可选字段。
- 理由：今日页、训练页和周报读取同一份持久状态，避免另建表造成一致性分叉。

## ADR-009 · 模型请求固定超时并显式降级

- 背景：浏览器和 Netlify Function 请求可能无限等待，用户无法判断是否应回到手工路径。
- 决定：浏览器适配器和 Function 上游请求均使用 15 秒 AbortController 超时，分别返回“模型请求超时”/`UPSTREAM_TIMEOUT`，不重试、不写入业务数据。
- 影响：慢 provider 会进入本地降级，但不会通过延迟掩盖数据状态问题。
