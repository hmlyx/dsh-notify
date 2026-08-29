# dsh-notify — 提醒泡泡（Reminder Bubbles）

输入框右侧的「提醒泡泡」面板：任何插件或 AI 都能推送提醒（文本/链接），
聊天式堆叠（最新在底部）、拖拽调整大小、AI 总结、一键快速重启。

静态 profile 插件（与 beauticode-dsh / dsh-memory 同机制）：**装上即永久生效，重启不消失、无需审批、任何预设/任何会话都可用**。

---

## 📌 给 AI 的使用说明（接入文档）

> 如果你是运行在 DSH 里的 AI（模型），请阅读这一节——它告诉你怎么用本插件向用户推送提醒。

### 推送提醒（最重要）

你有 **3 种方式**向用户的提醒面板推送消息，任选其一：

**方式 1：调用 `notify_push` 工具（推荐，模型直接可调）**

```json
{ "text": "提醒内容", "link": "https://可选链接", "source": "来源名" }
```

- `text`（必填）：提醒内容文本；
- `link`（可选）：可点击的链接 URL；
- `source`（可选）：来源标识，会显示为「来自：xxx」。

**方式 2：调用 HTTP 接口（host 侧插件）**

```
POST /__notify/push
Content-Type: application/json

{ "text": "...", "link": "...", "source": "..." }
```

**方式 3：调用 client 服务（client 侧插件）**

```js
ctx.get('notifyCenter').push({ text: '...', link: '...', source: '...' })
```

### 使用规则（请遵守）

1. **即时性**：需要提醒用户时（任务完成、重要信息、待办、定时提醒），**当场**调用 `notify_push`，不要让用户来问"结果呢"；
2. **AI 总结开关**：若用户在面板开了「AI总结：开」，推送前**先把信息总结成简洁要点**再推，不要推冗长原文；
3. **内容格式**：文本直接写清楚；带链接的提醒用 `link` 字段（用户点击可打开）；
4. **来源**：`source` 填你的名字或系统名（如「纱库」「系统」「GitHub」），方便用户辨识；
5. **频率**：不要连续刷屏，重要提醒一条即可。

### 快速重启

输入框左侧有「🔄 重启」按钮，点击会调用 `/dsh-market/restart` 自动重启 DSH 服务器。
如果你（AI）需要重启服务器（例如让插件改动生效），可以**调用这个接口**：
`POST /dsh-market/restart`（同源即可，会分离 helper 进程自动拉起）。

---

## 👤 给人看的使用说明

### 这是什么

输入框右侧一个常驻的提醒面板（和输入框并排、贴屏幕底部），任何插件或 AI 都能往里推提醒。

### 功能一览

| 功能 | 说明 |
|---|---|
| 🔔 铃铛按钮 | 输入框工具行右侧，带未读数徽标（蓝色） |
| 提醒面板 | 输入框右侧、底对齐、贴屏幕底部；消息**从底部向上堆叠**（聊天式），最新在最下面 |
| 独立泡泡 | 每条提醒独立卡片：白底圆角 + 品牌蓝竖条 + 来源 + 链接 + 复制按钮 |
| 双击泡泡 | 展开/收起面板（扩大到较宽） |
| 拖拽调整大小 | 右下角手柄（自由调宽高）、右上角手柄（向上拉到屏幕顶端） |
| 重置大小 | 宽度恢复右侧自适应、高度延伸到屏幕顶端 |
| 提醒：开/关 | 关闭后暂停接收新提醒 |
| AI总结：开/关 | 开启后 AI 推送前先总结要点 |
| 欢迎泡泡 | 装上插件后第一条消息 |
| 🔄 快速重启 | 输入框左侧按钮，一键重启 DSH 服务器 |

### 安装

1. 把整个仓库目录放进 `~\.dsh\profiles\web\node_modules\dsh-notify\`；
2. 编辑 `~\.dsh\profiles\web\package.json`：
   - `dependencies` 加 `"dsh-notify": "1.0.0"`；
   - `dsh.profile.bundles` 数组加 `"dsh-notify"`；
3. **重启服务器进程**（见下）。

回滚：删掉 package.json 那两处引用即可。

### 重启提示（重要）

`patchReload: live` 只热重载用户补丁层，**新 bundle 必须重启服务器进程**。
重启窗口 ≠ 重启服务器。最快方式：装好后点输入框左侧的「🔄 重启」按钮
（自动调用 `/dsh-market/restart`）；或手动：退出应用 → 杀 3080 的 node → 跑启动脚本。

---

## 结构

| 文件 | 作用 |
|---|---|
| `index.mjs` | Host 半：`/__notify/*` HTTP 接口、`notify_push` 工具、systemPrompt 注入 |
| `client.js` | Client 半：铃铛按钮 + 面板 UI + 重启按钮（手写 `window.__ModuleLoader__.load` bundle） |
| `cordis.patch.yml` | 把 `dsh-notify` 插件行插入 profile 组成 |

## 兼容性

- 需要宿主具备：`webServer`（HTTP 接口）、`tools`、`systemPrompt`、`conversation.input.left/right/overlay` 槽位——标准 dsh web profile 均有；
- host 半服务惰性获取，缺失自动降级；
- 静态 client 注入 CSS 用 `document.createElement('style')`（**不要用动态插件的 `styles`**，会导致启动失败）。

## License

MIT
