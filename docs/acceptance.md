# R1 验收矩阵（含 R0 基线）

| ID | 状态 | 证据/备注 |
|---|---|---|
| MVP-01 | 通过（手工） | Playwright：画像提交进入 `/today`，显示一周任务；待刷新后的人工复核 |
| MVP-02 | 通过（手工） | Playwright：保存米饭 150g 显示 174 kcal，编辑为 200g 后显示 232 kcal |
| MVP-03 | 通过（真实本地 Function E2E） | PowerShell `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`：真实餐图候选、用户改为米饭 150g、确认后写入 IndexedDB；另有结构化失败单测 |
| MVP-04 | 通过（真实本地 Function E2E） | PowerShell `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`：真实运动解析、参数校正/确认、确定性净消耗计算和 IndexedDB 保存；另有未同意降级单测 |
| MVP-05 | 通过（自动化） | `repository.test.ts` 验证 demo 清理不影响 real |
| MVP-06 | 通过（手工/自动化） | demo seed + `agent.test.ts` 统计来自 14 天记录 |
| MVP-07 | 通过（真实本地 Function E2E） | PowerShell `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`：真实模型先调用白名单只读工具，再返回结构化周报；ToolTrace 写入本地数据库 |
| MVP-08 | 通过（自动化 + 真实浏览器拒绝） | `approval.test.ts` 覆盖版本冲突/重复批准；真实 E2E 覆盖演示空间浏览器拒绝提案 |
| MVP-09 | 通过（手工/自动化） | `approval.test.ts` + Playwright 批准后成功消息 |
| MVP-10 | 通过（自动化） | 版本冲突和重复批准测试通过 |
| MVP-11 | 通过 | `npm run typecheck`、`npm test -- --run`（20 tests）、`npm run build`、`npm run test:e2e`；真实模型 E2E 另由 `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e` 通过 |
| MVP-12 | 部分通过 | 源码/dist 不含密钥；当前 `.env` 含真实 key，扫描必须排除该文件；公网响应未验证 |

## R2 验收矩阵

| ID | 状态 | 证据/备注 |
|---|---|---|
| R2.1-01 | 通过（自动化） | `approval.test.ts`：拒绝不改计划、重复批准拒绝、版本冲突拒绝、跨 profile 提案拒绝；`repository.test.ts`：mode 隔离 |
| R2.1-02 | 通过（自动化） | `modelAdapter.test.ts`：未同意、非法结构化 JSON、provider AbortError 均明确降级；Function 固定用途/schema/allowlist |
| R2.1-03 | 通过（自动化） | `agent.test.ts` 与 `approval.test.ts`：模型只读工具、提案必须 awaiting approval，计划写入仅由审批事务触发 |
| R2.2-01 | 通过（自动化 + 页面） | `backup.test.ts`：严格 schema、来源/mode 检查、合并冲突不覆盖；设置页提供选择文件→预览→确认 |
| R2.2-02 | 通过（自动化 + E2E） | `repository.test.ts`：完成/跳过和时间戳持久化；`npm run test:e2e` 覆盖刷新后“已完成” |
| R2.3-01 | 部分通过 | `docs/ai-evaluation.md` 记录一次 gpt-6-luna 能力探针、延迟和 token；真实餐图样本不足，未报告准确率 |
| R2.4-01 | 部分通过 | `npm run build`、Function 类型检查和源码/dist 脱敏检查可做；未获 Netlify 权限，公网鉴权/限流/深链尚未验证 |

`TODO`、`待环境验证` 与 `通过` 严格区分，不以文字描述替代命令证据。
## 2026-10-30 校赛完整版本复核

| P0 | 状态 | 代码/证据 |
|---|---|---|
| 画像、安全、目标 | VERIFIED | `src/domain/safety.ts`、`src/domain/goals.ts`、`tests/unit/safety.test.ts`、`tests/unit/goals.test.ts` |
| provider 配置与脱敏 | VERIFIED | `src/shared/providerConfig.ts`、`src/api/providerClient.ts`、`tests/unit/providerConfig.test.ts` |
| 食物/运动目录与记录 | VERIFIED | `src/db/catalog.ts`、Nutrition/Training 页面、catalog 单测 |
| AI 教练与审批边界 | VERIFIED | agentTools/chatAgent/ChatCoach、真实模型 E2E |
| 身体趋势与计划历史 | VERIFIED | BodyMetrics、固定 14 天窗口、approval 单测 |
| 备份、删除、离线降级 | VERIFIED | repository/backup/errors 单测和 E2E |
| Netlify、手机、账单 | BLOCKED | 外部条件未提供，不能由本地命令代替 |

验证命令：`npm run typecheck`、`npm test -- --run`（15 files / 52 tests）、`npm run build`、`npm run test:e2e`、`$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`。
