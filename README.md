# EvoFit 校赛完整版本 · 本地完成版

EvoFit 是一个本地优先的成年健康记录与自适应计划原型。它覆盖健康画像、个性化训练计划、饮食与运动记录、14 天演示数据、本地确定性统计、只读 Agent 工具轨迹、待审批计划提案、计划版本事务，以及当前模式的数据备份与恢复。

当前状态：**本地校赛完整版本已完成**。画像、目标、食物/训练、身体指标、AI 教练、提案审批、计划历史、备份和离线降级均已实现并通过本地回归；Netlify、真实手机和账单仍受外部条件阻塞。

## 已实现的核心闭环

- 成年用户画像：年龄门槛、健康声明、目标、器械条件和时区。
- 目标驱动的一周训练计划，并支持任务完成/跳过状态持久化。
- 手工餐食记录，以及真实模型返回的餐图候选；用户确认名称和克重后才保存，营养值来自本地食物表。
- 手工运动记录，以及真实模型返回的自然语言运动参数；用户确认后由本地 MET 公式计算能耗。
- 今日驾驶舱从当前 `real` 或 `demo` 空间实时读取数据。
- 独立的 14 天合成演示数据，重置演示空间不会删除真实空间。
- 本地确定性统计和只读 Agent 工具轨迹；模型只能生成结构化计划提案。
- 用户批准后才通过事务创建新计划版本；拒绝、重复批准、版本冲突和跨画像提案均不会修改原计划。
- 当前模式 JSON 导出、严格 schema 校验、导入预览、冲突保留和事务合并。

所有能量、MET、营养和趋势数字都是估算，不构成诊断或治疗建议。

## 项目目录与文件说明

EvoFit 是一个前端本地优先应用：业务数据保存在浏览器 IndexedDB，服务器只负责受控转发模型请求，不保存用户画像、餐食、训练或计划数据。

```text
evofit/
├─ src/                              前端业务源码
│  ├─ main.tsx                       React 应用入口
│  ├─ app/App.tsx                    路由、全局 mode/profile 上下文、导航和 AI 抽屉
│  ├─ pages/                         页面级业务组件
│  │  ├─ Onboarding.tsx              首次画像、安全筛选、初始计划和目标
│  │  ├─ Today.tsx                   今日驾驶舱、营养/运动/训练时间线
│  │  ├─ Nutrition.tsx               手工餐食、餐图候选确认和营养汇总
│  │  ├─ Training.tsx                训练日历、运动记录和任务状态
│  │  ├─ Progress.tsx                14 天分析、AI 周报、提案审批和计划历史
│  │  ├─ BodyMetrics.tsx              体重/腰围记录和趋势
│  │  ├─ ChatCoach.tsx               全局 AI 教练聊天界面
│  │  └─ Settings.tsx                provider、备份、删除和隐私设置
│  ├─ api/                           模型适配和 Agent 编排
│  │  ├─ providerClient.ts            browser direct / Function proxy 统一客户端
│  │  ├─ modelAdapter.ts              餐图、运动、周报的结构化模型适配
│  │  ├─ agent.ts                     周报 Agent、ToolTrace 和 proposal
│  │  ├─ agentTools.ts                工具注册、Zod 入参和作用域校验
│  │  ├─ chatAgent.ts                 多轮聊天、工具循环和对话持久化
│  │  └─ chatContext.ts               AI 教练画像、BMI、目标和历史摘要
│  ├─ db/                            Dexie / IndexedDB 数据层
│  │  ├─ database.ts                  表、仓储、审批事务和备份恢复
│  │  ├─ migrations.ts                旧画像迁移和安全默认值
│  │  ├─ seed.ts                      demo 数据生成、重置和初始化
│  │  └─ catalog.ts                   食物目录和动作目录
│  ├─ domain/                        不依赖 UI 的确定性业务计算
│  │  ├─ calculation.ts               REE、营养、MET、能量和记录质量
│  │  ├─ goals.ts                     蛋白质范围、能量目标和缺口/盈余
│  │  ├─ safety.ts                    成年、安全风险和自动目标边界
│  │  └─ bodyMetrics.ts               身体指标趋势汇总
│  ├─ shared/                        类型、契约、错误和通用工具
│  │  ├─ types.ts                     TypeScript 实体类型
│  │  ├─ schemas.ts                   Zod 数据/模型/备份 schema
│  │  ├─ providerConfig.ts            provider 默认值、校验和脱敏摘要
│  │  ├─ agent.ts                     Agent 状态、工具和调用类型
│  │  ├─ errors.ts                    统一错误码和 EvoFitError
│  │  └─ utils.ts                     ID、时间和基础工具函数
│  └─ styles.css                     全局布局、组件和响应式样式
├─ netlify/functions/ai-proxy.ts     受控模型代理，不读取 IndexedDB
├─ server/ai-proxy.mjs               阿里云 systemd 生产入口，监听 127.0.0.1:8888
├─ deploy/                            systemd、Nginx 和服务器环境模板
├─ scripts/                           本地验证和辅助脚本
├─ tests/unit/                        Vitest 单元测试
├─ tests/e2e/                         P0 浏览器验收场景
├─ docs/                              架构、验收、部署、进度和评测记录
├─ public/                            静态资源，例如 favicon
├─ package.json                       npm 脚本和依赖
├─ package-lock.json                  锁定依赖版本，优先使用 npm ci
├─ vite.config.ts                     Vite、React 插件和本地 Function 代理
├─ tsconfig*.json                     TypeScript 应用/Node 配置
├─ netlify.toml                       Netlify 构建、Function 目录和 SPA 回退
├─ .env.example                       非密钥环境变量示例
├─ HANDOFF-LATEST.MD                  最新接手状态、验证证据和外部阻塞
├─ EvoFit_正式PRD_V1.4.md             工程版产品需求和验收边界
└─ README.md                          当前操作手册
```

