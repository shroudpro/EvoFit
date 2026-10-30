# EvoFit 校赛完整版本补齐实施方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Each task has explicit files, tests, and acceptance evidence.

**Goal:** 在不处理移动端适配和 Netlify 部署的前提下，将 EvoFit 从当前 R0/R1 过渡版补齐为接近 PRD V1.4 校赛完整版本，重点实现用户可配置的大模型、可用的全局 AI 对话教练、更多 P0 数据与页面能力，以及可审计的自适应计划闭环。

**Architecture:** 保留 React + Vite + TypeScript + Dexie + Zod + Vitest + Playwright 架构。新增本地 provider 配置层、统一 Agent 工具注册表、对话持久化和安全规则层；浏览器直接调用用户配置的本地 provider 仅用于本地开发测试，生产代理模式继续保留。模型只能读取授权数据、生成结构化提案，任何有效计划写入仍由本地审批事务完成。

**Tech Stack:** React 18, TypeScript, Vite, React Router, Dexie, Zod, Vitest, fake-indexeddb, Playwright, Responses API-compatible provider。

---

## 0. 交付边界与当前缺口

本计划只处理 PRD V1.4 的 P0 主链路和支撑它的必要 P1 数据基础，不处理移动端导航、真实 Netlify 部署、公开域名、账单配额和公网 CORS。

当前已存在、需要保留的能力：

- `real`/`demo` IndexedDB 隔离和 demo 重置。
- 手工餐食、餐图候选确认、手工运动、自然语言运动解析。
- MET/净消耗计算、今日页、训练完成/跳过。
- Agent 周报、ToolTrace、提案审批、计划版本事务。
- JSON 备份预览/导入/导出。
- Function provider allowlist、超时、请求体限制、预览访问码和服务端限流。

本计划必须补齐的高优先级缺口：

1. 用户在网页中配置 provider URL、API Key、模型和协议，并能测试连接。
2. 全局 AI 教练聊天输入、消息历史、多轮工具调用和可解释回复。
3. 完整画像、安全筛选、目标体重、活动水平和可用时间。
4. 营养目标、蛋白质区间、食物搜索和更完整的饮食条目。
5. 一周训练日历、动作目录、改期、替代动作和更多训练字段。
6. 体重/身体指标记录、14 天趋势和更完整的周报证据。
7. 计划提案历史、版本差异和恢复旧版本。
8. 安全规则、异常输入、浏览器存储失败和离线降级。

明确不在本计划：

- 移动端底部导航和真机适配。
- Netlify 部署、公网鉴权、云端限流和费用账单。
- 包装营养表 OCR、动作视频识别、穿戴设备同步、社交、支付和多人云同步。

## 1. 文件地图与职责

### 需要新建的文件

- `src/shared/providerConfig.ts`：provider 配置类型、默认值、脱敏摘要和配置校验。
- `src/shared/agent.ts`：聊天消息、会话、工具调用和 Agent 状态类型。
- `src/shared/safety.ts`：危险输入和健康边界规则类型。
- `src/db/migrations.ts`：Dexie 版本迁移辅助函数，避免 `database.ts` 继续膨胀。
- `src/api/providerClient.ts`：浏览器直连 provider 和 Function 代理的统一请求客户端。
- `src/api/agentTools.ts`：只读查询、确定性计算、提案创建工具注册表。
- `src/api/chatAgent.ts`：多轮聊天 Agent 控制器和工具循环。
- `src/domain/goals.ts`：营养目标、蛋白质区间和目标策略计算。
- `src/domain/safety.ts`：危险画像、极端目标和危险建议拦截。
- `src/pages/ChatCoach.tsx`：全局 AI 教练聊天面板内容。
- `src/pages/BodyMetrics.tsx`：体重和身体指标录入区域；若保持单页结构，可作为 `Progress.tsx` 内部组件。
- `tests/unit/providerConfig.test.ts`：provider 配置校验和脱敏测试。
- `tests/unit/agentTools.test.ts`：工具权限、mode 隔离和参数校验测试。
- `tests/unit/chatAgent.test.ts`：工具循环、未知工具、超时、非法 JSON 和审批边界测试。
- `tests/unit/goals.test.ts`：目标和营养区间计算测试。
- `tests/unit/safety.test.ts`：危险输入与建议拦截测试。
- `tests/unit/bodyMetrics.test.ts`：身体指标和趋势测试。
- `tests/e2e/complete-p0.spec.ts`：校赛主链路 Playwright 场景。

### 需要修改的文件

