# EvoFit R3 发布准备审计

审计日期：2026-10-30  
审计范围：R1/R2 当前工作区 + R3 本轮真实回归  
最终状态：**BLOCKED BY EXTERNAL DEPENDENCY（被外部条件阻塞）**

本轮没有部署 Netlify、没有公开域名、没有提交或打印任何密钥，也没有清空 real IndexedDB。R1/R2 的未提交改动保留在当前 `master` 工作区。

## 核心业务闭环

| 功能 | 状态 | 代码位置与验证证据 |
|---|---|---|
| 成年用户健康画像 | PASS | `src/pages/Onboarding.tsx` 校验 18 岁门槛、健康声明并写入 profile；R3 `npm run test:e2e` 的 `onboarding-to-today` 通过。 |
| 个性化目标与训练计划 | PASS | `Onboarding.tsx` 生成目标相关的一周计划；同一 E2E 进入今日并显示任务。 |
| AI 餐图候选、重量确认、营养保存 | PASS（功能样本） | `src/api/modelAdapter.ts`、`src/pages/Nutrition.tsx`；R3 真实模型 E2E 的 `real-model-meal-loop` 通过，候选经用户改名/改重后写入 IndexedDB；识别准确率仍无足够样本。 |
| 自然语言运动解析与能耗计算 | PASS | `modelAdapter.ts` 只提取字段，`src/domain/calculation.ts` 计算 MET/净消耗；R3 `real-model-exercise-loop` 通过。 |
| 今日驾驶舱汇总 | PASS | `src/pages/Today.tsx` 从当前 mode 仓储实时读取；E2E 画像、餐食保存和刷新场景通过。 |
| 训练完成/跳过持久化 | PASS | `src/db/database.ts:updateTrainingExerciseStatus`；单测及 E2E 刷新后“已完成”通过。 |
| 14 天模拟数据独立导入 | PASS | `src/db/seed.ts` 与 `mode=demo` 隔离；`repository.test.ts`、真实 E2E demo 切换通过。 |
| Agent 历史读取与周报 | PASS | `src/api/agent.ts` 只读工具轨迹 + `generateWeeklyReview`；真实 E2E `real-model-agent-tools-and-rejection` 通过。 |
| 规则校验的计划提案 | PASS | `weeklyReviewSchema`、`safeModelChanges` 和固定字段白名单；模型没有 apply 工具。 |
| 批准创建新版本、拒绝不修改 | PASS | `applyApprovedProposal` 事务校验 profile、状态和版本；`approval.test.ts` 及真实浏览器拒绝场景通过。 |
| demo/real 完全隔离 | PASS | 所有仓储查询带 `mode`，`resetDemoData` 不触碰 real；`repository.test.ts` 通过。 |
| 备份导出、预览、校验、恢复 | PASS | `backupSchema`、`previewModeBackupWithConflicts`、`importModeBackup` 事务合并；`backup.test.ts` 与 E2E 预览/确认通过。 |
| 刷新后数据和审批状态一致 | PASS | IndexedDB v2、页面重新读取最新记录；训练状态、餐食和 proposal 回归通过。 |

## 安全与可靠性

- **密钥边界 PASS（本地）**：源码、`dist` 和脚本脱敏扫描未发现 API key；`.env` 被 Git 忽略，Function 只读取服务器变量。
- **代理访问控制 PASS（代码）**：设置 `PREVIEW_ACCESS_TOKEN` 后，Function 要求 `Authorization: Bearer`；浏览器 `consentGranted` 只是数据同意，不再被当作身份认证。
- **服务端限流 PASS（代码）**：按 Netlify `x-nf-client-connection-ip` 做窗口限流，默认 20 次/5 分钟，可由 `MODEL_RATE_LIMIT_MAX`、`MODEL_RATE_LIMIT_WINDOW_MS` 收紧；超限返回 429 与 `Retry-After`。这是无状态 Function 实例内的成本护栏，持久化配额仍需部署后配置/核验。
- **请求与模型安全 PASS**：请求体上限 6 MB、客户端图片上限 4 MB、上游 15 秒超时、provider URL 精确 allowlist、固定 purpose/JSON schema、最大输出 800 tokens。
- **降级 PASS**：缺少同意、未配置、429、超时、非法 JSON 或非法结构化结果均回到手工/本地规则路径；模型不能直接写计划。
- **隐私边界 PASS（实现）**：模型请求只发送用户明确同意的摘要、运动文本或图片；营养与能耗由本地确定性代码计算；健康数据默认留在 IndexedDB。
- **数据恢复 PASS（本地）**：Dexie v1→v2 迁移、备份 schema、mode 检查、冲突保留和事务合并均有测试；未删除真实数据。

