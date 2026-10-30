# EvoFit 校赛完整版本交接

日期：2026-10-30  
状态：**LOCAL COMPLETE / EXTERNAL DEPENDENCY BLOCKED**

本轮已按 `docs/superpowers/plans/2026-10-30-evofit-school-competition-complete.md` 完成本地校赛完整版本主链路。项目继续使用 React + Vite + TypeScript + Dexie + Zod；所有有效计划写入仍由本地审批事务完成，模型不能直接写入计划或健康记录。

## 本轮已完成

- v3 数据契约和迁移：provider 配置、完整画像、目标、身体指标、食物/动作目录、会话/消息表；旧 profile 使用安全默认值。
- provider 能力：浏览器直连与受控 Function 统一 client、15 秒超时、HTTPS/localhost URL 校验、错误状态、脱敏摘要；API key 不进入备份、日志、测试或构建产物。
- 画像与目标：五步画像字段、安全风险拦截、目标体重、活动水平、可用时间、蛋白质区间和估计缺口/盈余。
- 饮食与训练：30 条食物目录、21 个动作目录、关键词搜索、训练七日日历、完成/跳过/改期/反馈。
- Agent 与聊天：`agentTools` 统一 mode/profile 校验，`chatAgent` 保存最近 12 条消息、最多 6 轮工具循环；`ChatCoach` 有会话、快捷问题、ToolTrace、停止、错误和提案审批卡片。
- 周报与历史：固定最近 14 天窗口、身体指标趋势、proposal 证据、审批时间/结果版本、历史计划恢复为新版本。
- 今日/设置：今日时间线、目标摘要、当前 mode 删除、provider 隐私说明、备份预览/冲突合并、离线与错误降级。
- Botanical Garden 视觉重构：统一 Fern Green、Marigold、Terracotta、Cream 主题变量与字体回退；重做卡片、表单、按钮、状态、时间线和 AI 样式；桌面侧栏改为深绿色编辑感布局，移动端新增底部导航，AI 抽屉在移动端改为底部弹层；业务逻辑、路由、数据库和 AI 权限流程保持不变。
- 文档：`docs/progress.md` 按阶段记录；新增 `docs/school-competition-complete-readiness.md`、需求追踪和验收证据。

## 验证证据

- `npm run typecheck`：PASS。
- `npm test -- --run`：PASS（15 files / 52 tests）。
- `npm run build`：PASS（仅既有单 bundle >500 kB warning）。
- `npm run test:e2e`：PASS（6 个完整本地 P0 场景）。
- 浏览器视觉验收：PASS（桌面 onboarding/今日页、375px 今日页、移动底部导航、AI 底部弹层）。
- CSS 变量完整性检查：PASS（主题样式未发现未定义 `var(--...)` 引用）。
- `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`：PASS（6 个本地 + 3 个真实模型场景）。
- `npm run smoke:provider`：PASS（4/4 HTTP 200；本次平均 5650 ms / 4436.5 tokens）。

真实 provider 结果是单次能力探针和受控去敏 E2E，不代表识别准确率、SLA、长期稳定性或费用；费用仍需账单证据。真实 key 只存在本机 `.env`/设置，不得复制到文档、测试、截图或聊天。

## 仍阻塞的外部门禁

- Netlify 团队/站点权限、真实域名 CORS、访问保护、持久化限流、账单配额和深链刷新。
- 真实 iOS/Android 设备验收；浏览器 375×812 模拟不能替代真机。
- provider 账单或官方单价证据。

在这些条件完成前，不执行公网部署、不开放无保护代理、不把本地 smoke 结果写成线上通过。部署前先保留当前 Git 提交和 JSON 备份；异常时回滚站点/Function 或 Git 提交，不手工删除 IndexedDB。

## 接手入口

1. 先看 [校赛完整版本准备报告](docs/school-competition-complete-readiness.md)、[开发进度](docs/progress.md) 和 `git status`。
2. 本地回归使用 `npm ci`、`npm run typecheck`、`npm test -- --run`、`npm run build`、`npm run test:e2e`。
3. 需要真实模型时使用 `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`；不得输出或提交 key。
4. 只有外部门禁证据齐全后，才继续受控预览部署和发布审计。