- `src/shared/types.ts`、`src/shared/schemas.ts`：扩展实体和严格 schema。
- `src/db/database.ts`、`src/db/seed.ts`：新增设置、会话、消息、目标、身体指标和食物目录表，保留 v1/v2 数据迁移。
- `src/api/modelAdapter.ts`：改为调用 `providerClient`，保留餐图和运动结构化适配。
- `src/api/agent.ts`：改为复用 `agentTools` 和 `chatAgent`，周报使用固定窗口。
- `src/app/App.tsx`：挂载真正的聊天教练抽屉、会话上下文和当前 mode。
- `src/pages/Onboarding.tsx`：拆成多步画像与安全筛选流程。
- `src/pages/Nutrition.tsx`：接入食物搜索、烹饪参数和餐食时间线。
- `src/pages/Training.tsx`：接入动作目录、计划日历、改期和反馈字段。
- `src/pages/Today.tsx`：增加缺口/盈余、目标区间、时间线和 AI 简报入口。
- `src/pages/Progress.tsx`：增加身体趋势、证据顺序、提案历史和版本恢复。
- `src/pages/Settings.tsx`：增加 provider 配置、画像/目标修改、数据删除和隐私说明。
- `netlify/functions/ai-proxy.ts`：保持服务器代理安全边界，补充与统一客户端相同的请求错误码。
- `scripts/e2e-smoke.mjs`：扩展 provider 配置和聊天主链路测试开关。
- `tests/unit/repository.test.ts`、`approval.test.ts`、`backup.test.ts`、`modelAdapter.test.ts`、`aiProxy.test.ts`：补迁移、配置排除和新审批行为。
- `docs/architecture.md`、`docs/acceptance.md`、`docs/requirements-trace.md`、`docs/ai-evaluation.md`：同步实现证据。

## 2. 数据模型和迁移先行

### Task 1: 新增实体类型和 schema

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/schemas.ts`
- Create: `src/shared/providerConfig.ts`
- Create: `src/shared/agent.ts`
- Create: `src/shared/safety.ts`
- Test: `tests/unit/providerConfig.test.ts`

- [ ] **Step 1: 定义 provider 配置契约**

新增以下字段，API Key 只用于本地配置，不进入备份实体：

```ts
export type ProviderTransport = 'browser_direct' | 'function_proxy'
export type ProviderProtocol = 'responses'

export interface ProviderConfig {
  id: 'active'
  transport: ProviderTransport
  protocol: ProviderProtocol
  baseUrl: string
  model: string
  apiKey: string
  enabled: boolean
  updatedAt: string
}

export interface ProviderConfigSummary {
  transport: ProviderTransport
  protocol: ProviderProtocol
  baseUrl: string
  model: string
  hasApiKey: boolean
  updatedAt: string
}
```

`ProviderConfig` 只写入本地设置表；`ProviderConfigSummary` 用于 UI 和日志，禁止包含 `apiKey`。

- [ ] **Step 2: 定义画像、目标、身体指标和聊天实体**

在 `src/shared/types.ts` 增加：

```ts
export interface BodyMetric extends EntityBase {
  localDate: string
  weightKg: number
  waistCm?: number
  source: 'manual'
  note?: string
}

export interface GoalPlan extends EntityBase {
  profileId: string
  strategy: GoalType
  targetWeightKg?: number
  energyTargetKcal?: number
  proteinMinG?: number
  proteinMaxG?: number
  version: number
  rationale: string
}

export interface ChatConversation extends EntityBase {
  profileId: string
  title: string
  status: 'active' | 'archived'
}

