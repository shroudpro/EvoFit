# EvoFit 进度记录

## 2026-10-29 · G0/G1 / WP-00

- 状态：DONE（审计完成，模型能力待凭证验证）。
- 现状：仓库目录仅有 PRD、技术总方案和执行提示词，无 Git、package.json、源码、测试或 Netlify 配置。
- 环境命令：`node --version` → `v24.12.0`；`npm --version` → `11.6.2`；`git status --short --branch` → 非 Git 仓库；`rg --files` → 3 份规范文档。
- 安全：已创建本地 `.env` 占位文件，未写入真实密钥；真实模型 AI-01～AI-04 未执行。
- 下一步：WP-01～WP-03 脚手架、契约、数据库和纯函数。

## 工作包状态

| WP | 状态 | 主要文件 | 最近命令/结果 |
|---|---|---|---|
| WP-00 | DONE | docs/*, .env | 审计命令已执行 |
| WP-01 | DONE | package.json, src/* | R0 类型、单测、构建已通过 |
| WP-02 | DONE | src/shared, src/db | mode 隔离、迁移和持久化测试已通过 |
| WP-03 | DONE | src/domain | 确定性计算测试已通过 |
| WP-04 | DONE | src/pages | 页面纵向闭环和刷新持久化已通过 |
| WP-05/06 | DONE（R1） | src/api/modelAdapter.ts、Nutrition/Training | 真实本地 Function E2E 已通过 |
| WP-07/08 | DONE（R1） | src/api/agent.ts、Progress、database | tool loop、拒绝/审批状态机和单测已通过 |

## 2026-10-29 · WP-01～WP-08 R0 首轮实现

- 状态：IMPLEMENTED；类型、单元测试和构建已验证，E2E 使用 MCP Playwright 手工烟雾已执行。
- 主要修改：`package.json`、`src/`、`netlify/functions/ai-proxy.ts`、`tests/unit/*`、`public/favicon.svg`、`README.md`。
- 实际命令：`npm install --ignore-scripts --no-audit --no-fund`（通过，有 Node 24 engine warning）；`npm test`（13/13 通过）；`npm run typecheck`（通过）；`npm run build`（通过，只有 bundle size warning）。
- 手工浏览器：onboarding 保存画像后进入 `/today` 并显示一周任务；手动米饭 150g 保存后显示 174 kcal；切换 demo 自动载入合成空间；`/progress` 运行周报显示至少 5 条只读 ToolTrace，批准后显示事务成功消息。
- 真实模型：首轮记录中的“待凭证验证”已被后续 `npm run smoke:provider` 更新；当前提供商四项能力 smoke 已通过，但 UI 真实业务链路仍未接入。mock 路径有明确“测试模拟”标识。
- 安全扫描：此前在清空密钥时对源码和 dist 做过脱敏扫描；当前 `.env` 已重新配置真实 key，后续扫描必须排除 `.env`，只检查源码、dist 和网络响应。未执行公网部署。
- 已知限制：未实现图片真实识别、备份导入合并、训练完成状态持久化、完整 E2E 自动化套件；这些不应被宣称为已完成。

## 2026-10-29 · R0 Gate 当前证据

- 实际命令：`npm run typecheck`（通过）；`npm test`（4 files / 13 tests 通过）；`npm run build`（通过，bundle 约 501 kB，仅体积警告）；`npm run test:e2e`（通过，Chrome headless onboarding → today）；`npm run smoke:model`（`not_run`，缺少 key，未发送请求）；`npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node`（通过）。
- 最终构建后仅产生被 `.gitignore` 忽略的 `tsconfig.node.tsbuildinfo`，已清理；`.playwright-mcp/` 为浏览器验证产物并已忽略。
- 发现 Dexie 在新增 ToolTrace 表时的 schema warning，已补为显式 `version(2)` 迁移并重新通过类型、单测和构建。
- MCP Playwright 手工：真实画像提交后 `/today` 出现训练任务；手动米饭 150g → 174 kcal，编辑为 200g → 232 kcal；切换 demo 自动载入并运行周报；只读 trace 至少 5 条；批准提案显示事务成功；切回 real 后 200g 餐食仍存在。
- R0 尚未完成项：真实图像候选的业务接入、公网 Netlify、导入备份、完整训练完成状态和移动端人工验收，均保持待验证或 R1 范围。

## 2026-10-29 · 真实提供商能力验证

- 新增 `scripts/provider-smoke.mjs` 与 `npm run smoke:provider`，只读取本地 `.env`，不打印密钥或完整响应。
- 实测结果：`gpt-6-luna` + 当前第三方 Responses 兼容端点，文本、严格结构化 JSON、图像输入 capability probe、function tool call 均 HTTP 200；JSON 语义校验与工具调用检测通过。
- 真实模型已具备提供商兼容性证据，但尚未接入页面真实餐图流程；真实食物识别准确率、份量准确率和长期稳定性仍未验证。
- 交接文档：`HANDOFF.md`，包含背景、架构、命令、API 结果、未完成项和接手步骤。
- 最终复核命令：`npm run typecheck`（通过）；`npm test`（13/13 通过）；`npm run build`（通过）；`npm run smoke:provider`（四项通过）；Netlify Function 类型检查（通过）；源码与 `dist` 脱敏扫描（clean，扫描排除 `.env`）。

## 真实命令记录

命令只在执行后填写结果，未执行项不标记为通过。

## 2026-10-30 · R2 质量强化与上线准备

- 审计：保留 R1 工作区改动；确认 Git 分支为 `master`，未执行 reset、清库或 worktree 操作。
- R2.1：审批事务新增 profile 作用域校验；AI 适配器和 Function 增加 15 秒超时；模型错误、非法 JSON、缺少同意均显式降级；训练完成率接入周报。
- R2.2：新增严格备份 schema、导出全量当前 mode、文件导入预览、确认合并和冲突保留；训练任务完成/跳过及时间戳持久化，刷新后保持一致。
- R2.3：新增 `docs/ai-evaluation.md`；更新 `scripts/provider-smoke.mjs` 记录延迟和 usage。本轮一次真实 gpt-6-luna 探针 4/4 HTTP 200，平均延迟 3209 ms，平均 total tokens 4432.75；费用待 provider 账单证据。
- R2.4：复核 SPA fallback、Function allowlist、请求上限、密钥边界和本地/云端数据边界；公网部署未执行，线上鉴权/限流和移动端真机仍阻塞。

### R2 实际验证

- `npm run typecheck`：通过。
- `npm test -- --run`：7 files / 28 tests 通过。
- `npm run build`：通过；仅有现有 bundle >500 kB warning。
- `npm run test:e2e`：通过；画像→今日、手动餐食刷新、模型未同意降级、训练完成刷新持久化、备份导入预览场景。
- `npm run smoke:provider`：本轮一次运行，`gpt-6-luna` Responses 文本/结构化 JSON/图像 capability/tool call 均 HTTP 200；详见 `docs/ai-evaluation.md`。
- Netlify Function 类型检查：通过（`npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node`）；公网部署未执行。

### R2 工作包验收表

| 工作包 | 主要修改文件 | 验收标准 | 命令/结果 |
|---|---|---|---|
| R2.1 业务边界 | `src/db/database.ts`, `src/api/modelAdapter.ts`, `netlify/functions/ai-proxy.ts`, `tests/unit/approval.test.ts`, `tests/unit/modelAdapter.test.ts`, `tests/unit/aiProxy.test.ts` | 拒绝/重复/冲突/越权不写库；模型失败明确降级 | `npm test -- --run`：28/28 通过 |
| R2.2 本地数据 | `src/shared/schemas.ts`, `src/pages/Settings.tsx`, `src/pages/Training.tsx`, `tests/unit/backup.test.ts`, `tests/unit/repository.test.ts` | 导入先校验预览再确认；mode 隔离；完成状态刷新保持 | `npm run test:e2e`：5 场景通过；备份单测通过 |
| R2.3 AI 评测 | `scripts/provider-smoke.mjs`, `docs/ai-evaluation.md` | 记录真实成功率、延迟、token 和样本局限 | `npm run smoke:provider`：4/4 HTTP 200 |
| R2.4 上线准备 | `netlify.toml`, `docs/deployment.md`, `HANDOFF_R2.md` | SPA/Function/密钥边界可本地验证；未授权不发布 | `npm run build`、Function 类型检查通过；公网未执行 |

## 2026-10-30 · R1 第一批真实模型闭环

- 状态：IMPLEMENTED；浏览器模型适配层、受控 Function、餐图候选确认、运动参数确认和模型周报提案已接入。
- 真实调用边界：浏览器只向 `/.netlify/functions/ai-proxy` 发送用途、最小输入和用户同意标记；Function 从服务器环境变量读取密钥，按用途固定 Responses JSON Schema，不接受前端模型或任意 URL。
- 餐图：模型只返回食物名、克重候选和置信说明；用户校正后写入 IndexedDB。营养值只从本地食物表映射，未匹配食物保留 `null`。
- 运动：模型只提取字段；用户确认后由 `estimateExerciseEnergy` 计算 MET/净消耗，再写入 IndexedDB。未知活动不会写入虚构的 0 消耗。
- 周报：本地只读工具和确定性统计先运行；用户同意时再请求 `weekly_review`。模型输出经 Zod 和字段/范围规则过滤，仍只能生成待审批提案。
- 实际命令：`npm run typecheck`（通过）；`npm test -- --run`（6 files / 20 tests 通过）；`npm run build`（通过，只有 bundle size warning）；`npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node`（通过）；`npm run test:e2e`（通过：画像→今日、手动餐食刷新持久化、模型同意缺失降级）；`npm run smoke:provider`（四项 HTTP 200 / passed）。
- 遗留：本轮未做公网 Netlify 部署、真实餐图准确率评测和浏览器真实模型端到端（需要 Function 运行环境）；完整周报真实模型浏览器验收、浏览器拒绝提案和版本冲突仍需补充。

## 2026-10-30 · R1 真实本地 Function E2E

- 使用当前 `.env` 的 provider，通过 `scripts/local-ai-proxy.mjs` 自动启动 `ai-proxy` handler（不打印密钥），并将 Vite 的 `VITE_API_BASE_URL` 指向该 Function。
- PowerShell `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`：通过 `onboarding-to-today`、`manual-meal-refresh-persistence`、`model-consent-degradation`、`real-model-meal-loop`、`real-model-exercise-loop`、`real-model-agent-tools-and-rejection` 六个场景。
- 真实模型餐图候选经过用户改名/改重后保存；运动解析经过用户参数确认后由本地 MET 公式保存；周报模型实际请求 `analyze_trends` 等白名单只读工具，返回结构化提案，浏览器拒绝后计划保持不变。
- 真实 provider 的 tool + structured 初始请求为 HTTP 200；直接使用 `previous_response_id` 被当前第三方端点拒绝，因此适配器改为回放受控 Responses input 项继续 tool loop，并通过真实浏览器 E2E 验证。
- 遗留：公网 Netlify 部署、真实餐图准确率/费用/延迟评测和手机真机验收仍未完成。

## 2026-10-30 · 校赛完整版本阶段 1（Task 1–2）

- 状态：DONE；完成完整画像/目标基础契约、provider 配置脱敏契约和 Dexie v3 迁移基础。
- 数据契约：`UserProfile` 增加活动水平、可用时间、健康风险、过敏和餐食偏好；新增 `BodyMetric`、`GoalPlan`、`ChatConversation`、`ChatMessage`、食物/动作目录类型。
- Provider 边界：新增 `src/shared/providerConfig.ts`，限制浏览器直连 URL，摘要只保留 `hasApiKey`，API key 不进入导出 JSON。
- 数据库：新增 v3 `settings`、`bodyMetrics`、`goals`、`conversations`、`messages`、`foods`、`exerciseCatalog` 表；旧 profile 在迁移时使用安全默认值，不生成虚构指标。
- 备份：导出新增目标、身体指标、会话和消息，provider 只导出脱敏摘要；导入与清理仍按当前 mode 隔离，provider 配置不受 mode 数据清理影响。
- 验证：`npm test -- --run tests/unit/providerConfig.test.ts tests/unit/repository.test.ts tests/unit/backup.test.ts` → 11/11；`npm run typecheck` → PASS；完整单测 → 8 files / 35 tests；`npm run build` → PASS（保留既有 bundle warning）；`npm run test:e2e` → 5 场景 PASS。
- 提交：待本阶段变更审阅后提交，下一阶段进入统一 provider client 与设置页配置。

## 2026-10-30 · 校赛完整版本阶段 2（Task 3–4）

- 状态：DONE；完成统一 provider client、直连/Function 两种传输、统一错误状态和设置页配置流程。
- Provider：`src/api/providerClient.ts` 统一 15 秒超时、响应 schema、访问码、HTTP 错误映射；浏览器直连只允许 HTTPS 或本机 HTTP，Function 模式不发送浏览器 key。
- 模型适配：`modelAdapter.ts` 复用统一 client，保留餐图、运动和周报结构化校验；周报 Function 仍强制服务端只读工具白名单。
- 设置页：支持保存配置、连接测试、脱敏状态和清除本地 key；导出 JSON 只保留 provider summary，不回显 key。
- 验证：`npm test -- --run tests/unit/modelAdapter.test.ts tests/unit/aiProxy.test.ts` → 12/12；完整单测 → 8 files / 35 tests；`npm run typecheck` → PASS；`npm run build` → PASS（保留既有 bundle warning）；`npm run test:e2e` → 5 场景 PASS。
- 提交：待本阶段变更审阅后提交，下一阶段进入画像安全、目标和营养计算。

## 2026-10-30 · 校赛完整版本阶段 3（Task 5–6）

- 状态：DONE；完成五步画像字段、安全筛选、目标计划和营养/能量范围计算。
- 画像：新增目标体重、活动水平、每日可用时间、风险项、过敏与餐食偏好；画像提交会保留安全原因，风险用户不生成自动热量/蛋白质目标但仍可手工记录。
- 安全：`evaluateProfileSafety` 拦截未成年、异常输入、极端目标体重和医疗/持续不适风险。
- 目标：`calculateGoalPlan` 输出方法版本、假设和限制；`calculateProteinRange` 与 `calculateEstimatedBalance` 区分缺口、盈余和未知证据；今日页展示估计范围。
- 验证：安全/目标局部单测 6/6；完整单测 10 files / 41 tests；`npm run typecheck` → PASS；`npm run build` → PASS（既有 bundle warning）；`npm run test:e2e` → 5 场景 PASS。
- 提交：待本阶段变更审阅后提交，下一阶段进入食物目录、动作目录和训练日历。

## 2026-10-30 · 校赛完整版本阶段 4（Task 7–8）

- 状态：DONE；完成食物/动作目录、饮食搜索和训练日历基础能力。
- 食物：新增 30 条人工核验基础食材，支持关键词过滤、每 100 g 营养展示和未知食物保留 `null`；演示数据初始化会写入目录版本。
- 训练：新增 21 个基础动作目录；计划任务支持 `postponed`、`scheduledDate`、RPE/反馈字段，一周日历选择、改期和审计记录已接入。
- 验证：目录与仓储局部单测 14/14；完整单测 11 files / 43 tests；`npm run typecheck` → PASS；`npm run build` → PASS（既有 bundle warning）；`npm run test:e2e` → 5 场景 PASS。
- 回归修复：日历摘要与任务状态重复文案导致 E2E 精确定位冲突，已改为短状态词并重新通过全量门禁。
- 提交：待本阶段变更审阅后提交，下一阶段进入 Agent 工具注册表、聊天控制器和教练 UI。

## 2026-10-30 · 校赛完整版本阶段 5（Task 9–11）

- 状态：DONE；完成统一 Agent 工具注册表、多轮聊天控制器和全局 AI 教练抽屉。
- 工具：注册画像、餐食、运动、计划、食物营养、活动 MET、日平衡、趋势、身体指标和计划提案工具；所有调用校验 mode/profile/days，提案仅写入 `awaiting_approval`。
- 聊天：会话/消息/工具消息持久化，最近 12 条上下文、最多 6 轮、每轮最多 6 个工具调用；provider 不可用时回到本地解释路径，模型异常保存错误消息。
- UI：App 静态抽屉已替换为 `ChatCoach`，包含快捷问题、会话列表、消息区、同意开关、停止按钮、ToolTrace 摘要和提案审批卡片；批准复用原有事务。
- 验证：Agent/chat 局部单测 5/5；完整单测 13 files / 48 tests；`npm run typecheck` → PASS；`npm run build` → PASS（既有 bundle warning）；`npm run test:e2e` → 5 场景 PASS。
- 提交：待本阶段变更审阅后提交，下一阶段进入身体指标、固定窗口周报和计划历史。

## 2026-10-30 · 校赛完整版本阶段 6（Task 12–13）

- 状态：DONE；完成固定 7/14 天窗口、身体指标趋势、周报证据字段和计划历史恢复。
- 周报：`runWeeklyReview` 只读取最近 14 天，proposal 保存真实 `windowStart/windowEnd`、观察摘要和证据质量，不再把整个 mode 历史当作窗口。
- 身体指标：新增 `BodyMetrics` 页面和 `summarizeBodyMetrics`，记录体重/腰围，显示最近值、变化方向、覆盖率；无数据显示“暂无趋势”。
- 计划历史：审批记录 `approvedAt/resultPlanVersion`；历史版本恢复通过事务创建新版本并写审计，不覆盖旧记录。
- 验证：局部 7/7；完整单测 14 files / 51 tests；`npm run typecheck` → PASS；`npm run build` → PASS（既有 bundle warning）；`npm run test:e2e` → 5 场景 PASS。
- 提交：待本阶段变更审阅后提交，下一阶段进入今日时间线、设置删除/隐私和统一离线错误。

## 2026-10-30 · 校赛完整版本阶段 7（Task 14–16）

- 状态：DONE；完成今日时间线、当前 mode 删除/隐私提示、provider 离线降级和统一错误码。
- 今日页：餐食、运动和训练状态进入同一时间线；目标区间和缺口/盈余仍明确标记为估算。
- 设置：支持二次确认删除当前 mode 数据，保留 provider 配置和另一 mode；备份继续先预览再合并，不覆盖已有 ID。
- 错误边界：新增 `EvoFitError` 与稳定错误码；provider 处理离线、限流、超时、鉴权、非法结构化结果，AI 失败不阻塞手工路径。
- 验证：局部 14/14；完整单测 15 files / 52 tests；`npm run typecheck` → PASS；`npm run build` → PASS（既有 bundle warning）；`npm run test:e2e` → 5 场景 PASS。
- 提交：待本阶段变更审阅后提交，下一阶段进行完整 P0 E2E、文档矩阵和 handoff 更新。

## 2026-10-30 · 校赛完整版本阶段 8（Task 17–18）

- 状态：DONE；完成完整 P0 回归脚本、真实 provider 回归、需求追踪和最终交接更新。
- E2E：`scripts/e2e-smoke.mjs` 新增身体指标、AI 教练入口、时间线和完整 P0 场景；本地 6 场景通过，真实模式额外餐图/运动/Agent 3 场景通过。
- 真实 provider：`npm run smoke:provider` 4/4 HTTP 200，平均延迟 5650 ms、平均 total tokens 4436.5；单次探针，不代表准确率、SLA 或费用。
- 回归修复：统一 client 的空 schema 曾覆盖 Function 固定 schema，导致真实餐图结构化结果超时；Function 现对餐图/运动/周报始终使用服务端 schema，chat 才接受受控 schema。
- 文档：新增 `docs/school-competition-complete-readiness.md`；更新 architecture、acceptance、requirements-trace、ai-evaluation、README 和 `HANDOFF_R3.md`。
- 最终本地证据：`npm run typecheck` PASS；完整单测 15 files / 52 tests PASS；`npm run build` PASS（既有 bundle warning）；本地与真实 provider E2E PASS。

## 2026-10-30 · 个性化 AI 教练重构

- 状态：DONE；修复 BMI 查询落入固定 fallback 的根因，并将聊天路由改为“模型主路由 + 本地安全门”。
- 上下文：新增 `src/api/chatContext.ts`，每次同意后的 chat 请求携带压缩画像、BMI、目标、当前训练计划和最近 14 天摘要；系统提示词明确禁止重复询问已知数据和直接写计划。
- 路由：普通聊天直接返回自然语言；历史查询按需调用只读工具；计划修改只能调用 `create_plan_proposal`；provider 不可用时只对 BMI/画像基础信息做本地只读回答，不再返回无关固定句。
- BMI：未同意模型时从当前画像本地计算并回答；同意模型时 API 直接依据上下文回答，不调用 BMI 工具。
- 工具安全：修复 provider 工具 schema 直接发送 Zod 对象的问题，现发送严格 JSON Schema；mode/profile/date 校验保持不变。
- 验证：相关单测 19/19；完整单测 15 files / 56 tests；`npm run typecheck` PASS；`npm run build` PASS（既有 bundle warning）；`npm run test:e2e` 6 场景 PASS。
