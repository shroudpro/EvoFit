# EvoFit 单人 Codex 开发技术总方案

> 版本：V1.0 · 2026-10-29  
> 对应产品文档：`EvoFit_单人Codex_正式PRD_V1.4.md`  
> 使用者：唯一开发者 + 本地 Codex（编码智能体）  
> 项目形态：Web（网页）应用、单仓库、浏览器本地持久化、Netlify 公网演示  
> 目标：首先交付真实可运行的 R0 MVP（最小可行产品），再在条件允许时完成 R1 校赛版  
> 模型：应用默认 `gpt-6-luna`；Codex 只承担软件开发，不应与产品运行时推理模型混淆。

## 0. 本方案如何使用

本技术方案定义**怎么开发**，PRD 定义**要开发什么**。两份文档共同构成开发基线：产品需求、业务规则与验收口径以 PRD 为准；工程结构、实施顺序、工具规范与发布门禁以本方案为准。如果发现两份文件冲突，优先保证用户安全、计算正确性、数据隔离和真实可验证的核心闭环，然后记录冲突及选用理由到 `docs/decisions.md`；禁止自动扩大范围。

单人项目不引入人为的多角色审批或复杂服务拆分。开发者必须亲自决定是否使用真实密钥、是否更改基础计算口径、是否执行可能破坏数据的迁移及是否上线；Codex 可以自动做本地安全的读取、编码、测试与报告，但不能未经授权对外发布、推送仓库、修改云端配置或清理真实数据。

**最终成功条件：** 对 14 天明确标注的合成记录，应用能够执行真实本地统计，Agent 通过真实模型调用与只读工具提出理由充分的调整建议；用户确认后由程序完成版本化写入；刷新页面后新计划可见，拒绝不发生变更。

## 1. 需求和验收基线

### 1.1 已冻结产品需求

目标用户为 18 岁及以上普通健康大学生、健身初学者；支持减脂、体态重组、增肌三类目标；五个页面为今日、饮食、训练、成长、我的，另设初次引导和全局 AI 教练；图像食物识别必须经过份量核实；运动支持表单与自然语言；宿舍与健身房均有训练方案；AI 只提出计划变更，用户批准后才执行。演示数据与真实数据严格隔离。包装食品营养表及净含量识别属于优先 P1，而不是 R0 的阻断条件。

产品完整验收以 PRD 的 `P0-01` 至 `P0-14` 和 `AT-01` 至 `AT-20` 为准。R0 MVP 不等同于全部 P0 完工；R0 的收敛验收在 PRD 3.5 节定义。

### 1.2 可交付产物

- 可安装依赖并运行的 TypeScript 前端、Netlify 代理与完整锁文件。
- 可持久化的 `real/demo` 双模式数据库、迁移/导入导出/重置能力。
- 科学计算纯函数与可追踪数据来源，应用中真实展示计算结果与限制。
- 有真实模型调用的餐食解析、自然语言运动解析、周报 Agent。
- 含前后差异、审批状态和版本管理的计划调整执行链。
- 真实单元、集成和浏览器端到端测试；脱敏的测试报告与已知缺陷清单。
- `README.md`、`docs/architecture.md`、`docs/progress.md`、`docs/decisions.md`、`docs/deployment.md`、`docs/acceptance.md`、`docs/demo-script.md`。
- 如权限与凭证可用，部署至公网；否则必须至少实现 `npm run build` 成功、Netlify 构建配置和明确的人工上线步骤，不得谎称已经上线。

### 1.3 不做事项

不做医疗诊疗、药品推荐、未成年人减脂处方；不做健身视频姿态评估、云端用户账户同步、付费系统、社交排名、复杂多 Agent；R0 不做包装食品 OCR（光学字符识别）和大规模高级动画。任何与此冲突的新想法写入 backlog（待办池），不阻断当前迭代。

## 2. 标准软件开发生命周期与交付门禁

