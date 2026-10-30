# EvoFit 本地全量功能测试报告

测试日期：2026-10-30
测试范围：当前 `master` 工作区、本地 React/Vite 应用、本地 Netlify Function、`.env` 配置的真实 provider
测试方式：Vitest、Vite build、Playwright 浏览器模拟、真实 provider HTTP 探针
报告状态：**本地功能大部分通过；真实图片识别和 AI 教练工具闭环被 15 秒超时阻塞**

本报告记录本轮实际执行结果，优先于早期交接文档中“真实模型 E2E 已通过”的历史记录。测试过程中没有打印或写入 API key，也没有修改业务代码。

## 1. 测试环境与配置

- 操作系统：Windows
- Node.js：项目当前 Node 运行环境
- 前端：React + Vite + TypeScript
- 数据库：Dexie / IndexedDB
- 测试浏览器：Chromium headless
- provider 传输：本地 `http://127.0.0.1:8888/.netlify/functions/ai-proxy`
- 上游协议：Responses API
- 上游模型：`gpt-6-luna`
- 上游地址：`https://api.sudocode.chat/v1`
- API key：来自本地 `.env`，只验证存在，不在日志中输出

`.env` 中的安全配置检查结果：

| 配置 | 结果 |
|---|---|
| `VITE_API_BASE_URL` | 已配置为本地 Function 地址 |
| `VITE_APP_MODE` | `real` |
| `OPENAI_BASE_URL` | 已配置 |
| `OPENAI_MODEL` | `gpt-6-luna` |
| `OPENAI_API_KEY` | 已配置，未输出内容 |

## 2. 自动化门禁结果

### 2.1 类型、单元测试和构建

| 命令 | 结果 | 详细结果 |
|---|---|---|
| `npm run typecheck` | PASS | TypeScript 无错误 |
| `npm test -- --run` | PASS | 15 个测试文件，58 个测试通过 |
| `npm run build` | PASS | 构建成功；存在既有单 bundle 超过 500 kB 的 warning |
| `npx vitest run tests/unit/approval.test.ts tests/unit/agent.test.ts tests/unit/chatAgent.test.ts --run` | PASS | 3 个文件，10 个 Agent/审批相关测试通过 |

审批相关测试覆盖：

- 过期 `basePlanVersion` 被拒绝；
- 重复批准被拒绝；
- 跨 profile 提案被拒绝；
- 批准后创建递增的新计划版本；
- 历史计划恢复为新版本；
- Agent 只读工具轨迹和 proposal 状态持久化。

### 2.2 本地完整 E2E

执行命令：

```powershell
npm run test:e2e
```

结果：PASS。脚本覆盖以下场景：

1. 新建成年画像并进入今日页；
2. 手动保存餐食并刷新页面；
3. 模型未同意时的降级路径；
4. 训练任务完成状态持久化；
5. 身体指标、AI 教练入口和今日时间线；
6. 备份导入预览和确认合并；
7. demo / real 模式切换与隔离。

## 3. 真实 provider 能力探针

执行命令：

```powershell
npm run smoke:provider
```

结果：4/4 通过，HTTP 200。

| 探针 | 结果 | 实测延迟 |
|---|---|---:|
| Responses 文本 | PASS | 约 9.4 秒 |
| 严格结构化 JSON | PASS | 约 8.1 秒 |
| 图像输入 capability | PASS | 约 28.3 秒 |
| Function tool call capability | PASS | 约 7.0 秒 |

这证明上游 provider 支持文本、结构化 JSON、图像输入和工具调用，但不能直接推导出应用 Function 的 15 秒超时配置足以承载这些请求。

## 4. 浏览器模拟测试

### 4.1 画像、今日页和本地数据

步骤：

1. 打开应用；
2. 勾选成年及健康管理声明；
3. 提交默认画像；
4. 验证跳转 `/today`；
5. 检查今日指标、目标范围和训练任务；
6. 进入饮食页保存米饭 150 g；
7. 刷新页面。

结果：PASS。

- 画像成功保存；
- 7 天训练计划生成；
- 今日页从 IndexedDB 重新读取数据；
- 手动餐食保存后刷新仍保留；
- 本地营养计算正常。

### 4.2 自然语言运动解析

输入内容：

```text
跑步机 4.5 km/h，10% 坡度，中等强度，45 分钟
```

步骤：

1. 进入训练页；
2. 勾选发送运动描述同意；
3. 点击“解析参数”；
4. 等待真实模型结构化响应；
5. 确认时长和强度；
6. 点击“确认并计算”；
7. 刷新训练页。

结果：PASS。

- 真实模型返回结构化运动参数；
- 坡度被识别为百分比字段；
- 用户确认后由本地 `estimateExerciseEnergy()` 计算；
- 本次保存提示净消耗约 `169 kcal`；
- 刷新后页面仍显示 `1 条运动`；
- 运动记录中的 `methodVersion` 和 `netEnergyKcal` 被持久化。

相关代码：

- [Training.tsx](../src/pages/Training.tsx)
- [modelAdapter.ts](../src/api/modelAdapter.ts)
- [calculation.ts](../src/domain/calculation.ts)

### 4.3 图片识别页面

步骤：

1. 进入饮食页；
2. 勾选图片发送同意；
3. 上传 1 像素 PNG 测试图片；
4. 等待模型响应。

应用结果：**FAIL（按当前超时配置降级）**。

- 页面没有得到候选确认卡片；
- Function 在约 15 秒后返回 504；
- 页面显示“模型服务暂时不可用，已回到手工路径”；
- 手动录入入口仍然可用。

补充的直接上游探针结果：

- 直接请求上游约 35.3 秒返回 HTTP 200；
- 返回结构符合餐图 schema；
- 测试图片过小，模型返回“无法确认的食物”，属于输入质量问题，不是 schema 失败。

