# EvoFit 最新交接

日期：2026-10-30
状态：**LOCAL COMPLETE / EXTERNAL DEPENDENCY BLOCKED**

当前版本已完成本地校赛主链路和针对真实模型测试问题的修复。项目继续使用 React + Vite + TypeScript + Dexie + Zod；模型只能读取授权数据或生成待审批提案，实际计划写入仍由本地审批事务完成。

## 当前实现

- v3 数据契约和迁移：provider 配置、画像、目标、身体指标、食物/动作目录、会话/消息表。
- real/demo 模式隔离，演示数据可重置，不影响真实空间。
- 手动饮食记录、餐图候选识别、用户校正、营养本地映射。
- 手动运动记录、自然语言参数解析、用户确认、MET/净消耗本地计算。
- 七日训练日历，支持完成、跳过、改期和反馈。
- 今日驾驶舱、14 天记录质量、身体指标趋势和计划历史。
- Agent 只读工具、聊天上下文、工具循环、ToolTrace 和待审批计划提案。
- 用户批准后创建新计划版本，支持 profile、mode、状态和版本冲突校验。
- JSON 备份预览、schema 校验、冲突保留和当前模式事务合并。
- Netlify Function 代理、provider allowlist、访问码、限流、请求体限制和降级路径。

## 本轮测试问题修复

### 模型超时

真实 provider 的图片和工具请求超过旧的 15 秒限制，导致餐图候选和 AI 教练工具循环失败。

当前行为：

- 浏览器 providerClient 默认超时：45 秒；
- Function 默认上游超时：45 秒；
- 可通过服务器环境变量 MODEL_UPSTREAM_TIMEOUT_MS 调整；
- Function 返回 504 或 UPSTREAM_TIMEOUT 时，前端统一识别为 TIMEOUT；
- 仍然保留手工记录和本地确定性计算降级路径。

### 计划提案安全

create_plan_proposal 现在只允许：

training.sessions[1].exercises[0].sets

并且：

- after 必须是 1–10 的整数；
- 只能减少当前组数；
- 不支持的字段会在工具参数校验阶段拒绝；
- 空变更和增加训练量不会写入 proposal；
- applyApprovedProposal 再次执行同样的安全校验，防止旧数据绕过工具层。

## 最新验证证据

执行过：

npm run typecheck
npm test -- --run
npm run build
npm run test:e2e
$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e
npm run smoke:provider

修复后的重点结果：

- 相关 provider/Agent/审批回归测试：12/12 通过；
- 完整单元测试：16 个测试文件、62 个测试全部通过；
- 真实模型 E2E：9/9 场景通过，包括画像到今日页、手动餐食和刷新、真实餐图候选、真实自然语言运动解析、训练记录保存和刷新、身体指标、Agent 工具调用、proposal 拒绝、今日时间线和备份预览。
- provider smoke：文本、结构化 JSON、图像输入和 tool call 均通过。

真实 provider 结果是单次能力探针和受控去敏 E2E，不代表识别准确率、SLA、长期稳定性或费用。真实 key 只存在本机 .env/设置，不得复制到文档、测试、截图或聊天。

## 当前外部阻塞

以下内容仍不能由本地测试替代：

- Netlify 团队/站点权限；
- 真实域名 CORS、访问保护、限流和深链刷新；
- provider 账单、配额和费用证据；
- 真实 iOS/Android 设备验收；
- 规模化餐图识别准确率和长期稳定性评测。

在这些证据齐全前，不执行公网部署、不开放无保护模型代理、不把本地 smoke 结果写成线上通过。

## 本地接手命令

    npm ci
    npm run typecheck
    npm test -- --run
    npm run build
    npm run test:e2e

真实模型回归：

    $env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e

需要并行运行 Function 时：

    npm run dev:function
    npm run dev

接手前先查看：

- 校赛完整版本准备报告：docs/school-competition-complete-readiness.md
- 开发进度：docs/progress.md
- 测试报告：docs/test-report-2026-10-30.md
- git status

部署前保留当前 Git 提交和 JSON 备份；异常时回滚站点/Function 或 Git 提交，不手工删除 IndexedDB。