`node_modules/`、`dist/`、`test-results/`、`.playwright-mcp/` 和 `*.tsbuildinfo` 是依赖或生成目录，不属于源码接手范围，可以由安装、构建和测试命令重新生成。

### 推荐阅读顺序

1. 先读本 README，确认启动命令和部署方式。
2. 再读 [HANDOFF-LATEST.MD](HANDOFF-LATEST.MD)，确认当前完成内容和外部阻塞。
3. 读 [docs/architecture.md](docs/architecture.md)，理解浏览器、Dexie、Agent 和 Function 的数据流。
4. 需要修改产品行为时读 [EvoFit_正式PRD_V1.4.md](EvoFit_正式PRD_V1.4.md)。
5. 需要部署时读 [docs/alicloud-nipio-deployment.md](docs/alicloud-nipio-deployment.md) 和本文阿里云章节。
6. 需要核对验收时读 `docs/acceptance.md`、`docs/release-readiness.md` 和 `docs/ai-evaluation.md`。

页面不要直接调用模型供应商或直接操作底层 Dexie 表，通常遵循：

```text
页面 → api / repo → domain 纯函数或 agentTools → Zod 校验 → IndexedDB 事务或受控 AI Proxy
```

模型只能返回候选、结构化字段或待审批提案；营养、MET、能量、趋势和最终计划写入由本地代码负责。

## 本地开发与运行（从零接手）

下面按 Windows PowerShell 操作，项目目录示例为 `E:\Vibe-coding\evofit`。Linux/macOS 使用等价的 Git、Node 和 npm 命令即可。

### 1. 安装前置环境

需要安装 Git、Node.js 22 或更高版本、npm 和 Chrome。安装后检查：

```powershell
node --version
npm --version
git --version
```

### 2. 下载项目

公开仓库：

```powershell
Set-Location E:\Vibe-coding
git clone <你的仓库地址> evofit
Set-Location E:\Vibe-coding\evofit
```

已有工作区：

```powershell
Set-Location E:\Vibe-coding\evofit
git status --short --branch
git pull --ff-only
```

接手时先看 `git status`。不要使用 `git reset --hard` 覆盖未确认改动，不要删除 `.env`，也不要清空浏览器 IndexedDB。

### 3. 安装依赖

```powershell
Set-Location E:\Vibe-coding\evofit
npm ci
```

`npm ci` 严格按照 `package-lock.json` 安装依赖。升级依赖时才使用 `npm install`，并重新运行类型检查、单测和构建。

### 4. 创建本地环境文件

```powershell
Copy-Item .env.example .env
```

`.env` 已被 `.gitignore` 忽略。真实 API key 只能放在本机 `.env` 或浏览器设置中，不能放进 `VITE_*` 变量、源码、README、截图或构建产物。

本地受控 Function 模式推荐：

