# EvoFit 最新交接

日期：2026-10-30
状态：**LOCAL COMPLETE / ALIYUN ADAPTER READY / EXTERNAL DEPENDENCY BLOCKED**

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
- 阿里云 ECS 生产适配：Node HTTP 入口、systemd 服务模板、Nginx 配置模板和服务器环境模板。
- 生产默认使用 `function_proxy`；设置页保留 `browser_direct` 自定义 API 高级覆盖。

## 本轮测试问题修复

### 模型超时

真实 provider 的图片和工具请求超过旧的 15 秒限制，导致餐图候选和 AI 教练工具循环失败。

当前行为：

- 浏览器 providerClient 默认超时：45 秒；
- Function 默认上游超时：45 秒；
- 可通过服务器环境变量 MODEL_UPSTREAM_TIMEOUT_MS 调整；
- Function 返回 504 或 UPSTREAM_TIMEOUT 时，前端统一识别为 TIMEOUT；
- 仍然保留手工记录和本地确定性计算降级路径。

### 本地 Function 连接修复

- `.env` 默认使用 `VITE_API_BASE_URL=/.netlify/functions`；Vite 将同源请求代理到 `127.0.0.1:8888`，避免浏览器 localhost/IPv4/CORS 差异。
- provider client 对显式本地地址保留 `127.0.0.1` 和 `localhost` 两个候选端点；第一个网络失败时自动尝试第二个。
- 修改 `.env` 或 `vite.config.ts` 后必须重启 `npm run dev`；Function 仍需单独运行 `npm run dev:function`。

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
npm run smoke:server
npm run smoke:provider

修复后的重点结果：

- 相关 provider/Agent/审批回归测试：12/12 通过；
- 完整单元测试：16 个测试文件、68 个测试全部通过；
- 真实模型 E2E：9/9 场景通过，包括画像到今日页、手动餐食和刷新、真实餐图候选、真实自然语言运动解析、训练记录保存和刷新、身体指标、Agent 工具调用、proposal 拒绝、今日时间线和备份预览。
- 同源 Vite 代理训练解析：浏览器请求 `http://127.0.0.1:5173/.netlify/functions/ai-proxy`，代理到 8888 后返回 HTTP 200。
- 生产 Proxy smoke：`npm run smoke:server` 通过，验证生产入口启动、OPTIONS 204、未同意 403 和超大请求 413。
- provider smoke：文本、结构化 JSON、图像输入和 tool call 均通过。

真实 provider 结果是单次能力探针和受控去敏 E2E，不代表识别准确率、SLA、长期稳定性或费用。真实 key 只存在本机 `.env`、浏览器设置或服务器 `/etc/evofit/evofit.env`，不得复制到文档、测试、截图或聊天。

## 阿里云 nip.io 本地适配（2026-10-30）

已完成本地代码和部署模板适配，未执行 ECS 部署、DNS/HTTPS 申请或公网验收。

新增文件：

- `server/ai-proxy.mjs`：复用 Function handler，读取 systemd 环境变量，监听 `127.0.0.1:8888`，支持约 7 MB 请求体限制和 SIGTERM 优雅退出。
- `deploy/server.env.example`：默认 provider 为当前 `https://api.sudocode.chat/v1` / `gpt-6-luna`，API key 只保留占位符。
- `deploy/systemd/evofit-ai-proxy.service`：`evofit` 用户、`/srv/evofit/current`、`/etc/evofit/evofit.env` 和最小权限配置。
- `deploy/nginx/evofit.conf`：静态资源、SPA 深链、Function 代理、7 MB 请求体和 60 秒代理超时。
- `scripts/production-proxy-smoke.mjs`：不调用真实模型，验证生产入口启动、OPTIONS、未同意 403 和超大请求 413。

provider 规则：

- `MODEL_*` 优先，`OPENAI_*` 继续兼容本地现有 `.env`。
- 服务器读取 `MODEL_ALLOWED_BASE_URLS` 精确 HTTPS allowlist；当前 API 需要显式填写 `https://api.sudocode.chat/v1`。
- 生产新浏览器默认使用 `function_proxy`，服务器 API key 不进入浏览器。
- 设置页保留 `browser_direct` 自定义覆盖；选择后 key 仅保存在当前浏览器，并绕过服务器 provider allowlist，建议只用于开发者或明确知情的高级场景。
- 阿里云方案按部署文档不设置 `PREVIEW_ACCESS_TOKEN`，成本控制依赖 HTTPS、allowlist、请求体限制和限流。

本地新增验证命令：

    npm run smoke:server
    npm run start:proxy

当前外部阻塞仍包括：ECS 访问权限、公网 HTTPS、Nginx/Function 实际配置、provider 账单和配额、真实手机验收。未修改业务数据、未清理 IndexedDB、未提交任何 API key，也未执行远程 push。

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
