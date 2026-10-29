# R0 验收矩阵

| ID | 状态 | 证据/备注 |
|---|---|---|
| MVP-01 | 通过（手工） | Playwright：画像提交进入 `/today`，显示一周任务；待刷新后的人工复核 |
| MVP-02 | 通过（手工） | Playwright：保存米饭 150g 显示 174 kcal，编辑为 200g 后显示 232 kcal |
| MVP-03 | TODO | 模型未连接时需展示失败降级 |
| MVP-04 | TODO | 待运动解析页面 |
| MVP-05 | 通过（自动化） | `repository.test.ts` 验证 demo 清理不影响 real |
| MVP-06 | 通过（手工/自动化） | demo seed + `agent.test.ts` 统计来自 14 天记录 |
| MVP-07 | 部分通过 | 本地只读工具 trace 已真实执行；真实提供商文本/JSON/图像/tool smoke 通过，但页面真实模型链路待接入 |
| MVP-08 | 待补手工 | 状态机已有拒绝路径，需再做浏览器点击证据 |
| MVP-09 | 通过（手工/自动化） | `approval.test.ts` + Playwright 批准后成功消息 |
| MVP-10 | 通过（自动化） | 版本冲突和重复批准测试通过 |
| MVP-11 | 通过 | `npm run typecheck`、`npm test`、`npm run build`、`npm run test:e2e` |
| MVP-12 | 部分通过 | 源码/dist 不含密钥；当前 `.env` 含真实 key，扫描必须排除该文件；公网响应未验证 |

`TODO`、`待环境验证` 与 `通过` 严格区分，不以文字描述替代命令证据。