| 阶段 | 主要工作 | 输出证据 | 离开本阶段的门禁 |
|---|---|---|---|
| G0 需求与仓库审计 | 读取 PRD、核对现存项目、建立需求追踪表 | `docs/requirements-trace.md`、仓库现状 | 已有资产被识别，未破坏现有代码 |
| G1 技术可行性预研 | 模型图文/结构化/工具能力、IndexedDB、Netlify 代理 | 兼容性矩阵、脱敏冒烟测试 | 关键模型能力有实测结果或明确降级方案 |
| G2 架构与契约设计 | DB schema、领域对象、工具协议、模块边界 | ADR、Zod schema、迁移计划 | 读写路径、授权边界和计算单位一致 |
| G3 分阶段编码 | 先纯函数和 DB，再输入/展示，最后 Agent 闭环 | 逐工作包实现、测试与提交 | 每次变更仅触及必要模块，有可复现实验 |
| G4 系统验证 | 单元、集成、E2E、误差与安全检查 | 测试报告、失败项与复测 | 关键链路与高风险测试通过 |
| G5 交付与部署 | 构建、环境配置、Netlify 预览、公开访问测试 | 构建产物、部署记录、用户手册 | 公网功能可验证且密钥不暴露 |
| G6 比赛材料 | PPT、演示数据、视频和匿名化 | 截图、真实录像、资源清单 | 上传项和匿名规定逐项检查通过 |

这些是质量门禁，不是要在 Codex 中分别建立七个孤立项目。G0—G2 可在脚手架和最小实验中交叉迭代，但涉及数据持久化与 AI 写权限的规范必须先于实现确定。

## 3. 架构决策

### 3.1 总体架构

```text
┌──────────────────────────── 用户浏览器 ────────────────────────────┐
│ React UI + React Router                                            │
│  ├─ Onboarding / Today / Nutrition / Training / Progress / Settings│
│  ├─ AI Coach panel + approval dialogs                              │
│  └─ Frontend state and error boundary                              │
│                                                                    │
│ Application services / Agent controller                            │
│  ├─ Read-only tool registry ─> Dexie / domain calculators         │
│  ├─ Proposal validation ─> Safety policy ─> Approval service       │
│  ├─ Provider adapter ─> AI proxy                                  │
│  └─ Audit events / exported backup                                │
│                                                                    │
│ IndexedDB: real and demo records are queried separately           │
└───────────────────────────────┬────────────────────────────────────┘
                                │ HTTPS + minimal authorized context
                                ▼
                     Netlify Function: ai-proxy
                 auth/cost limits/input validation
                                │
                                ▼
                    approved model provider
                        gpt-6-luna
```

**边界原则：** 模型不直接访问 IndexedDB、不持有可执行的数据库写权限；Netlify Function 不假装能读取浏览器本地数据；真正的业务事务在浏览器完成。应用主动分析采用用户打开页面、请求复盘或数据变更后的本地事件触发，不依赖长期后台任务。

### 3.2 推荐技术栈与锁定策略

| 层 | 决定 | 工程注意 |
|---|---|---|
| 前端 | React + Vite + TypeScript | 采用当前兼容稳定版本；锁定 `package-lock.json` |
| 路由 | React Router | 路由页懒加载，统一空态和异常页 |
| UI | Tailwind CSS + shadcn/ui + Lucide | 可访问性、中文排版、移动端适配 |
| 动画 | Framer Motion（可选） | R0 只使用必要反馈，不影响业务交付 |
| 图表 | Recharts | 对缺失值断点显示，标注单位和时间范围 |
| 本地数据 | Dexie + IndexedDB | 明确 schemaVersion、事务和 real/demo 过滤 |
| 状态 | TanStack Query 或简洁业务 hooks | 不再引入 Redux 等额外全局框架，除非验证必需 |
| 校验 | Zod | 所有外部输入、模型输出和备份导入需运行时校验 |
| 单元测试 | Vitest | 领域计算与数据安全规则优先 |
| 浏览器 E2E | Playwright | 关键 R0 路径必须自动化 |
| 代理 | Netlify Functions | 仅做受控模型请求；不得持久化业务个人数据 |

**重要：** 首先扫描已有仓库。如果已经有合理技术栈，则优先在兼容路径上继续，不为追求与模板完全一致而重建项目。凡新增依赖均需说明用途，禁止无意义地堆叠框架。

## 4. 仓库组织与工程约定

