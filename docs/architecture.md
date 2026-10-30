# EvoFit R0 架构

## 运行边界

浏览器 React UI → application services → Dexie（IndexedDB）。模型请求只经过 `/.netlify/functions/ai-proxy`，Function 读取服务器环境变量；浏览器不会读取或返回服务端密钥。Function 按用途固定 Responses JSON Schema，并限制 provider allowlist。模型输出经 Zod 与业务安全规则校验，模型不能直接写计划。

## 目录

- `src/shared/schemas.ts`：业务实体和模型输出契约。
- `src/db/`：Dexie 数据库、模式隔离仓储、demo seed 与审批事务。
- `src/domain/`：REE、营养、MET、趋势和安全规则纯函数。
- `src/api/`：模型适配与本地 Agent 编排。
- `src/pages/`：onboarding、today、nutrition、training、progress、settings。
- `src/components/`：布局和状态组件。
- `netlify/functions/ai-proxy.ts`：受控用途、白名单和响应脱敏的代理。

## 数据流

1. 用户在 onboarding 保存 `UserProfile` 和 `TrainingPlan`（`mode=real`）。
2. 手工餐食/运动写入对应 mode；今日页从仓储实时查询，不持久化伪造汇总。
3. demo 导入在单独 mode 事务中清理并写入固定 14 天数据。
4. Agent 先执行本地只读统计；用户同意模型请求后，模型只能请求 Function 白名单中的只读工具，浏览器执行这些工具并回放结果，最终生成 `PlanProposal(status=awaiting_approval)` 和 `ToolTrace`。
5. 用户批准后 `applyApprovedProposal` 在一个事务中校验状态、basePlanVersion 和安全规则，再创建新计划版本与审计记录。

餐图和自然语言运动都遵循“模型候选 → 用户确认 → 本地确定性计算/营养映射 → IndexedDB”顺序。模型不提供营养或能量数值；未知营养项保留为 `null`，未知活动不保存虚构消耗。

## 权限

模型：只读工具 + create proposal；禁止 apply。用户点击批准是唯一写计划入口。

## R2 数据完整性

- 备份结构由 Zod 严格 schema 校验，导入前检查来源、版本和所有实体的 mode；预览阶段不写库，确认后以 Dexie 事务合并，ID 冲突保留本地记录。
- 训练任务完成/跳过状态、完成时间和跳过时间写入当前计划记录，周报的训练完成率由本地确定性统计计算。
- 模型请求有 15 秒超时；非法 JSON、provider 错误、未同意和超时均只产生降级状态，不直接写入计划或健康记录。
## 校赛完整版本实现（2026-10-30）

当前实现继续采用 React + Vite + TypeScript + Dexie + Zod。Dexie v3 增加 settings、goals、bodyMetrics、conversations、messages、foods 和 exerciseCatalog；迁移只补 profile 的安全默认值，不虚构指标。provider client 按 browser direct / function proxy 统一超时、schema 和错误状态，浏览器 key 不进入备份；Function 对餐图、运动和周报使用服务端固定 schema。

Agent 通过 `agentTools` 注册表执行 mode/profile 作用域校验，`chatAgent` 只保存最近 12 条上下文并最多执行 6 轮工具调用。模型只能读取授权数据或创建 `awaiting_approval` proposal；有效计划写入仍由 `applyApprovedProposal` / `restorePlanVersion` 本地事务完成。ChatCoach、BodyMetrics 和今日时间线均从当前 mode 仓储读取。