export interface ChatMessage extends EntityBase {
  conversationId: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  status: 'complete' | 'error'
  toolCallId?: string
  toolName?: string
}
```

扩展 `UserProfile`：`targetWeightKg?`、`activityLevel`、`availableMinutesPerDay`、`healthRiskFlags`、`allergies`、`mealPreferences`。

- [ ] **Step 3: 为新实体写 Zod schema**

所有新 schema 使用 `.strict()`；数值范围必须限制：年龄 18–100、体重 25–400 kg、腰围 20–250 cm、每日可用时间 5–240 分钟、目标热量不小于 1200 kcal，仅作为工程输入保护而非医学处方。

- [ ] **Step 4: 运行 schema 单测**

Run:

```powershell
npm test -- --run tests/unit/providerConfig.test.ts
```

Expected: 新 schema 的合法样本通过，未知字段、空 URL、空 model、负数体重和超范围目标失败。

- [ ] **Step 5: 提交独立数据契约变更**

```powershell
git add src/shared/types.ts src/shared/schemas.ts src/shared/providerConfig.ts src/shared/agent.ts src/shared/safety.ts tests/unit/providerConfig.test.ts
git commit -m "feat: define complete profile provider and agent contracts"
```

### Task 2: Dexie v3 迁移和备份边界

**Files:**
- Modify: `src/db/database.ts`
- Create: `src/db/migrations.ts`
- Modify: `src/shared/schemas.ts`
- Modify: `tests/unit/repository.test.ts`
- Modify: `tests/unit/backup.test.ts`

- [ ] **Step 1: 增加 v3 表和索引**

新增表：

```text
settings: [mode+id], mode
bodyMetrics: [mode+id], [mode+localDate], mode, localDate
goals: [mode+id], [mode+profileId], mode, version
conversations: [mode+id], [mode+profileId], mode, updatedAt
messages: [mode+id], [mode+conversationId], mode, createdAt
```

保留 v1/v2 表结构，不删除历史数据。

- [ ] **Step 2: 写迁移默认值**

旧 profile 的新增字段使用安全默认值：`activityLevel='light'`、`availableMinutesPerDay=30`、`healthRiskFlags=[]`、`allergies=[]`、`mealPreferences=[]`。旧记录不自动生成虚构的身体指标和目标数值。

- [ ] **Step 3: 明确备份排除规则**

导出备份包含目标、身体指标、对话和消息，但不包含 `ProviderConfig.apiKey`。导出中只能包含：

```ts
provider: {
  transport,
  protocol,
  baseUrl,
  model,
  hasApiKey
}
```

导入不能覆盖当前 provider 配置，不能导入跨 mode 的聊天或健康记录。

- [ ] **Step 4: 写迁移和备份测试**

测试内容：v2 数据打开后自动迁移；旧 profile 可以读取；新实体 mode 隔离；provider key 不出现在 JSON；导入预览不写入聊天和 provider key；删除当前 mode 不删除另一 mode。

- [ ] **Step 5: 运行测试并提交**

```powershell
npm test -- --run tests/unit/repository.test.ts tests/unit/backup.test.ts
npm run typecheck
```

Expected: 迁移、mode 隔离、备份脱敏和删除边界全部通过。

## 3. 用户自配置模型能力

### Task 3: 统一 provider client

**Files:**
- Create: `src/api/providerClient.ts`
- Modify: `src/api/modelAdapter.ts`
- Modify: `netlify/functions/ai-proxy.ts`
- Test: `tests/unit/providerConfig.test.ts`
- Test: `tests/unit/modelAdapter.test.ts`
- Test: `tests/unit/aiProxy.test.ts`

- [ ] **Step 1: 定义统一请求接口**

```ts
export interface ProviderRequest {
  purpose: 'analyze_meal' | 'parse_exercise' | 'weekly_review' | 'chat'
  input: unknown
  responseSchema: object
  tools?: object[]
  consentGranted: boolean
}

export interface ProviderResponse {
  status: 'connected' | 'unconfigured' | 'failed' | 'rate_limited' | 'timeout'
  payload?: unknown
  message: string
}

export async function requestProvider(request: ProviderRequest): Promise<ProviderResponse>
```

- `browser_direct`：从当前 IndexedDB 设置读取 URL、Key、model，直接调用 `${baseUrl}/responses`。
- `function_proxy`：只调用 `/.netlify/functions/ai-proxy`，不把 Key 发给 Function。
- 两种路径统一使用 15 秒超时、JSON schema、错误码和最大输出限制。

- [ ] **Step 2: 限制浏览器直连配置**

本地 provider 配置允许 HTTPS URL 和 `http://localhost`/`http://127.0.0.1`；拒绝 `javascript:`、`file:`、空 host 和非 HTTP(S) 协议。浏览器直连模式明确显示：API Key 会保存在本机浏览器并可能出现在网络请求中，仅用于本地测试。

- [ ] **Step 3: 保留 Function 代理模式**

不把用户 Key 转发到 Netlify。Function 模式仍只读取服务器环境变量。用户配置页默认选择 `browser_direct`，部署文档保留 `function_proxy` 作为受控预览模式。

- [ ] **Step 4: 补 provider 错误处理**

统一处理：401、403、404、429、413、5xx、超时、非法 JSON、schema 不匹配、CORS 失败。每种错误都保留手工路径，不写入健康记录，不显示“已连接”假状态。

- [ ] **Step 5: 测试 provider client**

```powershell
npm test -- --run tests/unit/providerConfig.test.ts tests/unit/modelAdapter.test.ts tests/unit/aiProxy.test.ts
```

Expected: 直连和代理两种模式都能通过 mock fetch；Key 不进入日志、备份和 provider summary；错误状态可被 UI 展示。

### Task 4: 设置页加入用户模型配置

**Files:**
- Modify: `src/pages/Settings.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles.css`
- Test: `tests/e2e/complete-p0.spec.ts`

