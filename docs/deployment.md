# Netlify 部署与回滚

## 本地

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

## Netlify

`netlify.toml` 已配置 `dist`、`netlify/functions` 和 SPA fallback。只在 Netlify 控制台配置 `MODEL_API_KEY`、`MODEL_BASE_URL`、`MODEL_ID` 等服务器变量；不要配置 `VITE_*` 密钥。Function 只允许白名单模型地址和固定 purpose。

当前没有 Netlify 访问授权，因此未执行公网部署；发布前需验证深链刷新、Function 限流、模型错误降级和密钥扫描。

## 回滚

保留上一份可复现构建和 demo dataset version；线上异常先回滚站点/Function 版本，不手工删除 IndexedDB 数据。涉及 schema 不可逆变更时先导出备份。
