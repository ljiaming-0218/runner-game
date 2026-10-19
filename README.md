# 赤岚 · 夜奔屋脊

浏览器关卡跑酷游戏：选择行程与角色，跳跃、滑行、拾取道具，在本机排行中留下纪录。无需账号、数据库或模型 API。

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

## 关卡与角色

- 灯市初夜：200 米，入门节奏。
- 雨巷疾行：350 米，雨幕与更快的起始速度。
- 云海破晓：500 米，云海日出与高难度障碍组合。
- 赤岚：连击保持 3.5 秒。青羽：起跳高度提升约 20%。金墨：开局自带一次护盾。

护盾可抵挡一次碰撞或坠落；磁吸在 8 秒内吸引附近铜钱；双倍使 8 秒内的局内得分翻倍。重复拾取计时道具会刷新持续时间。通关另获 `500 + 关卡米数 × 2` 分，不受双倍加成。

## 操作

点击「出发」开始。空格 / ↑ / W 跳跃，↓ / S 滑行，Esc 暂停，M 切换声音。手机可使用屏幕大按键，或轻点 / 上滑跳跃、下滑滑行；长按跳得更高。切换标签页或失去焦点会自动暂停。

「排行」按关卡显示最高的 5 条成绩，可设置上榜名号。每关保留最高的 30 条纪录，记录角色、距离、连击和通关状态。成绩与选择保存在当前浏览器的 localStorage，支持旧版最高分迁移；不与其他设备或玩家同步。

## 游戏规则测试

```sh
npm run test:game
npm run typecheck
npm run build
```

`test:game` 验证通关、角色能力、碰撞与护盾、道具及存档排行榜；仓库原有的 `npm test` 还包含模板基础设施测试。
