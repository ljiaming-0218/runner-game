# 赤岚 · 夜奔屋脊

浏览器无尽跑酷游戏：跳跃、滑行、连击与本机最高分。无需账号、数据库或模型 API。

## 在 Render 部署

[一键部署](https://render.com/deploy?repo=https://github.com/ljiaming-0218/runner-game)

使用仓库根目录的 `render.yaml` 创建免费 Node Web Service。

手动创建 Web Service 时填写：

- Build Command：`npm ci --include=dev && npm run build`
- Start Command：`npm start`
- Node：`22.21.0`
- 环境变量：`NODE_ENV=production`、`VITE_AUTH_ENABLED=false`
- Health Check Path：`/`

服务监听 `0.0.0.0`，使用 Render 注入的 `PORT`。发布后打开控制台给出的 onrender.com 地址。

## 本地开发（PowerShell）

```powershell
npm ci
npm run dev
```

## 生产验证（PowerShell）

```powershell
npm run typecheck
npm run build
$env:PORT = "8080"
npm start
```

## 操作

点击开始按钮进入游戏，键盘或屏幕按钮跳跃、滑行。最高分保存在当前浏览器。
