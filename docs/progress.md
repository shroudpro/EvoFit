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
| WP-01 | IN_PROGRESS | package.json, src/* | 待执行安装与构建 |
| WP-02 | IN_PROGRESS | src/shared, src/db | 待执行单测 |
| WP-03 | IN_PROGRESS | src/domain | 待执行单测 |
| WP-04 | TODO | src/pages | - |
| WP-05/06 | TODO | src/features | - |
| WP-07/08 | TODO | src/features/agent | - |

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
