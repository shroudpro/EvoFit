# EvoFit R2 交接

交接日期：2026-10-30  
工作区：`E:\Vibe-coding\evofit`

## 本轮已完成

- 审批事务现在校验 proposal 的 `profileId` 与目标 profile 一致；拒绝、重复批准、过时版本和 mode 作用域均不会改变原计划。
- 浏览器模型适配器与 Netlify Function 都有 15 秒超时。缺少同意、未配置、非法 JSON、provider 错误和超时都会回到手工/本地规则路径。
- 备份导出包含当前 mode 的 profile、计划、餐食、运动、提案、AgentRun、ToolTrace 和审计记录；导入通过严格 Zod schema、`source`、版本和 mode 检查，先预览，用户确认后以事务合并，ID 冲突保留本地记录。
- 训练任务支持完成/跳过，写入 `status`、`completedAt`/`skippedAt`；训练页刷新保持一致，周报展示由本地确定性函数计算的训练完成率。
- `scripts/provider-smoke.mjs` 记录延迟和 usage；`docs/ai-evaluation.md` 记录本轮一次真实 `gpt-6-luna` provider 探针和样本限制。
- `netlify.toml`、Function allowlist、SPA fallback、环境变量边界和本地/云端数据边界已复核。未公开部署、未上传私人健康数据、未暴露付费模型代理。

## 主要修改

- `src/db/database.ts`：审批作用域、训练状态、备份导出/预览/导入。
- `src/shared/schemas.ts`、`src/shared/types.ts`：严格备份实体 schema 与训练时间戳字段。
- `src/pages/Settings.tsx`：导入文件、预览和确认合并 UI。
- `src/pages/Training.tsx`、`src/pages/Today.tsx`、`src/pages/Progress.tsx`：任务状态、刷新展示和训练完成率。
- `src/api/modelAdapter.ts`、`netlify/functions/ai-proxy.ts`：超时与降级。
- `tests/unit/approval.test.ts`、`repository.test.ts`、`backup.test.ts`、`calculations.test.ts`、`modelAdapter.test.ts`、`scripts/e2e-smoke.mjs`：R2 回归覆盖。
- `docs/ai-evaluation.md` 及 `docs/acceptance.md`、`progress.md`、`requirements-trace.md`、`decisions.md`、`architecture.md`、`deployment.md`：同步记录。

## 实际验证

```text
npm run typecheck        passed
npm test -- --run       7 files / 28 tests passed
npm run build            passed（仅 bundle >500 kB warning）
npm run test:e2e         passed（本地 5 个核心场景，含训练完成刷新和备份导入预览）
npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node  passed
npm run smoke:provider  passed（本轮一次；4/4 HTTP 200，延迟/token 见 docs/ai-evaluation.md）
```

没有重新运行真实模型浏览器 E2E，因为 R1 已有真实本地 Function 证据，本轮只修改超时和边界逻辑；重复运行会消耗 provider 额度。若要刷新真实业务样本，使用：

```powershell
$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e
```

## 当前阻塞与风险

- 没有足够的合法非个人餐图样本，不能报告食物识别准确率、份量误差或人工修正率；当前仅有单个真实链路样本。
- provider 计价和账单不可验证，AI 费用保持“待测”。
- 未获得 Netlify 访问权限，尚未验证公网域名 CORS、线上鉴权、持久化限流、账单配额和深链刷新。
- 移动端真机验收尚未执行。
- `master` 工作区仍包含 R1 及 R2 未提交改动；继续工作前先查看 `git status`，不要 reset 或清理 `.env`/IndexedDB。

## 建议下一步

1. 在受控 Netlify 预览环境配置服务器变量和访问保护，验证深链、Function 超时和限流后再讨论公开部署。
2. 建立去敏餐图/运动评测集，按 `docs/ai-evaluation.md` 记录可复现实验结果。
3. 进行一次手机真机验收，重点检查设置页导入预览、训练状态和 demo/real 切换。
4. 若需要 schema 结构性升级，再新增 Dexie 版本并补迁移测试；当前 R2 只增加兼容字段，没有清空或覆盖已有 IndexedDB。
