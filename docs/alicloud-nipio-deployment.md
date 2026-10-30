# EvoFit 阿里云部署方案（nip.io 网址版）

本文是当前项目部署到阿里云北京 ECS 的最终操作手册。

目标服务器：

- 公网 IP：`47.94.174.218`
- 操作系统：Ubuntu 24.04
- 配置：2 核 CPU、4 GB 内存、50 GB 系统盘
- 提交网址：`https://47.94.174.218.nip.io`

本方案不设置 `PREVIEW_ACCESS_TOKEN`。评委打开网址后，浏览器直接访问服务器上的 AI Proxy；模型 Base URL、模型名称和 API Key 只配置在服务器环境文件中。

## 1. 先理解当前项目

当前项目不是传统的“前端 + 后端数据库”结构，而是：

```text
React/Vite 前端
  ├── 浏览器 IndexedDB（Dexie）：画像、餐食、训练、计划、聊天和备份
  └── /.netlify/functions/ai-proxy
          └── 服务器端 Node HTTP 包装器
                  └── 模型供应商 Responses API
```

关键事实：

1. `src/` 是 React + Vite + TypeScript 前端。
2. `src/db/database.ts` 使用 Dexie/IndexedDB，数据默认留在评委自己的浏览器中。
3. `netlify/functions/ai-proxy.ts` 是 AI 代理，不读取 IndexedDB，也不保存业务数据。
4. 项目没有 `backend/`、FastAPI、Express、Prisma、PostgreSQL 或 MySQL。
5. 当前不部署服务器数据库。若以后需要多用户、登录和跨设备同步，必须另做后端 API 和 PostgreSQL 改造。

因此，评委使用时应先切换到“演示”模式。演示数据由浏览器本地自动生成，不需要服务器预置数据库。

## 2. 最终线上结构

```text
评委浏览器
    │ HTTPS
    ▼
Nginx :443
    ├── /                         → /srv/evofit/current/dist
    └── /.netlify/functions/...  → 127.0.0.1:8888
                                      │
                                      ▼
                              Node.js 22 AI Proxy
                                      │
                                      ▼
                              MODEL_BASE_URL/responses
```

公网只开放 `80` 和 `443`。Node 服务只监听 `127.0.0.1:8888`，不直接暴露公网。

## 3. 部署前必须完成的本地改造

### 3.1 增加生产 HTTP 入口

新增文件：

```text
server/ai-proxy.mjs
```

它可以复用 `netlify/functions/ai-proxy.ts` 的 `handler`，但不能直接复制 `scripts/local-ai-proxy.mjs`。生产入口需要：

- 从 systemd 环境变量读取配置，不读取项目根目录 `.env`。
- 监听 `127.0.0.1:8888`。
- 将 Node 的请求头转换为普通字符串，传给 Function。
- 请求体超过约 7 MB 时提前拒绝。
- 支持 `SIGTERM` 优雅退出。
- 不记录 API Key、请求正文和健康数据。

### 3.2 让 Base URL 可以由服务器环境文件配置

当前 `netlify/functions/ai-proxy.ts` 使用服务器环境中的精确 allowlist 限制 provider 地址。服务器环境中填写的 Base URL 必须同时出现在 `MODEL_ALLOWED_BASE_URLS`，否则返回 `PROVIDER_NOT_ALLOWED`。

部署前应将这段校验改为：

1. 从 `MODEL_BASE_URL` 读取实际地址。
2. 从 `MODEL_ALLOWED_BASE_URLS` 读取允许的精确地址列表。
3. 只有 `MODEL_BASE_URL` 完全匹配允许列表，并且使用 HTTPS 时才继续请求。开发环境没有设置 allowlist 时，代码会把当前解析出的 base URL 作为唯一允许值，以兼容现有 `OPENAI_*` 本地变量；服务器模板必须显式填写 allowlist。

服务器环境文件示例：

```dotenv
MODEL_BASE_URL=https://api.sudocode.chat/v1
MODEL_ALLOWED_BASE_URLS=https://api.sudocode.chat/v1
```

多个地址用英文逗号分隔：

```dotenv
MODEL_ALLOWED_BASE_URLS=https://api.openai.com/v1,https://你的供应商.example/v1
```

