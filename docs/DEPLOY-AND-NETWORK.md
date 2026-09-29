# Steam Insight 网络依赖与分享部署指南

> 归档日期：2026-09-26
> 回答两个问题：**（1）启动本应用需不需要先开加速器 / VPN？（2）发给别人用，对方要配什么？**
>
> 全部结论都有实测证据，证据来源与跑法见文末。**没有实测支撑的推测不会写进这里。**

---

## 一、应用到底要连哪些域名

`grep` 全项目，只有这 5 个（`electron/main/` 与 `src/` 内）：

| 域名 | 用途 | 出现在 |
| --- | --- | --- |
| `api.steampowered.com` | Web API：账号资料、拥有游戏、成就、愿望单 | `steam-api.ts` |
| `store.steampowered.com` | 商店公开接口：appdetails、featuredcategories | `steam-store.ts` |
| `steamcommunity.com` | OpenID 登录 + `check_authentication` 回验 | `steam-openid.ts` |
| `avatars.steamstatic.com` | 玩家头像（Steam API 返回的 URL） | 数据层 |
| `cdn.cloudflare.steamstatic.com` | 游戏封面 / 头图 | `sync.ts` 拼接 |

**没有**任何自建后端、没有埋点、没有第三方统计。除了这 5 个域名，应用不向外发任何请求。

---

## 二、Q1：启动前需要开加速器 / VPN 吗？

### 结论

**应用本身不需要加速器** —— 它没有绑定任何加速工具，也不读写 hosts。
但它**必须能访问上面 5 个域名**。而在一台装了 Steam++ / Watt Toolkit 的机器上，
"能不能访问" 这件事**完全由加速器是否在运行决定**：

> ⚠️ **has 了劫持就必须让加速器活着。** Steam++ 会往 `hosts` 写入 Steam 域名 → `127.0.0.1` 的条目，
> 自己监听 `0.0.0.0:80` 和 `0.0.0.0:443` 做本地反代。**只要这些条目还在 hosts 里，
> 而加速器没在跑，应用的所有请求都会打到一台没人应答的 127.0.0.1。**

### 实测：本机 hosts 当前状态（2026-09-26 19:2x）

`C:\Windows\System32\drivers\etc\hosts` 被 Steam++ 写入 **51 条**非注释记录，其中 Steam 相关 **15 条**：

```
# Steam++ Start
127.0.0.1 steamcdn-a.akamaihd.net
127.0.0.1 steamuserimages-a.akamaihd.net
127.0.0.1 cdn.akamai.steamstatic.com
127.0.0.1 community.akamai.steamstatic.com
127.0.0.1 avatars.akamai.steamstatic.com
127.0.0.1 store.akamai.steamstatic.com
127.0.0.1 community.steamstatic.com
127.0.0.1 media.steampowered.com
127.0.0.1 steamcommunity.com
127.0.0.1 www.steamcommunity.com
127.0.0.1 store.steampowered.com
127.0.0.1 api.steampowered.com
127.0.0.1 help.steampowered.com
127.0.0.1 login.steampowered.com
127.0.0.1 checkout.steampowered.com
```

注意两点：

1. **应用用到的 `api.steampowered.com`、`store.steampowered.com`、`steamcommunity.com` 三个全在劫持名单里。**
2. `avatars.steamstatic.com` 和 `cdn.cloudflare.steamstatic.com` **不在**名单里
   （名单里是 `*.akamai.steamstatic.com` 系列，域名不同）→ 这两个走真实 DNS，不受加速器影响。

现场进程与监听：`Steam++.exe`、`Steam++.Accelerator.exe` 在跑；`0.0.0.0:80` 与 `0.0.0.0:443`
由 PID 42224（`Steam++.Accelerator.exe`）监听。
系统代理：`ProxyEnable = 0`（**关**），`ProxyServer = 127.0.0.1:7897`（残留值）→ 当前**走直连**。

### 实测 A/B：同一个传输层，只有"加速器在不在"这一个变量

用应用**真实的传输层**（`electron/main/http.ts`，net 优先 / node 回退）跑 5 个域名。
跑法是 esbuild 打包 `http.ts` → 在真实 Electron 里执行（`tools/probe-net/`）。
两组都带独立的空 `--user-data-dir`，避免 Chromium HTTP 缓存污染（否则会出现 2ms 的假 PASS）。

**A 组 —— 现状（Steam++ 在跑，劫持生效）**

| 域名 | 结果 | 通道 | 耗时 |
| --- | --- | --- | --- |
| `api.steampowered.com` | ✅ 200 | net | 365 ms |
| `store.steampowered.com` | ✅ 200 | net | 281 ms |
| `steamcommunity.com` | ✅ 200 | net | 478 ms |
| `avatars.steamstatic.com` | ✅ 404（链路通） | net | 713 ms |
| `cdn.cloudflare.steamstatic.com` | ✅ 200 | net | 1376 ms |

**结果 5 PASS / 0 FAIL**，`resolveProxy` = 直连。

**B 组 —— 模拟「hosts 仍劫持 + 加速器已退出」**