- [ ] **Step 1: 增加配置表单**

设置页新增“AI 模型配置”卡片，字段：

- 连接方式：本地直连 / 受控 Function。
- API Base URL。
- API Key 密码输入框。
- Model ID。
- “保存配置”按钮。
- “测试连接”按钮。
- “清除本地 Key”按钮。
- 当前状态：未配置、测试中、已连接、失败。

保存时只写 IndexedDB settings 表；页面重新打开时只显示脱敏摘要和 `••••••`，不回显完整 Key。

- [ ] **Step 2: 绑定本地 provider 测试流程**

开发测试时的操作路径固定为：

1. 启动 `npm run dev`。
2. 进入“我的 → AI 模型配置”。
3. 选择“本地直连”。
4. 填入开发者本地 provider 的 URL、Key 和 `gpt-6-luna` 模型名。
5. 点击“测试连接”。
6. 测试成功后再运行餐图、运动解析和 AI 对话。

真实 Key 只能由开发者在本机填写，不写入计划文档、仓库、测试快照或截图。

- [ ] **Step 3: 更新隐私提示**

清楚区分：

- 本地数据默认保存在 IndexedDB。
- 浏览器直连模式会把用户 Key 保存在本机并把授权内容发送给配置的 provider。
- Function 模式不在浏览器保存服务器 Key。
- 关闭 AI 配置后，手工记录和本地统计继续可用。

- [ ] **Step 4: 添加 E2E 配置测试**

验证：保存配置后刷新仍显示脱敏摘要；测试连接失败时保留表单；清除 Key 后请求回到未配置状态；导出 JSON 不包含 Key。

- [ ] **Step 5: 运行构建验证**

```powershell
npm run typecheck
npm run build
```

## 4. P0 画像、目标和安全规则

### Task 5: 多步画像和危险输入拦截

**Files:**
- Modify: `src/pages/Onboarding.tsx`
- Create: `src/domain/safety.ts`
- Modify: `src/shared/safety.ts`
- Modify: `src/shared/types.ts`
- Test: `tests/unit/safety.test.ts`
- Modify: `tests/e2e/complete-p0.spec.ts`

- [ ] **Step 1: 实现 5 步画像表单**

步骤固定为：

1. 成年声明和适用范围。
2. 年龄、身高、体重、生理参数、目标体重。
3. 目标、活动水平、训练经验、每日可用时间、器械条件。
4. 运动不适/禁忌、过敏和餐食偏好、记录频率。
5. 初始计划和目标摘要确认。

不强迫填写医疗敏感信息；用户选择风险项后，停止自动热量/增肌计划，只允许本地记录并显示专业咨询提示。

- [ ] **Step 2: 实现安全规则**

```ts
export interface SafetyDecision {
  allowed: boolean
  reasons: string[]
  disableAutomaticTargets: boolean
}

export function evaluateProfileSafety(input: ProfileSafetyInput): SafetyDecision
```

拦截：未满 18 岁、怀孕/哺乳、疾病管理、进食障碍风险、极端目标体重差、明显异常身高体重、用户主动报告持续不适。

- [ ] **Step 3: 补画像编辑**

设置页提供“编辑画像”和“编辑目标”。修改后生成新的 `GoalPlan` 版本，不覆盖旧计划；必须显示影响范围并要求确认。

- [ ] **Step 4: 写安全测试**

测试安全输入允许进入基础计划；危险输入不生成自动热量目标；极端目标显示原因；普通用户能继续手工记录。

- [ ] **Step 5: 运行测试并提交**

```powershell
npm test -- --run tests/unit/safety.test.ts
npm run test:e2e -- --grep "profile|safety"
```

### Task 6: 目标和营养目标计算

**Files:**
- Create: `src/domain/goals.ts`
- Modify: `src/domain/calculation.ts`
- Modify: `src/pages/Today.tsx`
- Modify: `src/pages/Progress.tsx`
- Test: `tests/unit/goals.test.ts`

- [ ] **Step 1: 实现目标计算接口**

```ts
export function calculateGoalPlan(profile: UserProfile): GoalPlan
export function calculateProteinRange(profile: UserProfile): { minG: number; maxG: number }
export function calculateEstimatedBalance(input: { intakeKcal: number | null; tdeeKcal: number | null }): { kcal: number | null; kind: 'deficit' | 'surplus' | 'unknown' }
```

目标计算必须输出方法版本、假设和限制；不能生成固定的医学处方或保证减脂结果。

- [ ] **Step 2: 增加今日目标展示**

今日页新增：估计缺口/盈余、蛋白质目标范围、当前摄入与范围的关系，并明确标记“估算”。未知营养项不计为 0，也不把单日缺口解释成脂肪变化。