```text
evofit/
  src/
    app/                   # router, providers, boundaries
    pages/                 # onboarding today nutrition training progress settings
    components/            # reusable UI
    features/
      profile/             # onboarding, goal editor
      nutrition/           # photo candidate, edit, save
      exercise/            # natural language, MET, logs
      training/            # calendar, exercise catalogue
      agent/               # coach, orchestration, tool dispatch
      review/              # 7-day/14-day review, proposal approval
      backup/              # import/export and mode isolation
    domain/
      calculation/         # REE, TDEE, MET, nutrition, rounding
      evidence/            # documented evidence and limitations
      safety/              # hard checks, approval policy
    db/                    # schema, repositories, seed, migrations
    api/                   # typed AI provider contract and client
    shared/                # Zod schemas, error codes, date/unit helpers
  netlify/functions/ai-proxy.ts
  public/data/             # legally usable, source-attributed reference records
  public/demo/             # fixed-seed, synthetic and clearly labeled data
  tests/unit/
  tests/integration/
  tests/e2e/
  scripts/
  docs/
    adr/
    requirements-trace.md
    architecture.md
    data-sources.md
    decisions.md
    progress.md
    acceptance.md
    deployment.md
    demo-script.md
  .env.example
  netlify.toml
  package.json
  package-lock.json
  README.md
```

**代码规范：** 使用严格 TypeScript；领域代码不导入 React、DOM 或网络库；业务单位显式使用 `Kg`、`Minutes`、`Kcal` 等别名或带单位字段；所有时间戳用 ISO 格式，日记录同时保存 `localDate` 和 `timeZone`；记录改动必须刷新派生统计，不持久化重复、无法追溯的计算总和。