用 Chromium 的 `--host-resolver-rules` 把 5 个域名指到一个没人应答的端口。
**这一步不修改你的系统 hosts**，只是在该进程内模拟解析结果。

| 域名 | 结果 | 失败原因 |
| --- | --- | --- |
| `api.steampowered.com` | ❌ FAIL | net: `ERR_CONNECTION_REFUSED` → node: `UNABLE_TO_VERIFY_LEAF_SIGNATURE` |
| `store.steampowered.com` | ❌ FAIL | 同上 |
| `steamcommunity.com` | ❌ FAIL | 同上 |
| `avatars.steamstatic.com` | ✅ 404 | 不在劫持名单，走真实 DNS |
| `cdn.cloudflare.steamstatic.com` | ✅ 200 | 同上 |

**结果 2 PASS / 3 FAIL** —— 被劫持的三个域名**全部失效**。

两个关键副产物结论：

- **回退通道救不回来。** `node:https` 不认 Chromium 的解析规则，会走真实 hosts → `127.0.0.1:443` →
  加速器的自签证书 → Node 内置根证书链不认 → `UNABLE_TO_VERIFY_LEAF_SIGNATURE`。
  这正是 `http.ts` 把 `net`（Chromium 栈，读系统代理 + 用系统证书链）放在第一优先级的**原因**，
  不是随手写的兜底。
- **CDN 域名始终可用。** 所以加速器挂掉时，用户看到的现象是
  "**封面能显示、但数据同步失败**" —— 这个组合很有辨识度，别误判成接口坏了。

### 三种可用组合（择一）

| # | 组合 | 状态 | 说明 |
| --- | --- | --- | --- |
| 1 | **加速器在跑**（Steam++ / Watt Toolkit） | ✅ 当前状态 | 最简单。代价：它必须常驻，异常退出就断（见下） |
| 2 | **加速器关掉 + 它已还原 hosts + 开 VPN** | ✅ | Electron `net` 会读系统代理。要求：**代理端口必须活着** |
| 3 | **都不开，裸连能到 Steam** | ✅ | 取决于运营商 / 地区 |

### ⚠️ 两种必须避免的"半吊子"状态

这两种都不是应用的 bug，但都会让应用报"网络不可达"，而且**排查时极易误判**：

1. **加速器退出了，但 hosts 劫持残留。**
   → 就是上面 B 组的场景。多见于加速器**异常退出 / 被杀进程**（正常退出会自动还原 hosts）。
   **识别方法**：能看见游戏封面，但一同步就失败。
   **处理**：重新打开加速器，或在加速器里点一次"还原 hosts"。

2. **代理客户端退出了，系统代理端口却还被配置着。**
   → 请求被送到一个没人监听的端口。
   **识别方法**：`netstat -ano | findstr LISTENING | findstr 7897` 无输出。
   **处理**：重开代理客户端，或「设置 → 网络和 Internet → 代理」关掉手动代理。

   > 2026-09-26 排查 Steam 客户端掉线时，第 2 种就是现场：
   > Steam 的 `connection_log.txt` 里全部掉线都在 `127.0.0.1:7897` 这条路径上。

---

## 三、Q2：发给朋友用，对方本地要配什么？

### 不需要（打包里已经带齐）

| 项 | 说明 |
| --- | --- |
| Node.js / npm | ❌ 不需要。Electron 44 运行时已随包分发 |
| Visual Studio / 编译工具链 | ❌ 不需要 |
| 任何 Python / .NET 运行时 | ❌ 不需要 |
| **管理员权限** | ❌ 不需要。`perMachine: false`，装到 `%LOCALAPPDATA%\Programs`，走用户级安装 |
| 本应用的数据库 / 后端服务 | ❌ 不需要。数据在本地 SQLite（`%APPDATA%\steam-insight\steam-insight.db`） |

### 需要（4 条，缺了就只能看演示数据）

| # | 项 | 怎么弄 | 缺了会怎样 |
| --- | --- | --- | --- |
| 1 | **Windows 10 / 11，64 位** | 打包只出了 `x64` 目标 | ARM 机器未测；32 位 Windows 装不上 |
| 2 | **自己的 Steam Web API Key** | 登录后打开 `steamcommunity.com/dev/apikey`，域名随便填，拿到 32 位十六进制串 | **只能看内置演示数据**，同步拉不到任何真实游戏 |
| 3 | **Steam 隐私「游戏详情」设为公开** | Steam → 个人资料 → 隐私设置 → 游戏详情 = 公开 | `GetOwnedGames` 返回空 → 游戏库空白（愿望单还要求 `GetWishlist` 可见） |
| 4 | **网络能访问 Steam 域名** | 与第一节同一套逻辑 | 同步失败。**若他装了加速器，运行本应用前必须确认加速器在跑** |

Steam **客户端**不算必需 —— 检测不到会优雅降级为「未安装」，用 OpenID + API Key 照样能跑；
但装了体验更好（能自动读出本机登录账号、一键填入、能显示本机安装状态）。

### ⚠️ 分享前最该知道的一条：安装包没有代码签名

**实测证据**（读 PE 可选头的证书表目录项，索引 4）：