## R3 回归结果

| 命令 | 结果 |
|---|---|
| `npm run typecheck` | PASS |
| `npm test -- --run` | PASS：7 files / 30 tests |
| `npm run build` | PASS：产物生成；仅有现有单 bundle >500 kB warning |
| `npm run test:e2e` | PASS：5 个本地场景 |
| `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e` | PASS：上述 5 个 + 3 个真实模型场景 |
| `npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node` | PASS |
| `npm run smoke:provider` | PASS：Responses 文本、结构化 JSON、图像 capability、tool call 均 HTTP 200；一次探针，费用未由 provider 账单验证 |
| 桌面/移动浏览器模拟 | PASS：1440×900 与 375×812 无水平溢出；这不是手机真机验收 |

## A–I 判定

| 条件 | 判定 | 说明 |
|---|---|---|
| A 核心 P0 有真实可复现证据 | PASS | 本地真实 Function E2E 覆盖餐图、运动、Agent、审批；质量评测集仍需另建。 |
| B 类型/单测/构建/关键 E2E | PASS | 见上表。 |
| C 无阻断逻辑、数据损坏或越权风险 | PASS（本地） | 审批、mode、备份、模型降级和服务端访问码有测试；线上仍需验证实际配置。 |
| D 密钥管理与代理访问控制 | PASS（代码） | 已加入服务端访问码和限流；未在 Netlify 配置或验证实际效果。 |
| E 本地持久化、隔离、恢复 | PASS | Dexie、备份和隔离测试通过。 |
| F Netlify 配置与变量清单 | PASS（静态） | `netlify.toml`、`.env.example` 和部署文档齐全。 |
| G 演示数据独立使用 | PASS | demo 可初始化/重置，不触碰 real。 |
| H 部署、验收、费用限制、回滚说明 | PASS（文档） | `docs/deployment.md` 与本文件已写明。 |
| I 无影响受控预览的未解决严重风险 | BLOCKED | 尚无 Netlify 权限，无法验证云端鉴权/限流/CORS/账单配额/深链；手机真机验收也未完成。 |

## 部署后门禁（不得在本地审计中冒充 PASS）

1. 使用 Netlify 受控预览，配置站点访问保护或等效 SSO；验证未带访问码的 Function 直接请求返回 401。
2. 配置并保管 `MODEL_API_KEY`、`MODEL_BASE_URL`、`MODEL_ID`、`APP_ORIGIN`、`PREVIEW_ACCESS_TOKEN`、`MODEL_RATE_LIMIT_MAX`、`MODEL_RATE_LIMIT_WINDOW_MS`；只通过 Netlify 环境变量设置，绝不提交实际值。
3. 从真实预览域名验证 OPTIONS/CORS、深链刷新（`/today`、`/nutrition`、`/training`、`/progress`、`/settings`）、Function 超时/429 和模型失败降级。
4. 在 provider/Netlify 账单界面设置可验证的调用额度或预算告警，记录一次受控请求的费用；当前 smoke token 数不能推导金额。
5. 使用真实手机完成最小验收：访问保护、画像、demo 切换、训练状态刷新、备份预览和返回路径。

## 当前需要的外部操作

- Netlify 站点/团队访问权限与受控预览 URL。
- 一台真实 iOS 或 Android 设备（或负责人明确的真机验收记录）。
- provider 账单/配额可见性。

在这些外部条件完成前，不进入公开部署、不开放无保护模型代理、不扩大产品范围。