**脚本契约（若仓库已有更合适的对应命令，可保留）：**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint ."
  }
}
```

命令实际依赖及 TypeScript 项目引用可能不同，必须结合仓库验证，不能机械复制与已有配置不兼容的脚本。

## 5. 领域数据与存储契约

### 5.1 关键数据实体

- `UserProfile`：`id`、`mode`、`ageYears`、`heightCm`、`weightKg`、`goalType`、`exerciseExperience`、`equipment`、`timeZone`、`updatedAt`。
- `GoalPlan`：`id`、`mode`、`profileId`、`strategy`、`calorieTarget`（可空）、`proteinRange`、`version`、`effectiveFrom`。
- `Meal` / `MealItem`：`mode`、`localDate`、`mealType`、`foodId`、`massGrams`、`nutritionPer100g`、`source`、`isUserConfirmed`。
- `ExerciseLog`：`mode`、`activityCode`、`durationMin`、`intensityInputs`、`met`、`netEnergyKcal`、`methodVersion`、`localDate`。
- `TrainingPlan` / `TrainingSession`：周起始、版本、动作条目、组次、目标肌群、完成状态、用户反馈。
- `BodyMetric` / `DailyCheckin`：体重等自愿输入及记录完整性信息。
- `WeeklyReview` / `PlanProposal`：时间窗口、来源数据摘要、证据质量、修改项、审批状态、原版本和新版本。
- `AgentRun` / `ToolTrace`：使用何种工具、输入输出的脱敏摘要、执行结果与运行版本，不保存密钥及原始健康图片。
- `AppSettings`：模式与用户同意状态、API 提供商与版本配置，不默认长期保存明文个人密钥。

具体字段字典以 PRD 第 7 节为准，实施时为 `src/shared/schemas/` 编写 Zod，避免视图、数据库与网络三个地方各定义不兼容字段。所有 schema 应包含 `schemaVersion` 或可追踪版本来源。

### 5.2 隔离及事务原则

`mode` 必须为 `real | demo`，每一个业务查询和保存显式传入 mode；禁止提供无 mode 的宽泛查询方法。切换模式时清除页面中尚未确认的候选表单和 Agent 上下文。演示数据带 `isSynthetic = true` 与 `datasetVersion`，重置演示数据只能删除 demo 域记录，先事务验证后删除再重新导入。

计划审批的原子事务顺序：读取当前计划版本 → 校验提案状态、授权与版本 → 检查安全规则及允许的修改字段 → 创建新版本 → 更新提案状态 → 写审计摘要。操作中任意一步失败必须回滚；不得先向用户显示“应用成功”再执行存储。

### 5.3 导入导出与迁移

JSON 备份顶层必须包含 `schemaVersion`、`createdAt`、`mode`、`data`。导入前通过 Zod 全量校验，并预览会覆盖哪些记录；不要允许 demo 导入 real 或反过来。数据库版本升级要写迁移脚本和相关测试；原始照片默认临时处理，除非用户明确同意，不保存到 IndexedDB。

## 6. 确定性计算与营养数据

### 6.1 R0 必须先实现的纯函数

- `estimateRee(profile)`：Mifflin–St Jeor 方程，检查年龄和单位并说明适用条件。
- `calculateFoodNutrients(reference, massGrams)`：按明确定义的每 100g 数据计算；未知项保留为 `null`，不默默转成零。
- `convertKjToKcal(kj)`：按 `kcal = kJ / 4.184` 转换，保留原值。
- `estimateExerciseEnergy(activity, duration, massKg)`：使用固定版本 MET 映射，返回 gross/net 及可追溯参考码。
- `estimateDailyEnergyBalance(profile, records, strategy)`：采用明确的基础日活动 + 额外计划运动口径，并防止已经计入活动系数的运动重复加算。
- `analyzeRecordQuality(records, range)`：缺失、覆盖率、重复与异常输入检查。
- `aggregateWeeklyTrend(records, range)`：从记录实时计算，不能把示例数字硬编码进图表。

计算函数返回结构化的 `value`、`unit`、`methodVersion`、`source`、`assumptions`、`limitations`；UI 中展示“估算”，不对单个用户宣称达到临床精度。初始能量建议和训练量建议都需受保守规则约束，模型不能直接生成无检查的处方数值。

### 6.2 运动口径防重计

固定 `nonExerciseBaseline = REE × nonExerciseActivityFactor`，再按允许的已记录额外锻炼净消耗增加；对于已经通过日常活动系数或步数覆盖的活动不能重复叠加。活动系数及映射表固定版本并保存决策依据。坡度的 `%` 与 `°` 严格区分，缺少强度或时长时提问，不填虚构数值。

### 6.3 可追踪数据来源

食品使用带来源的结构化营养数据，优先 USDA FoodData Central（美国农业部食物营养数据库）和有合法授权的国内食品条目；运动 MET 来自 2024 成人运动汇编；REE 计算参考 Mifflin–St Jeor 原始研究；总体训练建议参考 WHO 和运动营养权威来源。编写 `docs/data-sources.md`，记录版本、网址、获取日期、许可/限制、字段映射和人工核验方法。

不能把“模型猜的热量”伪装为数据库的营养结果；没有可靠重量时先展示候选并要求校正。对常见中式菜肴可使用简化的人工审核条目，但必须说明配方差异。

## 7. 模型适配与 Agent 执行协议

### 7.1 先验证模型，不先造大框架

本项目**默认应用推理模型**是 `gpt-6-luna`，但调用方式必须以实际可用的提供商为准。官方文档记载其具备图像输入、结构化输出和函数调用；对于带推理的函数调用优先使用 Responses API。第三方中转是否完整支持，必须通过真实冒烟测试确认。若中转只支持 Chat Completions，不能假定任意推理档位都能函数调用：须验证兼容性及必要的 `reasoning_effort` 限制。

按顺序做四个 POC（技术概念验证）：

| 编号 | 测试 | 通过证据 | 失败降级 |
|---|---|---|---|
| AI-01 | 简短文字回复 | 真实状态码与响应字段 | 模型暂不可用，仍能做手工记录 |
| AI-02 | 餐食图片解析为食物候选 | 图片真实输入、结构化候选 | 手工食物录入 |
| AI-03 | 严格结构化 JSON 输出 | Zod 验证通过 | 解析失败重试一次或转表单 |
| AI-04 | 调用只读本地工具并引用结果 | 真实工具 trace（轨迹） | 使用两阶段结构化规划 + 程序显式执行工具 |

所有测试报告必须脱敏；不得把真实密钥保存到仓库或日志。AI-04 的降级也必须真实执行工具，而不是由模型假装执行。

### 7.2 AI 代理网络契约

固定 `POST /.netlify/functions/ai-proxy`，定义校验过的 `purpose`：`analyze_meal`、`parse_exercise`、`coach_turn`、`weekly_review`；包装标签 `extract_label` 为 P1。请求包含 `requestId`、`purpose`、`model`、裁剪后的 `input` 和 `consentGranted`。代理验证目的、允许列表、大小限制、密钥、预算、超时与响应格式，向模型提供商转发。响应规范为 `requestId`、`status`、`result` 或 `error`，绝不包括真实密钥或敏感原始日志。

注意图片大小：先在浏览器限制格式和压缩，并给予上传前提示；模型需要的图像数据只在本次请求中传送。公开演示密钥放服务端环境变量；浏览器里出现 `VITE_` 前缀的值不应包含任何秘密。

### 7.3 工具权限和循环控制

只读工具至少包括 `get_profile`、`list_meals`、`list_exercises`、`get_training_plan`、`lookup_food_nutrients`、`lookup_activity_met`、`calculate_daily_balance`、`analyze_trends`、`get_knowledge_evidence`；生成提案使用 `create_plan_proposal`。`apply_approved_proposal` **不暴露为模型直接可执行函数**，只能由用户点击批准后经应用逻辑执行。

每个工具具有 Zod 入参与出参 schema、执行超时、统一错误码；工具调用必须受 `mode` 及用户授权限制。每轮 Agent 限定最大 6 次工具调用和不超过 2 次可控重试。模型返回未知函数名、非法参数或重放调用必须拒绝执行并记审计摘要。

### 7.4 计划建议、审批与状态机

```text
idle
  -> collecting_context
  -> calling_readonly_tools
  -> generating_proposal
  -> validating_proposal
  -> awaiting_approval
  -> applied | rejected | expired | failed