这样你以后只需要修改服务器环境文件，不需要把 API Key 或 Base URL 写进前端，也不需要每次改源码。不要为了省事把校验改成允许任意 HTTP 地址。

### 3.3 生产默认使用 `function_proxy`，保留高级直连覆盖

生产新浏览器默认使用服务器环境文件中的 API，不需要评委输入模型 API Key。现有 `browser_direct` 仍保留为自定义 API 高级覆盖，选择后 key 会保存在当前浏览器并直接发送到自定义 HTTPS provider。

建议调整：

- `src/shared/providerConfig.ts`：生产默认传输方式为 `function_proxy`，默认路径为 `/.netlify/functions`。
- `src/pages/Settings.tsx`：保留 `browser_direct`，标记为自定义 API 高级覆盖，并显示浏览器保存 key 的风险提示。
- 只有明确选择高级覆盖时才会绕过服务器默认 API；切回 Function proxy 后继续使用服务器配置。

### 3.4 增加部署模板

建议新增：

```text
deploy/nginx/evofit.conf
deploy/systemd/evofit-ai-proxy.service
deploy/server.env.example
```

模板中只能放变量名和示例值，不能放真实密钥。

### 3.5 处理当前未提交改动

当前工作区存在未提交的 `src/app/App.tsx` 修改。部署前必须：

1. 查看这份修改是否是预期的移动端导航改动。
2. 本地完成类型检查、单元测试和构建。
3. 将它和本次部署改造一起提交到 Git。
4. 不执行 `git reset`，不覆盖 `.env`，不删除 IndexedDB 数据。

## 4. Windows 本地开发指南

以下命令在项目目录 `E:\Vibe-coding\evofit` 执行。

### 4.1 检查分支和改动

```powershell
cd E:\Vibe-coding\evofit
git status --short --branch
git remote -v
```

确认当前分支、远程地址和未提交改动都符合预期。

### 4.2 安装依赖并执行本地门槛

```powershell
npm ci
npm run typecheck
npm test -- --run
npm run build
```

Function 单独类型检查：

```powershell
npx tsc --noEmit --ignoreConfig netlify/functions/ai-proxy.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --types node
```

### 4.3 启动本地 AI Proxy

开发人员自己的模型变量放在项目根目录 `.env`，该文件已经被 `.gitignore` 忽略，绝不能提交。生产入口 `server/ai-proxy.mjs` 不读取该文件，只读取 systemd 的 `EnvironmentFile`。

终端一：

```powershell
cd E:\Vibe-coding\evofit
npm run dev:function
```

终端二：

```powershell
cd E:\Vibe-coding\evofit
$env:VITE_API_BASE_URL='http://127.0.0.1:8888/.netlify/functions'
npm run dev
```

浏览器访问：

```text
http://localhost:5173
```

### 4.4 本地功能验收

至少完成：

1. 完成画像并进入今日页。
2. 切换“演示”模式，确认演示数据出现。
3. 记录一餐，刷新页面后记录仍在。
4. 完成或跳过训练，刷新后状态仍在。
5. 打开设置页导出 JSON 备份。
6. 测试 AI 同意流程。
7. 测试模型异常时是否回到手工路径。
8. 确认浏览器构建产物中没有 API Key。

本地 Function 的基本检查：

```powershell
Invoke-WebRequest `
  -Method Options `
  -Uri 'http://127.0.0.1:8888/.netlify/functions/ai-proxy' `
  -Headers @{ Origin = 'http://localhost:5173' }
```

缺少用户同意时应返回 `403`：

```powershell
Invoke-WebRequest `
  -Method Post `
  -Uri 'http://127.0.0.1:8888/.netlify/functions/ai-proxy' `
  -ContentType 'application/json' `
  -Body '{"purpose":"parse_exercise","input":"跑步30分钟","consentGranted":false}'
```

### 4.5 提交到 Git

确认测试通过后：

```powershell
git status --short
git add server deploy src README.md docs
git commit -m "prepare Alibaba Cloud nip.io deployment"
git push origin <当前分支名>
```

如果当前远程分支不是 `master`，将 `<当前分支名>` 替换为实际分支名。服务器只通过 Git 拉取代码，不使用压缩包上传。

## 5. 阿里云服务器保姆级操作指南

以下命令在 Ubuntu 24.04 服务器执行。首次登录使用阿里云控制台提供的 SSH 方式。

### 5.1 安全组设置

在阿里云 ECS 控制台的安全组入方向添加：

```text
TCP 22   仅允许你的管理 IP
TCP 80   0.0.0.0/0
TCP 443  0.0.0.0/0
```

不要开放 `5173`、`8888` 或 `5432`。

### 5.2 更新系统并安装基础工具

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nginx curl ca-certificates ufw certbot python3-certbot-nginx
```