```dotenv
VITE_API_BASE_URL=/.netlify/functions
MODEL_BASE_URL=https://api.sudocode.chat/v1
MODEL_ALLOWED_BASE_URLS=https://api.sudocode.chat/v1
MODEL_ID=gpt-6-luna
```

本地 Function 兼容 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`。需要真实模型时，把 key 写入 `.env` 的 `MODEL_API_KEY` 或 `OPENAI_API_KEY`，不要写进 README。

### 5. 启动前端和本地 AI Function

终端一：

```powershell
Set-Location E:\Vibe-coding\evofit
npm run dev:function
```

该命令读取项目根目录 `.env`，启动监听 `127.0.0.1:8888` 的本地 AI Proxy。终端二：

```powershell
Set-Location E:\Vibe-coding\evofit
npm run dev
```

浏览器打开 `http://localhost:5173`。首次进入会打开画像页；完成画像后可以切换“真实”和“演示”空间。两个空间通过 `mode` 隔离，不会混用。

只想查看页面或使用手工记录时，可以只运行 `npm run dev`；需要餐图、自然语言运动或 AI 周报时，再同时启动 `npm run dev:function`。

修改 `.env` 或 `vite.config.ts` 后必须重启 Vite。浏览器出现 `Failed to fetch` 时，先确认 8888 进程和 `VITE_API_BASE_URL=/.netlify/functions`。

## npm 命令速查

| 命令 | 用途 | 是否访问真实模型 |
|---|---|---|
| `npm run dev` | 启动 Vite 开发服务器 | 否，除非另有 provider 配置 |
| `npm run dev:function` | 启动读取本机 `.env` 的本地 Function | 仅实际发起 AI 请求时 |
| `npm run start:proxy` | 启动生产形态 `server/ai-proxy.mjs` | 仅实际发起 AI 请求时 |
| `npm run smoke:server` | 验证生产入口、OPTIONS、403、413 | 否 |
| `npm run typecheck` | TypeScript 类型检查 | 否 |
| `npm test -- --run` | 执行全部 Vitest 单测 | 否 |
| `npm run test:watch` | 监听模式运行 Vitest | 否 |
| `npm run build` | 类型检查并生成 `dist/` | 否 |
| `npm run preview` | 预览已生成的 `dist/` | 否 |
| `npm run test:e2e` | Playwright 本地 P0 浏览器链路 | 否 |
| `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e` | 真实餐图、运动和 Agent E2E | 是，会消耗配额 |
| `npm run smoke:provider` | provider 文本/JSON/图像/tool 探针 | 是，会消耗配额 |
| `npm run smoke:model` | 简单 Responses 连接探针 | 是，会消耗配额 |
| `npm run lint` | ESLint 检查 | 否 |

## 首次接手的最短验收路径

```powershell
npm ci
npm run typecheck
npm test -- --run
npm run build
npm run smoke:server
npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node
npm run test:e2e
```

之后手工确认：

1. 完成成年画像并进入“今日”。
2. 切换“演示”，确认 14 天合成数据出现。
3. 保存餐食，刷新后记录仍在。
4. 完成或跳过训练，刷新后状态仍在。
5. 导出 JSON，完成一次备份预览。
6. 查看身体指标、ToolTrace 和提案状态。
7. 确认 AI 未同意、超时或不可用时，手工路径仍可用。

真实模型回归只使用去敏输入：

```powershell
$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e
```

该命令会启动本地受控 Function 并消耗 provider 配额，没有必要时不要重复运行。

## 常见接手问题

### 浏览器提示 `Failed to fetch`

通常是本地 Function 没有启动，或者 Vite 仍在使用修改前的环境变量。运行 `npm run dev:function`，确认 8888 监听后重启 `npm run dev`。

### 返回 `MODEL_NOT_CONFIGURED`

检查 `.env` 是否存在 `MODEL_API_KEY` 或 `OPENAI_API_KEY`，并确认本地 Function 已重启。生产环境检查 `/etc/evofit/evofit.env`，不要把 key 写入前端变量。

### 返回 `PROVIDER_NOT_ALLOWED`

`MODEL_BASE_URL` 必须是 HTTPS，并且去掉尾部斜杠后完全匹配 `MODEL_ALLOWED_BASE_URLS`：

```dotenv
MODEL_BASE_URL=https://api.sudocode.chat/v1
MODEL_ALLOWED_BASE_URLS=https://api.sudocode.chat/v1
```