结论：上游图像能力存在，但当前 Function 15 秒超时不足以承载真实餐图请求。

### 4.4 AI 教练工具调用与计划调整

浏览器步骤：

1. 完成画像并进入训练页；
2. 打开 AI 教练抽屉；
3. 勾选模型发送同意；
4. 输入要求读取当前训练计划并生成“减少一组”的待审批提案；
5. 等待提案卡片。

结果：**FAIL（真实工具循环超时）**。

用户可见结果为模型不可用/回到手工路径，没有生成“待审批提案”卡片，因此本轮没有执行真实 AI 教练批准操作。

直接 Function 边界测试：

| 请求 | 结果 |
|---|---|
| Chat，不带工具 | HTTP 200，约 8.7 秒 |
| Chat，带一个只读工具 | HTTP 504，约 15.0 秒 |
| Weekly review，最小输入 | HTTP 504，约 15.0 秒 |

直接调用上游（绕过 Function）的工具探针可以在约 13.2 秒返回 `function_call`，说明模型具备工具调用能力。但它生成过 `strengthTraining.sets` 这样的字段，而本地工具白名单只允许：

```text
training.sessions[1].exercises[0].sets
```

因此即使提高超时，也需要继续收紧提案字段契约，避免模型生成无法应用的空提案。

### 4.5 本地审批事务

虽然真实 AI 教练工具循环没有完成，本地审批链路已通过自动化测试：

```text
PlanProposal(awaiting_approval)
  → applyApprovedProposal()
  → 校验 mode/profile/status/basePlanVersion
  → 创建新计划 version
  → 标记 proposal=applied
  → 写入 audit
```

结果：PASS。数据库事务可以真正创建新计划版本，并能拦截过期、重复和越权操作。

## 5. 问题清单与根因

### 问题 P0：真实餐图请求被 15 秒 Function 超时截断

涉及文件：

- [providerClient.ts](../src/api/providerClient.ts)
- [ai-proxy.ts](../netlify/functions/ai-proxy.ts)

根因：

- 浏览器客户端请求超时固定为 15 秒；
- Netlify Function 上游请求超时固定为 15 秒；
- 上游真实图像请求实测约 28–35 秒。

影响：

- 图片识别无法进入候选校正和保存环节；
- 页面虽然安全降级到手动录入，但提示较泛化。

### 问题 P0：AI 教练带工具请求被超时截断

根因：

- Chat 工具请求需要携带上下文和工具 schema；
- 单个工具请求实测超过 Function 15 秒门槛；
- 多轮工具循环最多 6 轮，无法在当前同步超时下稳定完成。

影响：

- 真实 AI 教练无法稳定生成待审批提案；
- “模型读取数据并调整训练计划”的公网演示链路当前不可验收。

### 问题 P1：错误提示没有明确暴露超时原因

当前 504 会被 [providerClient.ts](../src/api/providerClient.ts) 映射为“模型服务暂时不可用”，用户无法区分：

- 上游超时；
- provider 未配置；
- Function 不可达；
- provider 返回 5xx。

### 问题 P1：提案字段约束不够严格

模型可能生成业务上无法应用的字段，例如 `strengthTraining.sets`。当前实现会过滤不支持的字段，可能产生空变更提案。

## 6. 建议修复顺序

1. 将图像识别和 Agent 工具循环改为可配置的更长超时，或改成异步任务/轮询；客户端和 Function 的超时必须统一。
2. 为 `504` 增加 `TIMEOUT` 错误码，页面显示“模型响应超时，可稍后重试或手动录入”。
3. 将 `create_plan_proposal` 的 `field` 改为枚举，只允许实际可应用的计划字段。
4. 对空变更提案直接标记失败或 `needs_more_data`，禁止展示为可批准提案。
5. 增加真实模型工具循环 E2E，至少验证：读取计划 → 生成合法 proposal → 用户批准 → 计划版本递增。
6. 图片识别增加真实图片样本测试，不使用低分辨率占位图评估识别质量。

## 7. 最终判定

本轮本地确定性功能和数据持久化功能通过；自然语言运动解析及训练页刷新通过；本地计划审批事务通过。

真实 provider 的基础能力通过，但应用级图片识别和 AI 教练工具闭环未通过，根因是同步 15 秒超时与提案字段约束不足。当前状态不应宣称“真实 AI 教练已经可以稳定调整训练计划”，也不应宣称“真实餐图识别页面已完整通过”。

当前适合继续进行本地手工记录、训练演示、审批事务演示和降级演示；在超时与工具 schema 修复并重新完成真实 E2E 前，不建议进行公网功能验收或录制完整 AI 调整计划演示。

## 8. 修复后复测

本报告初版记录的问题已完成针对性修复：

- 浏览器请求默认超时调整为 45 秒；
- Function 支持 `MODEL_UPSTREAM_TIMEOUT_MS`，默认 45 秒；
- 504/`UPSTREAM_TIMEOUT` 统一映射为 `TIMEOUT`；
- 计划提案 schema 只允许实际可应用的训练组数字段；
- 空提案、增加训练组数和不支持字段均不会写入 proposal 或计划版本。

修复后重新执行：

```powershell
npx vitest run tests/unit/providerClient.test.ts tests/unit/agentTools.test.ts tests/unit/approval.test.ts --run
$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e
```

结果：

- 相关回归测试：12/12 通过；
- 真实模型 E2E：9/9 场景通过，包括餐图候选、自然语言运动解析、Agent 工具调用和提案拒绝；
- 真实模型场景使用干净的本地 Function 进程执行，避免残留服务进程污染结果。

修复后的最终限制仍包括公网 Netlify 权限、真实设备验收、provider 账单和长期识别准确率评测。