配置防火墙：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

### 5.3 安装 Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

Node 路径检查：

```bash
command -v node
```

后续 systemd 的 `ExecStart` 必须使用这个实际路径。

### 5.4 创建运行用户和目录

```bash
sudo adduser --system --group --home /srv/evofit evofit
sudo mkdir -p /srv/evofit
sudo chown -R evofit:evofit /srv/evofit
```

### 5.5 通过 Git 拉取代码

如果仓库是公开仓库：

```bash
sudo -u evofit git clone <你的仓库地址> /srv/evofit/current
```

如果仓库是私有仓库，推荐使用 SSH Deploy Key：

```bash
sudo -u evofit mkdir -p /home/evofit/.ssh
sudo -u evofit ssh-keygen -t ed25519 -C "evofit-server" -f /home/evofit/.ssh/id_ed25519
sudo -u evofit cat /home/evofit/.ssh/id_ed25519.pub
```

把显示出来的公钥添加到 GitHub/GitLab 仓库的 Deploy Keys，然后测试：

```bash
sudo -u evofit ssh -T git@github.com
sudo -u evofit git clone git@github.com:<组织或用户名>/<仓库名>.git /srv/evofit/current
```

不要把 Personal Access Token 直接写入命令或提交到代码库。

### 5.6 安装依赖并构建

```bash
cd /srv/evofit/current
sudo -u evofit npm ci
sudo -u evofit npm run typecheck
sudo -u evofit npm test -- --run
sudo -u evofit npm run build
```

### 5.7 创建服务器环境文件

```bash
sudo mkdir -p /etc/evofit
sudo nano /etc/evofit/evofit.env
```

填入以下内容，并替换模型信息：

```dotenv
MODEL_API_KEY=在这里填写模型APIKey
MODEL_BASE_URL=https://api.sudocode.chat/v1
MODEL_ALLOWED_BASE_URLS=https://api.sudocode.chat/v1
MODEL_ID=gpt-6-luna
APP_ORIGIN=https://47.94.174.218.nip.io
MODEL_RATE_LIMIT_MAX=5
MODEL_RATE_LIMIT_WINDOW_MS=300000
MODEL_UPSTREAM_TIMEOUT_MS=45000
```

按 `Ctrl+O` 保存，按回车确认，再按 `Ctrl+X` 退出。

本方案不填写：

```dotenv
PREVIEW_ACCESS_TOKEN
```

设置权限：

```bash
sudo chown root:root /etc/evofit/evofit.env
sudo chmod 600 /etc/evofit/evofit.env
```

### 5.8 创建 systemd 服务

```bash
sudo nano /etc/systemd/system/evofit-ai-proxy.service
```

填入：

```ini
[Unit]
Description=EvoFit AI Proxy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=evofit
Group=evofit
WorkingDirectory=/srv/evofit/current
EnvironmentFile=/etc/evofit/evofit.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node --experimental-strip-types /srv/evofit/current/server/ai-proxy.mjs
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

如果 `command -v node` 返回的路径不是 `/usr/bin/node`，修改 `ExecStart`。

启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now evofit-ai-proxy
sudo systemctl status evofit-ai-proxy --no-pager
```

本机检查后端是否监听：

```bash
sudo ss -lntp | grep 8888
```

应该只看到 `127.0.0.1:8888`，不能看到 `0.0.0.0:8888`。