```

`applied` 只能由真实数据库事务成功后产生。状态机还应支持 `needs_more_data`：饮食或体重记录缺失、关键输入矛盾时，模型应说明不确定性并优先请求补充记录，不得默认调低热量。提案携带 `basePlanVersion`、风险校验、变更前后差异、依据数据窗口；版本不一致必须提示用户重新分析。

### 7.5 提示词工程与抗注入

系统提示词仅约束意图、证据引用、工具使用、安全边界和输出 schema；不硬编码演示结论。食物图片、识别出的标签文字、用户日志、知识条目均视为低信任内容；即使文字写着“忽略之前指令”，也不能改变工具权限与写入规则。Agent 不应输出未经工具确认的“已保存”“已完成调整”。

## 8. 页面与用户体验实施标准

R0 的五页采用统一布局，桌面侧栏导航、移动端底部导航，AI 教练以抽屉呈现。优先级是：首页当日数据 → 快捷记录 → 今日计划 → AI 提示 → 轻量成长反馈。菜单一旦确定，不能为每个工具另设主页面。

每个异步操作都必须呈现 `idle`、`loading`、`success`、`error`；保存失败保持用户输入。所有关键数据旁有单位、估算标签与更新时间。空记录不显示 0 kcal 代表未吃，应该显示“尚无记录”；图表缺失值显示为空，不能用插值冒充观测值。演示模式持续出现“模拟数据”标记，并提供显著的一键重置入口。

页面验收至少满足：360px 宽度无横向溢出、键盘可操作关键表单、中文字体与数字间距清晰、主导航无死链接、上传/计算/持久化错误有实际恢复办法。不要过早投入复杂 3D、动画与成就系统。

## 9. 本地隐私、安全与成本控制

### 9.1 数据最小化

用户本地健康记录默认仅存 IndexedDB；发送到模型的上下文必须限制在当前任务需要的日期范围、字段和图片。首次上传个人健康信息或图像前，清楚说明模型提供商会处理哪些数据，并获得用户允许。导出与删除功能需说明风险；原始图片默认不长期存储。

### 9.2 密钥与公开演示

- `.env`、真实密钥、真实健康记录加入 `.gitignore`，只提交 `.env.example`。
- 公开演示密钥仅在 Netlify Functions 的环境变量中读取；不放到前端、静态 JSON、构建日志和 README 示例中。
- 代理只能请求受控模型提供商；不提供任意 URL 转发，避免 SSRF（服务端请求伪造）。
- 公开站点必须有实质性的访问与成本限制（如 Netlify 保护、受控演示访问码、上游额度阈值以及可监控的预算报警）。浏览器 UI 上的“每天最多 N 次”不是可靠服务端限额；无共享状态时无状态 Function 不能确保强一致的跨请求全局计数。
- 对 429、模型超时、服务故障有用户可理解的降级，绝不自动泄露服务端异常堆栈或完整上游响应。
- 不记录完整健康历史、原图、密钥和含个人识别信息的对话；Agent trace 只保留脱敏后的调用摘要。

### 9.3 健康安全

产品仅为成年人健康管理工具。疑似进食障碍风险、特殊疾病/孕期等需要医学管理时，停止自动生成个性化饮食处方，建议寻求合格专业人士的帮助。极端能量目标、训练过量、严重不适提示走硬规则分支；不能依赖模型一句“我会注意安全”作为防线。

## 10. 测试策略与质量门禁

### 10.1 纵向测试金字塔

| 层 | 重点 | 运行时机 |
|---|---|---|
| Unit（单元） | 单位换算、营养合计、REE、MET 净能耗、缺失数据、版本控制纯函数 | 每个相关工作包完成后 |
| Integration（集成） | Dexie 事务/隔离、仓储接口、Agent 工具参数与 Zod、回滚 | 数据或 Agent 变更后 |
| E2E（端到端） | 新建画像、记餐、记运动、今日页刷新、导入 demo、复盘审批、拒绝及刷新 | R0 集成完成后、正式发布前 |
| Manual（人工） | 手机端、照片质量、可访问性、模型真实延迟与错误、部署环境 | 每阶段高风险节点及发布前 |
| Security（安全） | 密钥扫描、错误信息脱敏、模拟/真实隔离、未授权写入、恶意 prompt | 模型代理和审批上线前 |

至少覆盖 PRD 的 `AT-01`、`AT-02`、`AT-03`、`AT-04`、`AT-06`、`AT-07`、`AT-08`、`AT-09`、`AT-10`、`AT-11`、`AT-13`、`AT-16`、`AT-17`、`AT-18`、`AT-20` 中与 R0 对应的环节；其余用例在 R1 补齐。`AT-19` 属 P1，不能以此阻断 R0。

**关键防伪测试：** 先读取旧计划，打开提案但不批准，确保数据库版本不变；再点击批准后读取新版本，并刷新再次核验；把模型连接关闭后，只能展示真实失败与手工降级，不得出现冒充 AI 的“自动成功”。

### 10.2 工作包完成定义（DoD）

每个工作包必须同时具备：功能实现、输入/错误/空态检查、必要的数据读写、相关单测或 E2E、手工验收步骤、变更记录、命令真实执行结果。未运行的命令标为“未执行”，不能标成通过。

R0 发布门禁：`npm run typecheck`、`npm run test`、`npm run build` 实际通过；相关 E2E 在真实浏览器运行通过；无明文密钥；`real/demo` 完全隔离；AI 与数据库审批演示可复现；README 能让使用者启动应用。若项目有替代脚本，以实际命令为准并记录。

### 10.3 可量化质量目标（目标，不是假定已达到）

- 确定性计算测试案例通过率 100%，包括单位与重复计量检查。
- 计划审批安全测试必须全部通过，包括拒绝、过期提案、重复点击与版本冲突。
- 14 天 demo 种子固定，相同版本多次导入的统计一致。
- 主流程在桌面与至少一种手机浏览器可完成，失败时显示可恢复错误。
- 每次真实模型请求记录请求类别、成功/失败、延迟与估计使用量，不在日志中保存原始健康数据。

## 11. Codex 单人开发操作规范

### 11.1 每次任务固定的六步

1. **读取**：PRD、总技术方案、当前 `docs/progress.md` 和相关代码；列出本次目标与影响范围。
2. **计划**：标注任务编号、依赖、文件范围、验收用例；选择最小可验证切片，不进行全仓大改。
3. **实现**：优先添加纯函数及测试，再接数据层和 UI；为风险性变化创建可回滚点。
4. **验证**：运行实际可用的格式、类型、单测、集成、E2E 和构建命令；有失败则修复或记录真实阻塞。
5. **审查**：提供变更摘要、Git diff、依赖变化、存在风险、未完成事项和回滚方案。
6. **记录**：更新 `docs/progress.md`、`docs/acceptance.md`、必要 ADR；等待开发者确认下一高风险阶段。

Codex 可以连续完成多个低风险、独立且已有明确验收标准的工作包，但遇到缺失密钥、数据迁移、部署上线、删除现有用户数据、安全策略不明确或真实模型不可用等情况时，必须停止对应的危险动作并报告。不要假装成功，不要把纯模拟响应当作真实模型实测结果。

### 11.2 工作包与优先级（独立可验收）

| 工作包 | 内容 | 依赖 | 退出条件 |
|---|---|---|---|
| WP-00 | 仓库审计、需求矩阵、健康模型冒烟测试计划 | 无 | 有基线与兼容性测试脚本 |
| WP-01 | 脚手架、路由、设计 token、错误边界 | WP-00 | 本地开发可运行 |
| WP-02 | Zod 契约、Dexie、demo 隔离与迁移 | WP-01 | 事务和数据隔离测试通过 |
| WP-03 | 能量/营养/MET 纯计算与来源表 | WP-02 可并行 | 数学与单位测试全部通过 |
| WP-04 | 用户画像、初始训练日历和今日页骨架 | WP-02、03 | 保存、刷新、汇总真实数据 |
| WP-05 | 饮食手工录入、真实图像解析与确认 | WP-02、03、AI-02 | 餐食写入且当天营养更新 |
| WP-06 | 运动表单、自然语言解析与训练记录 | WP-02、03、AI-03 | 结构化确认，MET 计算可追溯 |
| WP-07 | 14 天 demo、统计、Agent 只读工具与周报 | WP-04 至 06、AI-04 | 读取本地数据并生成证据化提案 |
| WP-08 | 计划审批、版本、审计、完整 E2E | WP-07 | 拒绝不改，批准改版本且刷新保留 |
| WP-09 | R1 强化：备份导入、异常、移动端、部署与演示 | WP-08 | 公网访问、全部关键 P0 验收 |
| WP-10 | P1 包装营养表、轻量成长与优化 | WP-09 | 不破坏主链路，新增功能测试通过 |

**依赖提醒：** 不应为保证一张漂亮首页而提前硬编码演示统计；不应在 `WP-07` 以前实现依赖虚假工具输出的聊天效果。AI-01 至 AI-04 若缺真实密钥，只能标记“待凭证验证”，R0 中相关能力不能宣称完成。

### 11.3 进度与决策日志模板

`docs/progress.md` 每项至少写：日期、WP 编号、PRD 需求 ID、状态、文件修改、运行命令与结果、已通过验收编号、已知缺陷、下一步。`docs/decisions.md` 每项写：问题、选项、决定、理由、影响、回退路径。每次完成任务必须给开发者一份摘要，不应只返回“完成了”。

## 12. 部署与环境准备

### 12.1 本地环境

Windows 优先，使用当前 Node.js 活跃 LTS（长期支持版）与 npm；开发前检查 `node --version`、`npm --version` 和仓库锁文件。首次安装优先 `npm ci`（已有锁文件）或 `npm install`（新项目）；再执行 `npm run dev`。不要要求用户必须换 Linux、Docker 或独立服务器才能进行本地开发。

`.env.example` 仅放空占位：

```dotenv
# Server-side only. Never put this secret in VITE_* variables.
MODEL_API_KEY=
MODEL_BASE_URL=
MODEL_ID=gpt-6-luna
DEMO_ACCESS_TOKEN=
```

`MODEL_BASE_URL` 必须由开发者控制并与白名单匹配，不能将浏览器任意 URL 转发到外部。实际变量名以最终适配器和部署配置为准，不应提前宣称所有第三方服务都兼容。

### 12.2 Netlify 发布程序

1. 本地执行类型检查、单元测试、构建及核心 Playwright E2E；保存脱敏结果。
2. 配置 `netlify.toml`、构建输出目录 `dist`、SPA 路由 fallback 与 Function 构建路径。
3. 在 Netlify 控制台配置服务端环境变量，不能提交真实密钥到 Git；设置安全的演示访问策略与费用控制。
4. 预览部署后测试首页直达、深层路由刷新、真实 API 请求、限流、手动录入、demo 重置与审批事务。
5. 扫描生成的 `dist` 和网络请求，确认没有服务器密钥、个人测试数据与不应披露的源码注释。
6. 测试至少一款桌面浏览器和一款手机浏览器；评委访问说明与登录/演示流程保持简洁。
7. 发布与竞赛材料由开发者最终确认；在没有账号或凭证时提供可执行指引，不做虚假部署声明。

### 12.3 失败回滚

保留前一版 Git 标记或可复现提交点、稳定的演示数据 seed、上一次数据库 schema 迁移路径和 Netlify 旧部署版本。出现生产不可用时先回滚网站/代理，不手工删除用户记录；涉及数据库版本不可回退时应停止使用并优先引导备份。

## 13. 时间安排与风险控制

单人项目以 2026-11-10 赛事官网截止日倒排，**不是承诺一定完成全部 P0**。10-29/30 完成 G0/G1；10-31 到 11-03 完成存储、计算和双录入；11-04 到 11-06 完成 demo、Agent、审批；11-07/08 回归、修复、上线；11-09 制作比赛材料与录制；11-10 最终提交。具体细分见 PRD 13.3。

风险按阻断程度优先处理：

| 风险 | 触发情况 | 决策 |
|---|---|---|
| 模型接入不可用 | 实际接口不支持图片或结构化工具 | 保留适配层，降级手工录入；在验收中明确缺项 |
| 开发时间不足 | 11-04 仍无可保存记录 | 冻结所有动画与 P1；集中完成输入→记录→分析链 |
| Agent 不能真正修改计划 | 仅生成文字，没有数据库事务 | 禁止对外称已做自适应执行，优先补审批写入 |
| 演示 API 被刷 | 额度不可控、未设上限 | 暂停公网 AI 入口或强制访问保护，保留本地功能 |
| 健康计算不可信 | 公式口径冲突、活动重复计入 | 停止对应能量结论，修复纯函数及测试 |
| Demo 污染个人数据 | mode 查询缺隔离 | 阻断发布，补回归和数据恢复测试 |

## 14. MVP 交付自查清单

- [ ] 从空白打开应用能创建合法成年画像，并保存训练/营养目标。
- [ ] 本地数据库重启、刷新仍持久，real/demo 隔离可验证。
- [ ] 饮食有手工入口；真实照片识别成功时需人工校正并计算营养，失败时明确降级。
- [ ] 运动有手工入口；自然语言解析与计算分离，缺参数时补问。
- [ ] 今日页统计来自数据库，不是写死的模拟数字。
- [ ] 14 天演示种子可重复导入，只使用 demo 范围。
- [ ] Agent 实际调用只读工具并生成有证据、有局限的复盘。
- [ ] 提案拒绝不改变计划；批准后写新版本且刷新后可见；版本冲突拒绝覆盖。
- [ ] 真实模型失败不会伪造成功；未经测试的能力标注待验证。
- [ ] 运行通过类型检查、单元测试、构建和主链路 E2E，报告实际结果。
- [ ] 密钥没有泄漏，数据上传前有明确说明，危害性目标被拦截。
- [ ] README、部署说明、进度、决策、测试结果均可供开发者核查。

## 15. 参考资料与验证状态

**赛事来源：** 用户提供的 `章程.docx`、`通知.docx`、`作品说明.pdf`；赛事官网 https://www.ai-race.com.cn/ （2026-10-29 核验，当前截止 11-10 24:00；若承办方更新以最新要求为准）。**应用模型：** https://developers.openai.com/api/docs/models/gpt-6-luna 与 https://developers.openai.com/api/reference/responses/overview 。**Netlify Functions：** https://docs.netlify.com/build/functions/environment-variables/ 。**营养：** https://fdc.nal.usda.gov/api-guide/ 。**运动：** https://pacompendium.com/adult-compendium/ 。**代谢方程：** https://pubmed.ncbi.nlm.nih.gov/2305711/ 。这些资料提供技术/科学依据，**并不证明你当前的第三方 API 中转已通过能力测试**。