### AI 请求超时

当前浏览器和 Function 默认上游超时为 45 秒。超时不会写入餐食、运动或计划，手工路径仍可使用。

### 页面数据像是丢失

数据按浏览器来源和 `real/demo` mode 隔离。确认当前访问的域名、端口和模式没有变化，不要直接删除 IndexedDB。需要迁移时，在“我的”导出 JSON，再在目标模式预览和确认导入。

### 8888 端口被占用

```powershell
Get-NetTCPConnection -LocalPort 8888 -ErrorAction SilentlyContinue
```

停止占用进程后再运行 `npm run dev:function`。生产服务器不要把 8888 暴露到公网，Nginx 应代理到 `127.0.0.1:8888`。

## 当前校赛完整版本验证结果

| 命令 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm test -- --run` | 68/68 tests 通过 |
| `npm run build` | 通过；仅有单 bundle 超过 500 kB 的警告 |
| `npm run smoke:server` | 生产 Proxy 启动、OPTIONS、403 和 413 通过 |
| `npm run test:e2e` | 6 个完整 P0 场景通过 |
| `$env:EVOFIT_REAL_MODEL_E2E='1'; npm run test:e2e` | 6 个本地场景 + 3 个真实模型场景通过 |
| Netlify Function 独立类型检查 | 通过 |
| `npm run smoke:provider` | Responses 文本、结构化 JSON、图像 capability、tool call 均 HTTP 200 |

桌面 1440×900 和移动浏览器模拟 375×812 均无水平溢出。浏览器模拟不能替代真实手机验收。

## 模型与隐私边界

真实模型请求经过 `netlify/functions/ai-proxy.ts`：

- 生产默认的 Function 模式不把服务器 API key 发到浏览器；设置页仍保留 browser direct 高级覆盖，选择后自定义 key 只保存在当前浏览器。
- 餐图只返回食物名、克重候选和置信说明，不返回营养数值。
- 运动只提取参数，MET 和净消耗由本地确定性代码计算。
- 周报模型只能调用固定的只读工具并生成待审批提案，不能直接应用计划。
- 缺少同意、未配置、超时、429、非法 JSON 或非法结构化结果都会回到手工/本地规则路径。
- Function 限制请求体 6 MB，图片客户端限制 4 MB，上游超时默认 45 秒（可由 `MODEL_UPSTREAM_TIMEOUT_MS` 调整），模型输出最多 800 tokens，并使用 provider allowlist。
- Netlify 受控预览设置 `PREVIEW_ACCESS_TOKEN` 后，Function 要求 Bearer 访问码；阿里云 nip.io 方案按部署文档不设置该变量。
- Function 默认按 Netlify 客户端 IP 限制为每 5 分钟 20 次请求，可通过 `MODEL_RATE_LIMIT_MAX` 和 `MODEL_RATE_LIMIT_WINDOW_MS` 收紧。

复制 `.env.example` 为 `.env` 仅用于本地配置。不要把任何密钥放入 `VITE_*` 变量、仓库、构建产物、日志或文档。

## 环境变量

前端安全变量：

- `VITE_API_BASE_URL`：Function 基础路径，例如 `http://localhost:8888/.netlify/functions`。
- `VITE_APP_MODE`：本地默认模式，通常为 `real`。

仅供服务器 Function 使用的服务器变量：

- `MODEL_API_KEY` 或 `OPENAI_API_KEY`
- `MODEL_BASE_URL` 或 `OPENAI_BASE_URL`
- `MODEL_ALLOWED_BASE_URLS`：逗号分隔的精确 HTTPS provider 地址
- `MODEL_ID` 或 `OPENAI_MODEL`
- `APP_ORIGIN`
- `PREVIEW_ACCESS_TOKEN`
- `MODEL_RATE_LIMIT_MAX`
- `MODEL_RATE_LIMIT_WINDOW_MS`
- `MODEL_UPSTREAM_TIMEOUT_MS`

Netlify 受控预览必须配置 `PREVIEW_ACCESS_TOKEN`，并启用站点访问保护或等效 SSO；阿里云 nip.io 公共方案不使用该变量，依赖 allowlist、限流和 HTTPS。不要把服务器变量改成 `VITE_*` 变量。

## 代码结构

