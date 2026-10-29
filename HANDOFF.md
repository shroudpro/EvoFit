# EvoFit R0 MVP · HANDOFF

> 文档用途：交接给一个完全不了解本项目的开发者或 Codex。阅读本文件后，应能理解产品背景、当前代码、真实 API 验证结果、已完成范围、未完成风险和下一步操作。
>
> 交接日期：2026-10-29  版本阶段：R0 MVP 本地可运行版  当前仓库：`E:\Vibe-coding\evofit`

## 1. 项目背景与目标

EvoFit 是面向成年、一般健康大学生和健身初学者的本地优先健康记录应用。产品目标不是诊断或医疗处方，而是把以下链路做成可审计的闭环：

```text
成年健康画像
  → 目标与简化一周训练计划
  → 饮食记录（手工，图像候选需确认）
  → 运动记录（表单，自然语言只解析字段）
  → 今日驾驶舱
  → 导入隔离的 14 天合成数据
  → 本地确定性统计 + Agent 只读工具
  → 生成待审批计划提案
  → 用户批准/拒绝
  → 批准事务创建新计划版本，刷新仍一致
```

本项目由一名开发者使用 Codex 开发。产品默认模型为 `gpt-6-luna`，Codex 只是编码工具。所有能量、MET、营养和趋势数字都是估算，模型不能直接写入有效训练计划。

产品需求基线：[`EvoFit_单人Codex_正式PRD_V1.4.md`](./EvoFit_单人Codex_正式PRD_V1.4.md)。工程基线：[`EvoFit_单人Codex开发_技术总方案_V1.0.md`](./EvoFit_单人Codex开发_技术总方案_V1.0.md)。执行提示词：[`EvoFit_Codex_MVP开发执行提示词_V1.0.md`](./EvoFit_Codex_MVP开发执行提示词_V1.0.md)。

## 2. 当前仓库状态

原工作区只有三份规范文档，没有 `package.json`、Git 元数据、源码、测试或 Netlify 配置。因此当前实现是从空目录建立的 R0 单仓库应用，没有覆盖既有业务代码，也没有重置 Git 历史。

当前技术栈：

- React + Vite + TypeScript
- React Router
- Dexie / IndexedDB
- Zod
- Vitest + fake-indexeddb
- Playwright library + 本机 Chrome headless smoke script
- Netlify Function（TypeScript）作为模型代理
- CSS design tokens；R0 未引入重量级 UI 组件库

主要目录：

```text
src/shared/       类型、Zod schema、ID/时间工具
src/db/           Dexie v1/v2、mode 仓储、demo seed、审批事务
src/domain/       REE、营养、kJ/kcal、MET、趋势质量
src/api/          模型适配器与本地 Agent 编排
src/app/          路由、布局、mode 上下文、AI 抽屉
src/pages/        onboarding/today/nutrition/training/progress/settings
tests/unit/       计算、仓储隔离、审批、Agent trace
scripts/          provider smoke、模型未配置 smoke、E2E smoke
netlify/functions/ai-proxy.ts
docs/             需求追踪、架构、进度、决策、验收、部署
```

关键文档：

- [`README.md`](./README.md)：安装、运行和项目结构。
- [`docs/architecture.md`](./docs/architecture.md)：数据流、权限和边界。
- [`docs/progress.md`](./docs/progress.md)：每个工作包的真实命令和结果。
- [`docs/requirements-trace.md`](./docs/requirements-trace.md)：PRD/MVP → 工作包 → 测试状态。
- [`docs/acceptance.md`](./docs/acceptance.md)：MVP-01～MVP-12 当前验收状态。
- [`docs/decisions.md`](./docs/decisions.md)：工程决策和模型适配降级策略。
- [`docs/deployment.md`](./docs/deployment.md)：Netlify 配置、密钥边界和回滚。

## 3. 真实 API 配置与安全边界

本地 `.env` 不应提交 Git。当前使用的变量名是：

```dotenv
OPENAI_API_KEY=<本地密钥，不要写入文档或日志>
OPENAI_BASE_URL=<提供商 base URL>
OPENAI_MODEL=gpt-6-luna
VITE_API_BASE_URL=http://localhost:8888/.netlify/functions
VITE_APP_MODE=real
```

真实密钥只能用于本地冒烟脚本或服务器 Function 环境变量。不要把它改成 `VITE_OPENAI_API_KEY`，因为 `VITE_*` 会进入浏览器静态资源。日志只能输出模型名、脱敏 URL 前缀、HTTP 状态和布尔状态。

当前 API URL 是一个第三方兼容端点。它已经通过本地能力测试，但不能据此宣称与官方服务完全等价。Netlify Function 仍应使用明确的 provider allowlist，不提供任意 URL 透明代理。

如果发现密钥曾被打印、提交或粘贴到聊天，立刻在提供商处轮换密钥；不要尝试从 Git 或日志中恢复它。

## 4. API 实测结果

可重复命令：

```powershell
cd E:\Vibe-coding\evofit
npm run smoke:provider
```

脚本 [`scripts/provider-smoke.mjs`](./scripts/provider-smoke.mjs) 会从本地 `.env` 读取变量，不打印密钥或完整模型响应，并依次测试：

1. Responses API 文本请求。
2. Responses API 严格 JSON schema 输出，并解析 `output` 内容校验 `ok=true`、`label=smoke`。
3. Responses API 图像输入（最小 PNG capability probe；这不是识别准确率评测）。
4. Responses API function tool call，要求 `get_profile` 只读工具调用。