- [ ] **Step 3: 写计算测试**

覆盖减脂、身体重组、增肌、缺少生理参数、未知营养和蛋白质区间边界。

## 5. 饮食和运动 P0 补齐

### Task 7: 食物目录、搜索和餐食详情

**Files:**
- Modify: `src/db/seed.ts`
- Modify: `src/db/database.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/pages/Nutrition.tsx`
- Test: `tests/unit/repository.test.ts`
- Modify: `tests/e2e/complete-p0.spec.ts`

- [ ] **Step 1: 建立人工核验食物目录**

首批提供至少 30 条常见食物/基础食材，字段包括 `foodId`、名称、每 100 g 基准、营养值、来源、版本和适用说明。当前三个硬编码条目迁移为目录记录。

- [ ] **Step 2: 增加搜索和确认**

手工录入改为关键词搜索，结果显示名称、热量、蛋白质和来源；用户选择后填写克重、餐次、烹饪方式和用油说明。

- [ ] **Step 3: 完善照片确认**

照片候选支持多食物、置信说明、克重范围、烹饪方式和用户备注。未知食物可以保存，但营养值保持 `null`。原图只用于当前请求，不进入备份。

- [ ] **Step 4: 增加复制和历史修改**

历史餐食支持编辑、删除、复制到今天；每次操作刷新今日汇总，并阻止重复提交。

- [ ] **Step 5: 测试**

```powershell
npm test -- --run tests/unit/repository.test.ts tests/unit/calculations.test.ts
npm run test:e2e -- --grep "meal|nutrition"
```

### Task 8: 训练动作目录、日历、改期和反馈

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/schemas.ts`
- Modify: `src/db/database.ts`
- Modify: `src/db/seed.ts`
- Modify: `src/pages/Training.tsx`
- Modify: `src/pages/Today.tsx`
- Test: `tests/unit/repository.test.ts`
- Modify: `tests/e2e/complete-p0.spec.ts`

- [ ] **Step 1: 扩展训练字段**

训练动作增加 `sets`、`reps`、`weightKg?`、`rpe?`、`alternativeExerciseId?`、`scheduledDate`、`status='planned|completed|skipped|postponed'`、`feedback?`。

- [ ] **Step 2: 建立动作目录**

提供 20 个经过人工检查的基础动作，覆盖宿舍徒手、校园有氧和健身房基础力量；每个动作包含主要肌群、器械、难度、替代动作和注意事项。

- [ ] **Step 3: 实现一周日历和改期**

训练页显示 7 天日历、训练/休息状态和当天动作。支持完成、跳过、改期到未来日期、替代动作和填写反馈。改期记录审计摘要，不删除原计划历史。

- [ ] **Step 4: 让自然语言进入统一运动目录**

模型只能返回目录中的 `activityCode`；未知活动必须进入手工选择，不允许用字符串直接计算 MET。

- [ ] **Step 5: 测试**

```powershell
npm test -- --run tests/unit/repository.test.ts tests/unit/calculations.test.ts
npm run test:e2e -- --grep "training|exercise"
```

## 6. 全局 AI 教练和 Agent 重构

### Task 9: 统一 Agent 工具注册表

**Files:**
- Create: `src/api/agentTools.ts`
- Modify: `src/api/agent.ts`
- Modify: `src/shared/agent.ts`
- Test: `tests/unit/agentTools.test.ts`

- [ ] **Step 1: 定义工具注册接口**

```ts
export type AgentToolPermission = 'read' | 'proposal'
export interface AgentToolContext { mode: Mode; profileId: string; conversationId?: string }
export interface AgentToolDefinition {
  name: string
  permission: AgentToolPermission
  inputSchema: object
  execute: (input: unknown, context: AgentToolContext) => Promise<unknown>
}
```

- [ ] **Step 2: 实现完整 P0 工具**

至少注册：

- `get_profile`
- `list_meals`
- `list_exercises`
- `get_training_plan`
- `lookup_food_nutrients`
- `lookup_activity_met`
- `calculate_daily_balance`
- `analyze_trends`
- `get_body_metrics`
- `create_plan_proposal`

`apply_approved_proposal` 不注册为模型可调用工具，只由用户点击审批按钮触发。

- [ ] **Step 3: 强制权限和 mode 校验**

工具执行前校验 Zod 输入、当前 `mode`、当前 `profileId` 和日期范围；未知工具、跨 mode 参数、跨 profile 参数立即返回结构化错误并写入 ToolTrace。

- [ ] **Step 4: 测试工具边界**

覆盖未知工具、跨模式读取、错误参数、日期窗口、只读工具不写库、proposal 工具只写 `awaiting_approval` 提案。

### Task 10: 多轮聊天 Agent 控制器

**Files:**
- Create: `src/api/chatAgent.ts`
- Modify: `src/api/providerClient.ts`
- Modify: `src/api/modelAdapter.ts`
- Modify: `src/db/database.ts`
- Create: `tests/unit/chatAgent.test.ts`

- [ ] **Step 1: 定义 Agent 状态机**

使用以下状态：

```text
idle → collecting_context → calling_tools → validating → responding
                                      ↘ proposal_ready → awaiting_user_approval
                                      ↘ needs_more_data
                                      ↘ failed
