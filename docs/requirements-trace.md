# EvoFit R0 需求追踪

| PRD / MVP | 工作包 | 自动化验证 | 状态 |
|---|---|---|---|
| P0-01, MVP-01 | WP-02, WP-04 | `tests/unit/repository.test.ts`, `scripts/e2e-smoke.mjs`, 手工刷新 | VERIFIED（R0） |
| P0-02 | WP-03, WP-04 | `tests/unit/calculations.test.ts` | VERIFIED（R0） |
| P0-03/04, MVP-02/03 | WP-05 | 手工确认、失败降级 | 部分完成：手工已验证，真实图像待凭证 |
| P0-05/06, MVP-04 | WP-06 | `tests/unit/calculations.test.ts`, 手工解析 | VERIFIED（R0） |
| P0-08 | WP-04 | 页面集成/手工 | VERIFIED（R0） |
| P0-09/10, MVP-06/07 | WP-07 | `tests/unit/agent.test.ts` | 本地工具 VERIFIED；真实模型待环境 |
| P0-11, MVP-08/09/10 | WP-08 | `tests/unit/approval.test.ts`, 手工批准 | VERIFIED（R0） |
| P0-12, MVP-05/06 | WP-02, WP-07 | `tests/unit/repository.test.ts` | VERIFIED（R0） |
| P0-13 | WP-02, WP-08 | 导出路径 | 部分完成：导出已实现，导入待 R1 |
| P0-14, MVP-11/12 | R0 Gate | typecheck/test/build/E2E/密钥扫描 | 本地 VERIFIED；公网待授权 |

状态只在真实命令或人工验收完成后更新为 VERIFIED/DONE。