| 文件 | PE 魔数 | 证书表大小 | 签名 |
| --- | --- | --- | --- |
| `dist/win-unpacked/Steam Insight.exe` | `0x20b`（PE32+） | **0** | ❌ 未签名 |
| `dist/Steam Insight-1.0.0-setup.exe` | `0x10b`（PE32） | **0** | ❌ 未签名 |

`electron-builder.yml` 里没有任何 `certificateFile` / `certificateSubjectName` 配置，
构建日志里的 `signing with signtool.exe` 只完成了改图标 / 版本信息，**没有产生签名**。

后果：他双击安装包会撞 **Windows SmartScreen「Windows 已保护你的电脑」** 蓝色提示框，
必须点「更多信息 → 仍要运行」。通过微信 / QQ 传输的 exe 更容易被拦。
**这不是缺陷，是"没买证书"的必然结果**，但要提前跟他说一句，否则他会以为包坏了。

### 其他注意事项

| 项 | 说明 |
| --- | --- |
| 安装包体积 | **123,210,698 字节（约 117.5 MB）**。微信 / QQ 直传可能受限，建议网盘 |
| 数据是否互通 | **不互通，各存各的**。数据落在各自的 `%APPDATA%\steam-insight\`，卸载时也保留（`deleteAppDataOnUninstall: false`） |
| 首次启动会看到演示数据 | `DEFAULT_SETTINGS.enableDemoData = true`。填 Key 并同步真实数据后才会被覆盖。**提前说明，否则他会以为那是自己的数据** |
| API Key 是明文 | 存在 `%APPDATA%\steam-insight\settings.json`，未加密。**别让他把这个文件发给你** |
| 装完托盘图标要手动放出来 | Win11 默认把新图标收进「隐藏的图标」溢出面板。点 `^` 拖到任务栏，或「设置 → 个性化 → 任务栏 → 其他系统托盘图标」打开。一次性设置 |
| 端口占用 | OpenID 登录会在 `127.0.0.1` 上从 **42510** 起找空闲端口，占用时自动往后找（最多 40 个）。不冲突大概率无感 |

### 给朋友的一段话（可直接复制）

```
这是一个 Steam 游戏数据分析工具，免安装依赖，双击安装即可。

装上后第一次打开会看到一套"演示数据"，那是我内置的示例，不是你的数据。
要看自己的数据，做两步：

1. 打开 https://steamcommunity.com/dev/apikey ，登录你的 Steam 账号，
   域名随便填（比如 abc.com），生成一串 32 位的 Key，复制粘贴到软件里。
2. Steam → 个人资料 → 隐私设置 → 把「游戏详情」改成「公开」。

如果你装了 Steam++ / Watt Toolkit 这类加速器，运行这个软件之前
确认加速器是开着的，否则同步会失败。

另外：安装时 Windows 可能弹一个蓝色的"已保护你的电脑"提示，
那是因为我没买代码签名证书，点「更多信息」→「仍要运行」就行。
```

---

## 四、证据怎么复现

```bash
cd steam-insight

# 1) 打包传输层（http.ts）成 cjs
node node_modules/esbuild/bin/esbuild tools/probe-net/net-entry.ts \
  --bundle --platform=node --format=cjs --external:electron \
  --tsconfig=tsconfig.node.json --outfile=tools/probe-net/net-bundle.cjs

# 2) A 组：现状（用独立 user-data-dir 避开 HTTP 缓存）
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
  tools/probe-net/net-probe.cjs --no-sandbox \
  --user-data-dir="C:/Users/<你>/AppData/Local/Temp/netprobe-a"

# 3) B 组：模拟「劫持仍在、加速器已退出」（不改系统 hosts）
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
  tools/probe-net/net-probe.cjs --no-sandbox \
  --user-data-dir="C:/Users/<你>/AppData/Local/Temp/netprobe-b" \
  "--host-resolver-rules=MAP api.steampowered.com 127.0.0.1:9,\
MAP store.steampowered.com 127.0.0.1:9,\
MAP steamcommunity.com 127.0.0.1:9,\
MAP avatars.steamstatic.com 127.0.0.1:9,\
MAP cdn.cloudflare.steamstatic.com 127.0.0.1:9"
```

> **必须给 A / B 各自一个干净的 `--user-data-dir`。**
> Chromium 的 HTTP 缓存会让第二轮请求出现 2 ms 的"假 PASS"，
> 我第一遍就踩了这个坑（`store` 与 `cdn` 在 B 组里假通过），差点得出「失效域名更少」的错误结论。

未签名产物的判定（纯 Python，不依赖 `signtool`）：

```python
import struct
def pe_signed(path):
    d = open(path, 'rb').read()
    lf = struct.unpack_from('<I', d, 0x3c)[0]
    magic = struct.unpack_from('<H', d, lf + 24)[0]
    ddir = lf + 24 + (112 if magic == 0x20b else 96)   # PE32+ / PE32 的数据目录偏移不同
    _, size = struct.unpack_from('<II', d, ddir + 4 * 8)  # 索引 4 = 证书表
    return size > 0
```