```

- [ ] **Step 2: 实现工具循环**

每轮最多 6 个工具调用，最多 2 次 provider 重试，单次请求 15 秒超时，总轮数最多 6；未知工具拒绝执行；非法 JSON 或 schema 失败返回手工操作提示。每个用户问题保存 `ChatMessage` 和 `ToolTrace`。

- [ ] **Step 3: 支持自然语言意图**

至少覆盖：

- “查昨天蛋白质” → 查询餐食并计算营养。
- “为什么本周体重变化不明显” → 读取身体指标、饮食、训练和数据质量。
- “把明天训练改成宿舍徒手” → 生成待审批提案，不直接写计划。
- “今天午饭怎么记录” → 引导手动录入或发起餐图流程。
- “根据这 14 天记录判断是否需要调整减脂计划” → 运行趋势工具并生成提案。

- [ ] **Step 4: 实现对话上下文裁剪**

只发送当前会话最近 12 条消息、当前 mode、最小摘要和用户明确授权的数据；不发送完整数据库、不发送 provider Key、不保存原始餐图。

- [ ] **Step 5: 测试聊天 Agent**

```powershell
npm test -- --run tests/unit/agentTools.test.ts tests/unit/chatAgent.test.ts
```

Expected: 至少一个问题完成工具调用并返回解释；计划修改只能产生待审批提案；模型异常时会话仍保留错误消息和手工入口。

### Task 11: 实现真正的 AI 教练 UI

**Files:**
- Create: `src/pages/ChatCoach.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/pages/Progress.tsx`
- Modify: `tests/e2e/complete-p0.spec.ts`

- [ ] **Step 1: 将静态抽屉替换为聊天面板**

聊天面板必须包含：会话列表、消息区、输入框、发送按钮、停止按钮、加载状态、错误提示、ToolTrace 摘要和提案卡片。

- [ ] **Step 2: 增加快捷问题**

提供四个可点击问题：

```text
查昨天蛋白质
为什么本周体重变化不明显
把明天训练改成宿舍徒手
根据 14 天记录判断是否需要调整计划
```

- [ ] **Step 3: 提案卡片统一审批**

聊天中出现提案时，显示旧值、新值、原因、证据质量、限制和“批准应用/暂不调整”。按钮复用 `applyApprovedProposal`，不新增绕过事务的写入口。

- [ ] **Step 4: 验收真实本地 provider**

用本地用户配置的 URL/Key 完成：

1. 查询历史数据。
2. 调用至少两个只读工具。
3. 生成一张计划提案。
4. 拒绝提案后原计划不变。
5. 重新运行并批准后新版本可见。

## 7. 周报、自适应计划和历史

### Task 12: 固定 7/14 天窗口和证据化周报

**Files:**
- Modify: `src/api/agent.ts`
- Modify: `src/domain/calculation.ts`
- Modify: `src/pages/Progress.tsx`
- Create: `src/pages/BodyMetrics.tsx`
- Create: `tests/unit/bodyMetrics.test.ts`

- [ ] **Step 1: 统一窗口计算**

所有周报工具必须按用户时区取最近 7 天和 14 天，不再把整个 mode 的历史记录直接当作窗口。工具参数 `days` 必须真正过滤日期。

- [ ] **Step 2: 增加身体指标**

支持手工输入体重和可选腰围，显示 14 天趋势、最近值、变化方向和数据缺口；没有数据时显示“暂无趋势”，不生成虚构趋势。

- [ ] **Step 3: 重写周报输出顺序**

固定为：

1. 数据覆盖情况。
2. 观察事实。
3. 关键不确定性。
4. 目标与进展对照。
5. 候选建议。
6. 风险检查。
7. 是否需要审批。

- [ ] **Step 4: 增加安全决策门**

证据不足时只允许“补记录/维持计划/调整执行方式”等低风险建议；只有满足窗口完整度和趋势门槛，才允许生成训练量变化提案。

- [ ] **Step 5: 测试**

```powershell
npm test -- --run tests/unit/bodyMetrics.test.ts tests/unit/calculations.test.ts tests/unit/agent.test.ts
```

### Task 13: 计划历史、部分采纳和恢复

**Files:**
- Modify: `src/db/database.ts`
- Modify: `src/pages/Progress.tsx`
- Modify: `src/shared/schemas.ts`
- Modify: `tests/unit/approval.test.ts`

- [ ] **Step 1: 保存完整 proposal 证据**

每个 proposal 保存分析窗口、证据质量、观察事实、限制、创建时间和 basePlanVersion。审批后记录 `approvedAt`、结果版本和审计事件。

- [ ] **Step 2: 支持多个变更项**

提案可包含多个互不耦合的变更，用户可以逐项选择批准；事务只应用选中的合法字段，任何字段都必须通过固定白名单和范围校验。

- [ ] **Step 3: 增加版本历史 UI**

成长页显示当前计划版本、历史版本、变更原因和审批时间；允许恢复历史版本，但恢复也必须创建新版本，不能覆盖旧记录。

- [ ] **Step 4: 测试并发和恢复**

覆盖过期 proposal、重复批准、部分批准、恢复旧版本、跨 profile 和跨 mode 操作。

## 8. 今日页、设置和备份完整化

### Task 14: 今日页和饮食时间线

**Files:**
- Modify: `src/pages/Today.tsx`
- Modify: `src/pages/Nutrition.tsx`
- Modify: `src/styles.css`
- Modify: `tests/e2e/complete-p0.spec.ts`

- [ ] **Step 1: 增加五个直接入口**

今日页提供：拍照记餐、手动记餐、记录运动、完成训练、查看 AI 建议。

- [ ] **Step 2: 增加时间线和 AI 简报**

显示早餐、午餐、晚餐、加餐、运动和训练状态；AI 简报只引用已保存的本地统计和最近提案，不自动触发模型请求。

- [ ] **Step 3: 验收写入刷新**

同一天完成餐食、运动、任务后，今日页所有受影响指标、时间线和任务状态必须立即刷新；重复点击不能产生重复记录。

### Task 15: 设置、隐私和数据删除

**Files:**
- Modify: `src/pages/Settings.tsx`
- Modify: `src/db/database.ts`
- Modify: `tests/unit/repository.test.ts`
- Modify: `tests/e2e/complete-p0.spec.ts`

- [ ] **Step 1: 增加当前 mode 删除**

提供二次确认的“删除当前模式数据”；只删除当前 mode 的 profile、goal、meal、exercise、plan、proposal、run、trace、audit、bodyMetrics、chat 数据，不删除另一 mode 和 provider 配置。

- [ ] **Step 2: 增加隐私状态**

显示本地存储状态、当前 provider、最近一次模型调用时间、发送数据范围和关闭 AI 的操作。

- [ ] **Step 3: 完善备份策略**

导入提供：合并当前模式、覆盖 demo、取消。real 模式禁止覆盖导入；预览必须显示 records 数量、时间范围和冲突列表。

- [ ] **Step 4: 测试**

```powershell
npm test -- --run tests/unit/repository.test.ts tests/unit/backup.test.ts
npm run test:e2e -- --grep "settings|backup|delete"
```

## 9. 离线、异常和可解释体验

### Task 16: 统一错误和离线降级

**Files:**
- Create: `src/shared/errors.ts`
- Modify: `src/api/providerClient.ts`
- Modify: `src/pages/Nutrition.tsx`
- Modify: `src/pages/Training.tsx`
- Modify: `src/pages/Progress.tsx`
- Modify: `src/pages/ChatCoach.tsx`
- Test: `tests/unit/modelAdapter.test.ts`

- [ ] **Step 1: 统一错误码**

使用：`MODEL_UNAVAILABLE`、`RATE_LIMITED`、`INVALID_SCHEMA`、`TIMEOUT`、`VISION_UNSUPPORTED`、`STORAGE_FAILED`、`CONSENT_REQUIRED`、`SAFETY_BLOCKED`、`PLAN_VERSION_CONFLICT`。

- [ ] **Step 2: 实现离线行为**

断网后仍可打开已有页面、查看历史和手工记录；AI 入口显示不可用原因，不阻塞本地写入。IndexedDB 写入失败时显示错误并保留未提交输入，不能显示“已保存”。

- [ ] **Step 3: 补异常测试**

覆盖 provider 401/429/5xx、断网、超时、非法 JSON、未知工具、存储失败、重复提交、危险建议和版本冲突。

## 10. 主链路验收和文档

### Task 17: 校赛完整版本 E2E

**Files:**
- Create: `tests/e2e/complete-p0.spec.ts`
- Modify: `scripts/e2e-smoke.mjs`
- Modify: `package.json`

- [ ] **Step 1: 编写完整浏览器场景**

场景必须覆盖：

1. 新用户多步画像和安全确认。
2. 生成目标、蛋白质区间和 7 天计划。
3. 搜索食物并保存手工餐食。
4. 图片候选确认、多食物和未知营养。
5. 自然语言运动解析、补全参数和能耗保存。
6. 训练完成、跳过和改期。
7. 今日时间线和估计缺口刷新。
8. 用户填写体重并查看 14 天趋势。
9. 打开 AI 教练并完成一次多轮工具对话。
10. AI 生成提案，拒绝后计划不变。
11. 再次生成提案，批准后计划版本增加。
12. 查看计划历史并恢复旧版本。
13. 导出 JSON、预览导入、冲突处理和当前 mode 删除。
14. 切换 demo、运行周报、重置 demo，确认 real 不受影响。

- [ ] **Step 2: 真实 provider 本地回归**

新增环境开关只控制是否运行真实 provider：

```powershell
$env:EVOFIT_REAL_MODEL_E2E='1'
npm run test:e2e
```

测试使用本地设置页填写的 URL/Key；Key 不写入 Playwright 代码、快照、日志或测试报告。

- [ ] **Step 3: 运行完整回归**

```powershell
npm run typecheck
npm test -- --run
npm run build
npm run test:e2e
$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e
```

校赛完整版本完成门槛：类型检查通过、所有单元测试通过、构建通过、主链路 E2E 通过、真实 provider 至少完成餐图/运动/聊天/提案四条链路，且未出现越权写入。

### Task 18: 更新需求追踪和验收文档

**Files:**
- Modify: `docs/acceptance.md`
- Modify: `docs/requirements-trace.md`
- Modify: `docs/architecture.md`
- Modify: `docs/ai-evaluation.md`
- Modify: `README.md`
- Create: `docs/school-competition-complete-readiness.md`

- [ ] **Step 1: 为每个 P0 标注真实状态**

状态只能使用 `VERIFIED`、`PARTIAL`、`BLOCKED`，每项必须关联代码位置、测试命令和人工步骤。

- [ ] **Step 2: 记录真实 provider 评测**

至少记录：文本、结构化 JSON、图片、工具调用、聊天工具循环、平均延迟、失败类型、样本数和费用是否可见。不得把一次 smoke 结果写成识别准确率。

- [ ] **Step 3: 输出校赛完整版本报告**

`docs/school-competition-complete-readiness.md` 必须列出：已完成 P0、剩余未完成 P0、真实模型样本限制、AI 对话演示脚本、API 配置操作、回滚方式和最终是否达到校赛完整版本。

## 11. 实施顺序和检查点

按以下顺序执行，禁止先做动画、徽章或视觉重构：

1. Task 1–2：数据契约与 Dexie v3 迁移。
2. Task 3–4：用户自配置 provider 和本地测试链路。
3. Task 5–6：画像、安全规则、目标和营养区间。
4. Task 7–8：食物目录、训练目录、日历和记录字段。
5. Task 9–11：Agent 工具、聊天控制器、真实 AI 教练 UI。
6. Task 12–13：周报证据、自适应提案、版本历史。
7. Task 14–16：今日页、设置、备份、删除、离线和错误状态。
8. Task 17–18：完整 E2E、需求追踪和校赛完整版本报告。

每完成一个 Task，必须先运行该 Task 的局部测试，再运行：

```powershell
npm run typecheck
npm test -- --run
```

每完成一个阶段，额外运行：

```powershell
npm run build
npm run test:e2e
```

## 12. 最终验收标准

达到“校赛完整版本”前必须全部满足：

- P0-01 至 P0-13 的核心功能达到 `VERIFIED`；P0-14 只保留部署门禁，不阻塞本地完整版本开发。
- 用户可以在网页配置本地 provider URL、Key、模型和连接方式，并完成一次连接测试。
- AI 教练有真实输入框、历史消息、多轮工具调用、解释性回复和提案卡片。
- AI 不得直接写入有效计划；批准仍由本地事务完成。
- 画像、食物、运动、训练、身体指标和备份数据均有严格 schema 和 mode 隔离。
- 周报真实使用 7/14 天窗口，能解释证据不足、趋势和不调整原因。
- 计划提案支持拒绝、批准、版本冲突、历史查看和恢复。
- 失败、断网、限流、非法模型输出和存储失败均有明确降级。
- 真实 provider 本地 E2E 至少覆盖餐图、运动、聊天、工具循环和审批。
- 未把 API Key 提交到 Git、测试代码、日志、截图或文档。

完成该计划后，才重新评估是否进入部署准备；本计划本身不执行 Netlify 部署。
