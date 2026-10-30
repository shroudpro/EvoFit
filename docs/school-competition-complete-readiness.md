# EvoFit 校赛完整版本准备报告

日期：2026-10-30

## 结论

本地校赛完整版本主链路达到 `VERIFIED`：画像安全、目标计算、饮食与运动记录、训练日历、身体指标、AI 教练、提案审批、计划历史、备份和离线降级均有代码与自动化证据。Netlify 受控预览、真实手机和 provider 账单仍为 `BLOCKED` 外部门禁，因此本报告不代表公网发布完成。

## P0 状态

| 能力 | 状态 | 证据 |
|---|---|---|
| 成年画像与安全筛选 | VERIFIED | `src/domain/safety.ts`、`src/pages/Onboarding.tsx`；`npm run test:e2e` |
| 目标/蛋白质范围 | VERIFIED | `src/domain/goals.ts`、`src/pages/Today.tsx`；`tests/unit/goals.test.ts` |
| 食物目录与餐食确认 | VERIFIED | `src/db/catalog.ts`、`src/pages/Nutrition.tsx`；`tests/unit/catalog.test.ts`、真实模型 E2E |
| 训练目录、日历、改期 | VERIFIED | `src/db/catalog.ts`、`src/pages/Training.tsx`、`src/db/database.ts`；仓储单测/E2E |
| 身体指标与 14 天趋势 | VERIFIED | `src/pages/BodyMetrics.tsx`、`src/domain/bodyMetrics.ts`；`tests/unit/bodyMetrics.test.ts` |
| AI 教练工具循环与提案 | VERIFIED | `src/api/agentTools.ts`、`src/api/chatAgent.ts`、`src/pages/ChatCoach.tsx`；Agent/chat 单测、真实模型 E2E |
| 提案审批、历史和恢复 | VERIFIED | `applyApprovedProposal`、`restorePlanVersion`；`tests/unit/approval.test.ts` |
| 备份、mode 隔离、删除 | VERIFIED | `src/db/database.ts`、`src/pages/Settings.tsx`；backup/repository 单测/E2E |
| 失败/离线/限流降级 | VERIFIED | `src/shared/errors.ts`、`src/api/providerClient.ts`、Function 单测 |
| Netlify、真实手机、账单 | BLOCKED | 需要外部权限、设备和账单证据 |

## 自动化证据

- `npm run typecheck`：PASS。
- `npm test -- --run`：15 files / 52 tests PASS。
- `npm run build`：PASS；仅有既有单 bundle 大于 500 kB 的 warning。
- `npm run test:e2e`：6 个本地场景 PASS，包含完整 P0 入口、身体指标、AI 教练和时间线。
- `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`：6 个本地场景 + 3 个真实模型场景 PASS（餐图、运动解析、Agent/提案拒绝）。
- `npm run smoke:provider`：Responses 文本、结构化 JSON、图像 capability、tool call 均 HTTP 200；本次单探针平均延迟 5650 ms、平均 total tokens 4436.5。样本量为 1，不能推导准确率、SLA 或费用。

## 演示脚本

1. 启动 `npm run dev`，完成五步画像并确认安全声明。
2. 在今日页查看目标/蛋白质范围；饮食页搜索食物并保存克重。
3. 训练页选择一周日历，完成/跳过任务，必要时改期并填写反馈。
4. 成长页录入体重，查看 14 天趋势；运行周报并检查 ToolTrace。
5. 打开 AI 教练，勾选同意后使用快捷问题；计划变化只能显示待审批提案。
6. 拒绝提案确认版本不变，再次运行后批准，查看计划历史并恢复旧版本。
7. 设置页导出 JSON，预览导入冲突；切换 demo 并重置，确认 real 数据仍在。

## 配置和回滚

本地开发在“我的 → AI 模型配置”填写 provider URL、key 和 model；浏览器直连 key 只保存在本机，受控 Function 使用服务器变量。真实 key 不进入仓库、测试、日志、截图或备份。异常时先导出当前 mode JSON，再回滚 Git 提交或站点/Function 版本，不手工删除 IndexedDB。
