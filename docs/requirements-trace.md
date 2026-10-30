# EvoFit R0 需求追踪

| PRD / MVP | 工作包 | 自动化验证 | 状态 |
|---|---|---|---|
| P0-01, MVP-01 | WP-02, WP-04 | `tests/unit/repository.test.ts`, `scripts/e2e-smoke.mjs`, 手工刷新 | VERIFIED（R0） |
| P0-02 | WP-03, WP-04 | `tests/unit/calculations.test.ts` | VERIFIED（R0） |
| P0-03/04, MVP-02/03 | WP-05/R1 | `tests/unit/modelAdapter.test.ts`、E2E 同意降级、候选确认持久化 | R1 部分 VERIFIED：真实图片页面待 Function 环境 |
| P0-05/06, MVP-04 | WP-06/R1 | `tests/unit/calculations.test.ts`、`modelAdapter.test.ts`、真实 Function E2E | VERIFIED（R1）：真实字段确认后由确定性函数计算 |
| P0-08 | WP-04 | 页面集成/手工 | VERIFIED（R0） |
| P0-09/10, MVP-06/07 | WP-07/R1 | `tests/unit/agent.test.ts`、受控 `weekly_review` schema、真实 Function E2E tool loop | VERIFIED（R1）：模型调用白名单只读工具并生成待审批提案 |
| P0-11, MVP-08/09/10 | WP-08 | `tests/unit/approval.test.ts`, 手工批准 | VERIFIED（R0） |
| P0-12, MVP-05/06 | WP-02, WP-07 | `tests/unit/repository.test.ts` | VERIFIED（R0） |
| P0-13 | WP-02, WP-08 | 导出路径 | 部分完成：导出已实现，导入待 R1 |
| P0-14, MVP-11/12 | R0 Gate | typecheck/test/build/E2E/密钥扫描 | 本地 VERIFIED；公网待授权 |

## R2 追踪

| R2 需求 | 代码/文档 | 自动化验证 | 状态 |
|---|---|---|---|
| 审批拒绝、重复批准、版本和作用域冲突 | `src/db/database.ts` | `tests/unit/approval.test.ts` | VERIFIED |
| demo/real 隔离与刷新一致性 | `src/db/database.ts`, `src/api/agent.ts` | `tests/unit/repository.test.ts`, `tests/unit/agent.test.ts`, `npm run test:e2e` | VERIFIED |
| AI 失败/非法 JSON/超时/缺少同意降级 | `src/api/modelAdapter.ts`, `netlify/functions/ai-proxy.ts` | `tests/unit/modelAdapter.test.ts`, `tests/unit/aiProxy.test.ts` | VERIFIED |
| 严格备份预览、mode 检查和无副作用合并 | `src/shared/schemas.ts`, `src/db/database.ts`, `src/pages/Settings.tsx` | `tests/unit/backup.test.ts` | VERIFIED |
| 训练完成/跳过、时间戳、周报完成率 | `src/db/database.ts`, `src/domain/calculation.ts`, `src/pages/Training.tsx`, `src/pages/Progress.tsx` | `tests/unit/repository.test.ts`, `tests/unit/calculations.test.ts`, `npm run test:e2e` | VERIFIED |
| 真实 AI 质量评测和费用边界 | `docs/ai-evaluation.md`, `scripts/provider-smoke.mjs` | `npm run smoke:provider`（单次真实探针） | 部分 VERIFIED；准确率/费用待样本和账单 |
| Netlify 上线准备 | `netlify.toml`, `docs/deployment.md` | 本地 build/Function 类型检查 | 部分 VERIFIED；公网权限阻塞 |

状态只在真实命令或人工验收完成后更新为 VERIFIED/DONE。
## 校赛完整版本追踪（2026-10-30）

| 需求 | 状态 | 实现证据 | 验证 |
|---|---|---|---|
| 用户配置 provider URL/key/model | VERIFIED | `providerConfig.ts`、`Settings.tsx` | provider 单测、E2E |
| 全局 AI 教练多轮工具调用 | VERIFIED | `agentTools.ts`、`chatAgent.ts`、`ChatCoach.tsx` | Agent/chat 单测、真实 E2E |
| 画像、安全、目标和蛋白质 | VERIFIED | `safety.ts`、`goals.ts`、Onboarding/Today | safety/goals 单测 |
| 食物搜索、动作目录、训练改期 | VERIFIED | `catalog.ts`、Nutrition/Training | catalog 单测、E2E |
| 身体指标 14 天趋势 | VERIFIED | `BodyMetrics.tsx`、`bodyMetrics.ts` | bodyMetrics 单测、E2E |
| 提案历史、恢复和 mode 隔离 | VERIFIED | database 事务、Progress/Settings | approval/repository/backup 单测 |
| 部署门禁与真机 | BLOCKED | Netlify/设备/账单外部条件 | 待负责人提供证据 |