- `src/shared`：类型、Zod schema 和通用工具。
- `src/db`：Dexie 数据库、版本迁移、mode 隔离、演示数据、审批事务、备份恢复。
- `src/domain/calculation.ts`：REE、营养、kJ/kcal、MET 和趋势质量计算。
- `src/api`：模型适配器和本地 Agent 编排。
- `src/pages`：画像、今日、饮食、训练、成长和设置页面。
- `netlify/functions/ai-proxy.ts`：受控模型代理，不读取 IndexedDB。
- `scripts/local-ai-proxy.mjs`：本地 Function harness，仅用于受控真实 E2E。
- `server/ai-proxy.mjs`：阿里云 systemd 使用的生产 HTTP 入口，只监听本机 8888。
- `deploy/`：systemd、Nginx 和服务器环境变量模板，不包含真实密钥。
- `tests/unit`：计算、隔离、审批、备份、模型适配器和 Function 测试。

## Netlify 受控预览

`netlify.toml` 已配置：

- 构建命令：`npm run build`
- 发布目录：`dist`
- Function 目录：`netlify/functions`
- SPA 深链回退：`/* → /index.html`

部署前需要先创建当前工作区的可回滚安全版本快照，再在 Netlify 配置服务器变量和访问保护。部署后必须验证真实域名的 CORS、访问码、限流、账单配额、深链刷新、模型失败降级和真实手机体验。

当前尚无 Netlify 权限、云端账单证据或真实手机验收，因此不能宣称已部署或已完成公网验收。不要自动部署、不要设置公开域名、不要开放无保护模型代理。

故障恢复时回滚站点/Function 版本；本地数据先导出 JSON 备份，不手工删除真实 IndexedDB 数据。

## 阿里云 ECS nip.io 部署

阿里云方案使用同一套前端和 AI Function，但把静态文件交给 Nginx，把 `ai-proxy` 交给本机 systemd Node 服务：

```text
浏览器 HTTPS
  → Nginx :443
    → /srv/evofit/current/dist
    → /.netlify/functions/ai-proxy → 127.0.0.1:8888
      → server/ai-proxy.mjs
        → 当前 API 的 /responses
```

业务数据仍在评委浏览器 IndexedDB 中，服务器没有 PostgreSQL、账号系统或业务数据库。评委首次打开网址后应先切换“演示”模式，演示数据会在浏览器本地初始化。

### 本地改造后的生产文件

- `server/ai-proxy.mjs`：复用 `netlify/functions/ai-proxy.ts`，读取 systemd 环境变量，监听 `127.0.0.1:8888`，限制约 7 MB 请求体并支持优雅退出。
- `deploy/server.env.example`：服务器环境变量模板。
- `deploy/systemd/evofit-ai-proxy.service`：systemd 服务模板。
- `deploy/nginx/evofit.conf`：Nginx 静态站点、SPA 回退和 Function 反向代理模板。

生产默认请求走 `function_proxy`，服务器默认 API 使用当前本地 provider 的配置：

```dotenv
MODEL_BASE_URL=https://api.sudocode.chat/v1
MODEL_ALLOWED_BASE_URLS=https://api.sudocode.chat/v1
MODEL_ID=gpt-6-luna
```

API key 不写入仓库。把本机 `.env` 中的 key 手工复制到服务器 `/etc/evofit/evofit.env` 的 `MODEL_API_KEY`，然后执行：

```bash
sudo chown root:root /etc/evofit/evofit.env
sudo chmod 600 /etc/evofit/evofit.env
```

服务器同时兼容旧变量名 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_MODEL`，但新部署优先使用 `MODEL_*`。`MODEL_BASE_URL` 必须完全出现在 `MODEL_ALLOWED_BASE_URLS` 中，并且只能是 HTTPS 地址。

### ECS 初始化

以下命令在 Ubuntu 24.04 ECS 执行。安全组只开放 TCP 22（仅管理 IP）、80 和 443，不开放 5173、8888 或 5432。

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nginx curl ca-certificates ufw certbot python3-certbot-nginx
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo adduser --system --group --home /srv/evofit evofit
sudo mkdir -p /srv/evofit
sudo chown -R evofit:evofit /srv/evofit
```

公开仓库直接拉取；私有仓库使用 SSH Deploy Key，不要把 Personal Access Token 写进命令或文件：

