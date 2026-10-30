# EvoFit R1 · 真实 AI 集成交接

交接日期：2026-10-30。工作区：`E:\Vibe-coding\evofit`。

## 已完成

- `src/api/modelAdapter.ts` 已从固定未连接状态改为调用 `/.netlify/functions/ai-proxy`。浏览器只发送用途、最小输入和明确同意标记；模型输出必须通过 Zod schema。
- `netlify/functions/ai-proxy.ts` 固定用途和 JSON Schema，读取服务器 `MODEL_API_KEY`/`OPENAI_API_KEY`、`MODEL_BASE_URL`/`OPENAI_BASE_URL`，限制 provider allowlist，不接受前端模型覆盖或任意代理地址。
- 餐图页面已支持真实模型候选、名称/克重校正和确认保存。营养数值只从本地食物表映射；未知食物的营养字段保留 `null`。
- 运动页面已支持自然语言参数候选和确认保存。MET、净消耗由 `estimateExerciseEnergy` 计算；缺少参数或未知活动不会写入虚构数值。
- 周报保留本地只读工具和确定性统计，用户同意时调用 `weekly_review`；模型只能返回受限提案，业务规则过滤字段和范围，最终仍走审批事务。
- E2E 脚本现在会自动启动和回收 Vite，覆盖画像→今日、手动餐食刷新持久化、缺少模型同意时的明确降级；在本地 Function harness + 当前 provider 下还通过了真实餐图、真实运动解析、真实 Agent tool loop 和浏览器拒绝提案。
- `scripts/local-ai-proxy.mjs` 提供受控本地 Function harness；它只读取服务器 `.env`，不把密钥暴露给浏览器静态资源。

## 实际验证

- `npm run typecheck`：通过。
- `npm test -- --run`：6 files / 20 tests 通过。
- `npm run build`：通过；仅有 bundle size warning。
- `npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node`：通过。
- `npm run test:e2e`：通过，3 个场景通过。
- PowerShell `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`：通过，6 个场景通过；脚本自动启动/回收 `scripts/local-ai-proxy.mjs`。
- `npm run smoke:provider`：`gpt-6-luna` 当前第三方 Responses 兼容端点的文本、结构化 JSON、图像输入、工具调用均 HTTP 200 / passed。

## 仍需完成

- 在受控 Netlify 环境配置 Function 变量后，复现真实餐图、真实运动解析、真实周报浏览器端到端验收；当前真实证据来自自动启动的本地 Function harness，尚未把真实健康图片或摘要发送到线上部署。
- 补浏览器拒绝提案、版本冲突、重复批准、demo/real 切换后的周报刷新证据。
- 评估并记录真实餐图候选准确率、模型延迟和费用；未执行公网部署，不能宣称公网可用。
- 备份导入/预览/合并、训练任务完成状态持久化和手机真机验收仍未完成。

## 下一步建议

1. 用受控环境启动 Netlify Function，保留 provider allowlist 和服务器密钥边界。
2. 使用去敏、非个人图片验证餐图候选，记录人工校正结果，不保存原图和密钥。
3. 补齐浏览器审批拒绝/冲突场景，并在 `docs/acceptance.md` 只填写真实命令或人工证据。
4. 若需要修改 IndexedDB schema，增加 Dexie 版本迁移和对应测试；不要清理真实空间数据。

旧 R0 交接仍保留在 [`HANDOFF.md`](./HANDOFF.md)。