### 5.9 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/evofit
```

填入：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 47.94.174.218.nip.io;

    root /srv/evofit/current/dist;
    index index.html;

    location /.netlify/functions/ai-proxy {
        proxy_pass http://127.0.0.1:8888/.netlify/functions/ai-proxy;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header x-nf-client-connection-ip $remote_addr;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        client_max_body_size 7m;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用配置并检查：

```bash
sudo ln -s /etc/nginx/sites-available/evofit /etc/nginx/sites-enabled/evofit
sudo nginx -t
sudo systemctl reload nginx
```

### 5.10 配置 HTTPS

```bash
sudo certbot --nginx -d 47.94.174.218.nip.io
```

按提示选择将 HTTP 自动跳转到 HTTPS。

如果证书申请失败，先检查：

```bash
getent hosts 47.94.174.218.nip.io
curl -I http://47.94.174.218.nip.io
```

### 5.11 发布新版本

以后每次本地完成 Git push 后，服务器执行：

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

## 6. 服务器验收门槛

以下项目全部通过后，才把网址交给评委。

### 6.1 进程和网络

```bash
systemctl is-active evofit-ai-proxy
systemctl is-active nginx
sudo ss -lntp | grep 8888
sudo nginx -t
```

要求：

- 两个服务都是 `active`。
- 8888 只监听 `127.0.0.1`。
- Nginx 配置检查通过。

### 6.2 页面和深链

```bash
curl -I https://47.94.174.218.nip.io/
curl -I https://47.94.174.218.nip.io/today
curl -I https://47.94.174.218.nip.io/nutrition
curl -I https://47.94.174.218.nip.io/training
curl -I https://47.94.174.218.nip.io/progress
curl -I https://47.94.174.218.nip.io/settings
```

要求：所有页面返回 `200`，刷新不能出现 Nginx `404`。

### 6.3 Function 接口

OPTIONS：

```bash
curl -i -X OPTIONS \
  https://47.94.174.218.nip.io/.netlify/functions/ai-proxy \
  -H 'Origin: https://47.94.174.218.nip.io'
```

应返回 `204`。

缺少用户同意：

```bash
curl -i -X POST \
  https://47.94.174.218.nip.io/.netlify/functions/ai-proxy \
  -H 'Content-Type: application/json' \
  -d '{"purpose":"parse_exercise","input":"跑步30分钟","consentGranted":false}'
```

应返回 `403`，并且日志中不能出现 API Key。

有用户同意的真实请求应返回以下之一：

- `200`：模型正常返回。
- `429`：限流。
- `502`：上游模型错误。
- `504`：上游超时。

不能出现 Nginx `404`、Node 崩溃或 `MODEL_API_KEY` 未配置错误。

### 6.4 浏览器验收

使用 Chrome 无痕窗口访问：

```text
https://47.94.174.218.nip.io
```

完成：

1. 进入“演示”模式。
2. 查看今日、饮食、训练、成长和设置页面。
3. 完成一次餐食记录。
4. 完成一次训练状态更新。
5. 刷新页面，确认记录仍然存在。
6. 测试 AI 教练的同意提示。
7. 测试模型失败时的本地降级。
8. 测试浏览器返回、深链刷新和移动宽度页面。

## 7. 本地验收门槛

本地代码进入 Git 前必须满足：

```text
npm run typecheck       通过
npm test -- --run       全部通过
npm run build           通过
Function 类型检查       通过
本地 E2E                通过
生产入口 smoke          通过（npm run smoke:server）
生产入口可启动          通过
源码和 dist 无 API Key   通过（扫描排除 .env）
```

任何一个门槛失败，都不要推送服务器。

## 8. 数据和回滚说明

当前业务数据在评委浏览器 IndexedDB 中，不在服务器数据库中。服务器回滚不会恢复或删除评委浏览器数据。

回滚代码时使用 Git：

```bash
cd /srv/evofit/current
sudo -u evofit git log --oneline -5
sudo -u evofit git checkout <已验证的提交号> -- .
sudo -u evofit npm ci
sudo -u evofit npm run build
sudo systemctl restart evofit-ai-proxy
```

回滚前先确认提交号，不执行 `git reset --hard`，不删除用户浏览器数据。

## 9. 评委使用说明

提交网址：

```text
https://47.94.174.218.nip.io
```

建议评委进入页面后点击左侧“演示”，查看预置的 14 天演示数据。真实模式是当前浏览器的空白本地空间，适合现场创建自己的画像和记录。

本版本不提供账号系统、不提供跨设备同步，也不提供服务器数据库。它适合校赛演示和受控评审；如果以后要面向真实用户，需要增加登录、后端业务 API、PostgreSQL、备份和权限体系。