```bash
sudo -u evofit git clone <你的仓库地址> /srv/evofit/current
cd /srv/evofit/current
sudo -u evofit npm ci
sudo -u evofit npm run typecheck
sudo -u evofit npm test -- --run
sudo -u evofit npm run build
```

创建服务器配置：

```bash
sudo mkdir -p /etc/evofit
sudo cp deploy/server.env.example /etc/evofit/evofit.env
sudo nano /etc/evofit/evofit.env
```

把 `MODEL_API_KEY=replace-with-your-api-key` 替换为真实 key；不要把这个文件复制回仓库。

安装并启动代理：

```bash
sudo cp deploy/systemd/evofit-ai-proxy.service /etc/systemd/system/evofit-ai-proxy.service
sudo systemctl daemon-reload
sudo systemctl enable --now evofit-ai-proxy
sudo systemctl status evofit-ai-proxy --no-pager
sudo ss -lntp | grep 8888
```

8888 必须只显示 `127.0.0.1:8888`。如 `command -v node` 不是 `/usr/bin/node`，修改 systemd 模板的 `ExecStart`。

安装 Nginx 配置并申请 HTTPS：

```bash
sudo cp deploy/nginx/evofit.conf /etc/nginx/sites-available/evofit
sudo ln -s /etc/nginx/sites-available/evofit /etc/nginx/sites-enabled/evofit
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d 47.94.174.218.nip.io
```

模板中的 `server_name`、静态目录和代理路径对应当前方案；`proxy_read_timeout` 为 60 秒，不能改回短于 Function 45 秒上游超时的值。

### 服务器验收

```bash
systemctl is-active evofit-ai-proxy
systemctl is-active nginx
sudo nginx -t
curl -I https://47.94.174.218.nip.io/
curl -I https://47.94.174.218.nip.io/today
curl -I https://47.94.174.218.nip.io/nutrition
curl -I https://47.94.174.218.nip.io/training
curl -I https://47.94.174.218.nip.io/progress
curl -I https://47.94.174.218.nip.io/settings
curl -i -X OPTIONS https://47.94.174.218.nip.io/.netlify/functions/ai-proxy \
  -H 'Origin: https://47.94.174.218.nip.io'
curl -i -X POST https://47.94.174.218.nip.io/.netlify/functions/ai-proxy \
  -H 'Content-Type: application/json' \
  -d '{"purpose":"parse_exercise","input":"跑步30分钟","consentGranted":false}'
```

页面和深链应返回 200，OPTIONS 应返回 204，缺少用户同意应返回 403。真实请求可能返回 200、429、502 或 504；不应出现 404、Node 崩溃或 `MODEL_API_KEY` 未配置。

### 自定义 API 覆盖

设置页仍保留 `Browser direct（自定义覆盖）`。生产新浏览器默认使用服务器 API；只有明确选择 Browser direct 后，当前浏览器才会保存自定义 key 并直接访问自定义 HTTPS provider。该覆盖不经过服务器 allowlist，建议只用于开发者或明确知情的高级场景。切回 `Function proxy（服务器默认）` 后，key 不会发送到服务器 Function。

### 更新和回滚

```bash
cd /srv/evofit/current
sudo -u evofit git pull --ff-only
sudo -u evofit npm ci
sudo -u evofit npm run typecheck
sudo -u evofit npm test -- --run
sudo -u evofit npm run build
sudo systemctl restart evofit-ai-proxy
sudo systemctl reload nginx
```

上线前保留已验证提交号。异常时切回已验证提交并重新构建、重启服务；不要执行 `git reset --hard`，不要删除评委浏览器 IndexedDB。服务器回滚不会恢复服务器上不存在的浏览器业务数据。

## 文档

- [R3 发布准备审计](docs/release-readiness.md)
- [最新交接与开发冻结](HANDOFF-LATEST.MD)
- [部署与回滚](docs/deployment.md)
- [阿里云 nip.io 部署与验收](docs/alicloud-nipio-deployment.md)
- [验收矩阵](docs/acceptance.md)
- [需求追踪](docs/requirements-trace.md)
- [架构说明](docs/architecture.md)
- [AI 评测记录](docs/ai-evaluation.md)
- [校赛完整版本准备报告](docs/school-competition-complete-readiness.md)
- [开发进度](docs/progress.md)

当前 `master` 已按阶段提交本地实现；没有执行 reset、清库或覆盖 `.env`。在外部门禁完成前，不执行公网部署。
