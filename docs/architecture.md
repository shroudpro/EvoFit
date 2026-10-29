# EvoFit R0 架构

## 运行边界

浏览器 React UI → application services → Dexie（IndexedDB）。模型请求只经过 `/.netlify/functions/ai-proxy`，Function 读取服务器环境变量；浏览器不会读取或返回服务端密钥。模型输出经 Zod 与业务安全规则校验，模型不能直接写计划。

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
4. Agent 只读工具计算统计，生成 `PlanProposal(status=awaiting_approval)` 和 `ToolTrace`。
5. 用户批准后 `applyApprovedProposal` 在一个事务中校验状态、basePlanVersion 和安全规则，再创建新计划版本与审计记录。

## 权限

模型：只读工具 + create proposal；禁止 apply。用户点击批准是唯一写计划入口。
