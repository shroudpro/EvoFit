# R2 AI 质量评测记录

评测日期：2026-10-30  
模型：`gpt-6-luna`  
协议：Responses API，经 `netlify/functions/ai-proxy.ts` 受控代理；浏览器不持有 API key。  
数据合规：未上传真实私人健康记录；没有可用的真实餐图测试集，因此不报告食物识别准确率。

## 可重复流程

```powershell
npm run smoke:provider
npm run typecheck
npm test -- --run tests/unit/modelAdapter.test.ts tests/unit/agent.test.ts
npm run test:e2e
```

`EVOFIT_REAL_MODEL_E2E=1 npm run test:e2e` 会启动本地受控 Function 并执行真实餐图、运动解析和 Agent 工具链；该流程会消耗 provider 额度，除非需要刷新证据，不重复运行。

## 本轮实际 provider 能力探针

本轮为获取延迟和 usage 数据运行了一次 `npm run smoke:provider`，结果如下。脚本只输出脱敏 URL 前缀、状态、延迟和 token 数，不输出 key 或模型原文。

| 场景 | HTTP | 延迟 | input tokens | output tokens | total tokens |
|---|---:|---:|---:|---:|---:|
| Responses 文本 | 200 | 3696 ms | 4393 | 5 | 4398 |
| 严格结构化 JSON | 200 | 2923 ms | 4425 | 18 | 4443 |
| 图像输入 capability probe | 200 | 2974 ms | 4396 | 35 | 4431 |
| Function tool call | 200 | 3242 ms | 4441 | 18 | 4459 |

成功率：4/4（100%，单次探针样本，不代表 SLA）。  
平均延迟：3209 ms。  
平均 total tokens：4432.75。  
费用：待测。当前仓库没有可验证的 provider 计价凭证，不能根据 token 数推导金额。

## 业务链路证据与限制

- R1 本地 Function E2E 已执行真实餐图候选、用户将候选改为“米饭 150g”后确认保存；这是 1 个端到端样本，不是识别准确率。
- R1 本地 Function E2E 已执行运动参数解析；用户确认 45 分钟和中等强度后，MET 与净消耗由本地确定性函数计算。
- R1 本地 Function E2E 已执行 Agent 周报工具链；模型调用白名单只读工具，浏览器拒绝提案后计划保持不变。
- 本轮没有足够的合法、非个人真实图片样本来统计单食物、多食物、份量误差、数据库匹配覆盖率或人工修正率；人工修正仅能记录为上述 1 个餐图样本和 1 个运动样本，不能外推。
- 未知食物的营养字段保持 `null`；未知运动或缺失必要参数不会写入虚构能耗。
- 结构化 JSON 非法、请求失败、缺少同意或 15 秒超时均回到手工/本地规则路径，并保留明确状态消息。

## 后续评测门槛

1. 准备至少 20 张去敏、非个人餐图，人工标注食物名和称重范围；记录 top-1 食物命中、多食物召回、质量误差和本地营养匹配覆盖率。
2. 准备至少 20 条运动自然语言样本，分别覆盖缺时长、速度、坡度、强度和单位混用。
3. 为每个周报样本记录历史数据窗口、模型是否引用不存在字段、提案状态和人工批准/拒绝结果。
4. 使用 provider 账单或官方单价补充费用；在此之前保持“待测”。

## R3 回归补充（2026-10-30）

为验证 R3 Function 与模型适配器改动，重新执行了一次受控真实模型回归：

- `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e`：8 个场景通过（5 个本地核心场景 + 真实餐图、真实运动解析、真实 Agent 工具/拒绝提案）。使用本地受控 Function harness，未上传私人健康数据。
- `npm run smoke:provider`：4/4 HTTP 200。延迟分别为 2506/2189/3202/2584 ms；total tokens 分别为 4398/4443/4454/4459。该结果是单次能力探针，不代表 SLA，费用仍待 provider 账单验证。
- 新增 Function 访问码与限流单测后，单元测试为 7 files / 30 tests passed。

真实餐图准确率、长期稳定性、云端配额和费用仍不能从上述单次样本推断。