2026-10-29 实测结果：

```text
model: gpt-6-luna
protocol: responses
responsesText: HTTP 200 / passed
structuredJson: HTTP 200 / passed
imageInput: HTTP 200 / passed
toolCall: HTTP 200 / passed
overall: passed
```

测试只证明当前 URL、密钥、模型名和这四类请求在当前时刻可用。它没有证明中文食物识别准确率、真实餐图份量准确率、长期稳定性或服务商 SLA。

## 5. 已完成能力

### R0 业务闭环

- 成年门槛、身高/体重/目标/器械条件保存。
- 保存画像时生成 7 天简化训练计划。
- 今日页从 IndexedDB 读取数据；空记录显示“尚无记录”。
- 手动餐食：米饭、鸡胸肉、西兰花；重量编辑会重新计算营养。
- 图像入口：真实模型未连接时明确失败并保留手工入口。
- 手动运动：活动类型、时长、MET 计算和净消耗估算。
- 自然语言解析：当前适配器能提取跑步机、速度、百分比坡度、时长；模型未连接时不冒充成功。
- demo：固定 `demo-2026-10-v1` 数据，带 `mode=demo`、`isSynthetic=true` 语义，切换和重置不影响 real。
- 本地 Agent：读取 profile/meals/exercises/plan，执行确定性统计，持久化 `AgentRun`、`ToolTrace`、`PlanProposal`。
- 审批：只有用户点击批准才能应用；状态、basePlanVersion、重复点击、版本冲突均有保护；批准创建新计划版本和审计记录。

### 测试与构建

最近一次真实执行：

```text
npm run typecheck       passed
npm test                4 files / 13 tests passed
npm run build           passed（仅 bundle size warning）
npm run test:e2e        passed（Chrome headless onboarding → today）
npm run smoke:provider  passed（四项真实 API 能力）
```

Netlify Function 单独类型检查也已通过：

```powershell
npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node
```

## 6. 未完成和不能宣称的能力

以下内容不能标记为已经完成：

- 真实应用页面还没有把 `modelAdapter` 接到第三方真实端点；目前 UI 通过 Function 边界保留“未连接”降级，真实 API 只在 smoke script 中验证。
- 真实餐图识别候选、份量校正和营养匹配尚未做端到端真实图片验收；目前只做图像输入 capability probe。
- `MVP-03` 真实图片失败、`MVP-04` 运动自然语言页面复核、`MVP-08` 浏览器拒绝提案仍需补人工证据，详见 [`docs/acceptance.md`](./docs/acceptance.md)。
- 备份导入/预览/合并尚未完成；当前只提供当前 mode 的 JSON 导出。
- 训练任务完成/跳过状态尚未持久化。
- 尚未部署到 Netlify，没有公网 URL，也没有公网费用/访问保护验证。
- 尚未做手机真机人工验收。

## 7. 下一步开发顺序

1. 将 `src/api/modelAdapter.ts` 改为调用 `VITE_API_BASE_URL` 的受控 Function；Function 读取服务器密钥，浏览器只发送最小授权上下文。
2. 为 `analyze_meal` 和 `parse_exercise` 定义 Responses API 输入/输出 Zod schema，解析失败必须回到手工路径。
3. 使用合法、去敏、非个人图片做真实餐图端到端测试；保存脱敏响应形状和人工校正结果，不保存密钥或原图。
4. 将 Agent 周报从本地规则结果扩展为“真实模型规划 + 程序执行只读工具 + Zod 提案验证”；模型永远不能直接调用 apply。
5. 补浏览器拒绝提案、刷新后读取 ToolTrace、版本冲突和 demo 重置的 E2E。
6. 补备份导入严格 schema 校验，再考虑 Netlify 预览部署。

建议每一步都执行：

```powershell
npm run typecheck
npm test
npm run build
npm run smoke:provider
```

真实模型调用应优先使用 `gpt-6-luna`，但每次变更仍要用当前 `.env` 的实际协议测试，不能只依据官方规格推断第三方兼容性。

## 8. 回滚与操作安全

当前目录不是 Git 仓库，未创建提交或 worktree。若要回滚，先复制整个目录作为备份，再逐个恢复本轮新增文件；不要执行批量删除、`git reset` 或覆盖 `.env`。数据库 schema 已有显式 v1→v2 迁移，涉及进一步 schema 变更时必须增加版本号并补迁移测试。

不要执行以下不可逆动作，除非项目负责人明确授权：

- 删除 real IndexedDB 数据。
- 轮换或公开 API 密钥。
- 将真实健康记录上传到未验证的模型端点。
- 公开部署 Netlify 或开启无访问限制的模型代理。

## 9. 当前接手者的第一步

```powershell
cd E:\Vibe-coding\evofit
npm install
npm run smoke:provider
npm run typecheck
npm test
npm run build
npm run dev
```

然后阅读：

1. [`docs/acceptance.md`](./docs/acceptance.md) 了解真实通过、待验证和未完成项。
2. [`docs/progress.md`](./docs/progress.md) 了解每条命令的历史结果。
3. [`src/api/modelAdapter.ts`](./src/api/modelAdapter.ts) 和 [`netlify/functions/ai-proxy.ts`](./netlify/functions/ai-proxy.ts) 了解模型边界。
4. [`src/db/database.ts`](./src/db/database.ts) 了解 mode 隔离、迁移和审批事务。

任何新的模型能力都必须先加入脱敏 smoke test，再接入 UI；任何计划写入都必须继续走用户批准事务。
