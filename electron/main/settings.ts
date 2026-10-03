/**
 * 设置读写。设置存为 userData/settings.json，与 SQLite 分离，便于快速读写且不影响数据库落盘。
 * 任何字段缺失都回退 DEFAULT_SETTINGS，保证升级后旧文件不崩。autoLaunch 改动时同步开机自启。
 *
 * ⚠️ 这里必须做**结构校验**，不能只做浅合并：settings.json 是用户可手改的文本文件，
 * 而 `priceAlerts` 是数组 —— 一旦被写成 `null` 或字符串，下游的 `settings.priceAlerts.length`
 * （notify-plan / diagnostics）会直接抛错，把一次同步甚至启动流程带崩。
 * 渲染层传来的 patch 同样不可全信，`setSettings` 也走同一套归一化。
 */
import fs from 'node:fs'
import { app } from 'electron'
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/steam'
import type { PriceAlert } from '@shared/contract'
import { settingsPath } from './paths'
import { logInfo, logWarn } from './logger'

// ⚠️ 这一块的声明顺序是有讲究的：模块顶层会立刻执行 `let cache = load()`，
// 而 load() 里要用到下面的 secretCodec()。如果把 `let encryptedCodec` 写在文件靠后位置，
// 模块执行到 load() 时它还没初始化（TDZ），会抛
// 「Cannot access 'encryptedCodec' before initialization」——而且它发生在
// `catch { return DEFAULT_SETTINGS }` 里，症状是「Key 读回来是空的」，极难定位。
// 所以凡是被模块顶层代码间接调用的东西，必须声明在它之前。
export interface SecretCodec {
  /** 落盘时把明文转成可存储的串（可能是明文本身） */
  encode: (plain: string) => string
  /** 从落盘串还原明文；失败返回空串 */
  decode: (stored: string) => string
  /** 当前是否真的在加密（界面可以如实告诉用户「未加密」而不是假装安全） */
  encrypted: boolean
}

const SECRET_PREFIX = 'enc:v1:'

/** Electron 不可用时（探针环境 / 单元测试）用的兜底实现：只做标记，不真加密。 */
export function plainCodec(): SecretCodec {
  return { encode: (p) => p, decode: (s) => s, encrypted: false }
}

function makeCodec(): SecretCodec {
  try {
    // 动态 require：settings.ts 会被探针（无 Electron 环境）直接 import
    const { safeStorage, app } = require('electron') as typeof import('electron')
    if (!app.isReady() || !safeStorage.isEncryptionAvailable()) return plainCodec()
    return {
      encode: (plain) => `${SECRET_PREFIX}${safeStorage.encryptString(plain).toString('base64')}`,
      decode: (stored) => {
        if (!stored.startsWith(SECRET_PREFIX)) return stored
        try {
          return safeStorage.decryptString(Buffer.from(stored.slice(SECRET_PREFIX.length), 'base64'))
        } catch {
          // 换了系统账户或机器时 DPAPI 解不开 —— 视为未配置，让用户重新填
          return ''
        }
      },
      encrypted: true
    }
  } catch {
    return plainCodec()
  }
}

let encryptedCodec: SecretCodec | null = null
/**
 * 取编解码器。
 *
 * 早前这里把「探测结果」无条件缓存住，结果踩了个坑：模块加载时就会跑 `load()`，
 * 那时 `app.isReady()` 还是 false → 缓存了**明文模式**，之后再也不会重试，
 * 于是「磁盘明文 → 启动时自动升级成密文」这件事永远不发生，而界面却显示「已加密」。
 *
 * 现在的规则：**只有确认加密可用时才缓存**（那是稳定事实）；
 * 不可用时每次都重新探测（app ready 之后自然就会成功）。
 */
function secretCodec(): SecretCodec {
  if (encryptedCodec) return encryptedCodec
  const c = makeCodec()
  if (c.encrypted) encryptedCodec = c
  return c
}

let cache: AppSettings = load()

/** 单条阈值必须同时满足：appId 为正整数、阈值是非负有限数；脏条目直接丢弃而不是抛错。 */
function sanitizeAlerts(value: unknown): PriceAlert[] {
  if (!Array.isArray(value)) return []
  const out: PriceAlert[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue
    const a = item as Partial<PriceAlert>
    const appId = Number(a.appId)
    const thresholdCents = Number(a.thresholdCents)
    if (!Number.isInteger(appId) || appId <= 0) continue
    if (!Number.isFinite(thresholdCents) || thresholdCents < 0) continue
    const notifiedAt = Number(a.notifiedAt)
    const notifiedPriceCents = Number(a.notifiedPriceCents)
    out.push({
      appId,
      thresholdCents: Math.round(thresholdCents),
      notifiedAt: Number.isFinite(notifiedAt) && notifiedAt > 0 ? Math.round(notifiedAt) : null,
      notifiedPriceCents: Number.isFinite(notifiedPriceCents) && notifiedPriceCents >= 0 ? Math.round(notifiedPriceCents) : null
    })
  }
  return out
}

/** 把任意来源的设置对象归一化成结构可信的 AppSettings。导出是为了能被探针单独验证。 */
export function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(raw ?? {}) }
  merged.priceAlerts = sanitizeAlerts(merged.priceAlerts)
  if (![15, 30, 60].includes(merged.syncIntervalMin)) merged.syncIntervalMin = DEFAULT_SETTINGS.syncIntervalMin
  if (typeof merged.countryCode !== 'string' || !/^[A-Za-z]{2}$/.test(merged.countryCode)) merged.countryCode = DEFAULT_SETTINGS.countryCode
  // 这两个是 v4 新增的可选项：手改过的 settings.json 里可能是任意值（甚至是 null），
  // 不校验就会把 "clear" 以外的东西当成 "keep"，悄悄改变换账号时的清理行为。
  if (merged.accountSwitchPolicy !== 'clear' && merged.accountSwitchPolicy !== 'keep') {
    merged.accountSwitchPolicy = DEFAULT_SETTINGS.accountSwitchPolicy
  }
  if (!Number.isFinite(merged.autoBackupKeep) || merged.autoBackupKeep < 1) merged.autoBackupKeep = DEFAULT_SETTINGS.autoBackupKeep
  merged.autoBackupKeep = Math.min(30, Math.max(1, Math.round(merged.autoBackupKeep)))
  merged.autoBackup = Boolean(merged.autoBackup)
  // 自定义代理同样要归一化：只接受 host:port 或 http://host:port，其余一律当「未设置」。
  // 脏值如果原样透传，setProxy 会静默失败，用户看到的只是「填了也没用」。
  merged.customProxy = normalizeProxyText(merged.customProxy)
  return merged
}

/**
 * 把用户填的代理地址归一化成 `host:port`（去掉 http:// 前缀与路径、去掉末尾斜杠）。
 * 非法输入返回空字符串 —— 空 = 跟随系统代理，这是最安全的回退。
 */
export function normalizeProxyText(input: unknown): string {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim()
  if (!trimmed) return ''
  const stripped = trimmed.replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '').trim()
  // SOCKS5 也允许（Chromium 支持 socks5://），这里只做形状校验，不做协议白名单
  const m = /^(\[[^\]]+\]|[^:]+):(\d{1,5})$/.exec(stripped)
  if (!m) return ''
  const port = Number(m[2])
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return ''
  return stripped
}

function load(): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AppSettings> & { steamApiKey?: unknown }
    // 旧文件里是明文，新文件是密文 —— 两种都要能读（decode 内部按前缀判断）
    const decoded = { ...parsed, steamApiKey: secretCodec().decode(String(parsed.steamApiKey ?? '')) }
    // 合并默认值，避免新增字段在旧文件里缺失；再统一做结构校验
    return normalizeSettings(decoded as Partial<AppSettings>)
  } catch (e) {
    // 静默兜底会**藏起真正的故障**：曾经这里吞掉过一次加载异常，表现为
    // 「Key 读回来是空的 / 设置被重置」，排查时完全看不到线索。
    // 加载失败必须留痕（但不外传内容）。
    logWarn('settings', '设置文件加载失败，已回退到默认值', {
      path: settingsPath, error: e instanceof Error ? e.message : String(e)
    })
    return { ...DEFAULT_SETTINGS }
  }
}

/** 返回设置的浅拷贝，防止外部直接改内部缓存。 */
export function getSettings(): AppSettings {
  return { ...cache }
}

/** 局部更新并持久化。返回最新设置副本。渲染层传来的 patch 不可全信，同样走归一化。 */
/**
 * 落盘形态与内存形态分离：**内存里是明文 Key，落盘时加密**。
 *
 * 这样做的三个理由：
 *  1. `settings.json` 是纯文本，备份、同步盘、截图、误发都会把 Key 带出去；
 *  2. Key 泄漏的代价不小 —— 它是账号级的，能读游戏库/成就/好友动态；
 *  3. 成本极低：Electron 内置 `safeStorage`（Windows 上走 DPAPI，由系统账户密钥加密，
 *     别的用户/别的机器解不开）。
 *
 * 边界处理：
 *  - safeStorage 不可用（部分精简版 Windows / 某些组策略）→ **原样明文写入**，绝不能因此丢 Key；
 *  - 读到旧格式（明文）→ 内存用明文，写回时自动升级为密文，用户无感迁移；
 *  - 解密失败（换了系统账户 / 换了机器）→ 视为空 Key，并提示重新填写，不抛错。
 */
/** 写盘对象：Key 换成密文（其余字段原样）。 */
function toStored(s: AppSettings): Record<string, unknown> {
  const plain = { ...s }
  const stored: Record<string, unknown> = { ...plain, steamApiKey: secretCodec().encode(plain.steamApiKey) }
  return stored
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  cache = normalizeSettings({ ...cache, ...patch })
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(toStored(cache), null, 2), 'utf8')
  } catch {
    // 写入失败不致命，内存缓存仍有效
  }
  applyLoginItem()
  return { ...cache }
}

/** 当前 Key 是否以密文落盘（设置页可以据此显示真实的安全状态）。 */
export function isApiKeyEncrypted(): boolean { return secretCodec().encrypted }

/**
 * 启动时的格式迁移：把**旧文件里的明文 Key 升级成密文**。
 *
 * 为什么必须单独做：加密只发生在 `setSettings()` 落盘那一刻，而用户升级新版之后
 * 完全可以好几个月都不去设置页改任何东西 —— 那磁盘上就一直躺着明文 Key，
 * 而界面（如果只看 `isApiKeyEncrypted()`）还会显示「已加密」，变成**谎报**。
 * 这个函数让「升级即加密」成立，不依赖用户下一次操作。
 *
 * 只在「内存有 Key + 磁盘不是密文」时才写盘，无变化则完全不动文件。
 */
export function migratePlainSecret(): { migrated: boolean; encrypted: boolean } {
  const encrypted = secretCodec().encrypted
  if (!encrypted) return { migrated: false, encrypted }
  if (!cache.steamApiKey) return { migrated: false, encrypted: true }
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8')
    const stored = JSON.parse(raw) as { steamApiKey?: unknown }
    if (typeof stored.steamApiKey === 'string' && stored.steamApiKey.startsWith(SECRET_PREFIX)) {
      return { migrated: false, encrypted: true }
    }
    fs.writeFileSync(settingsPath, JSON.stringify(toStored(cache), null, 2), 'utf8')
    logInfo('settings', '已将明文 API Key 升级为密文', { bytes: raw.length })
    return { migrated: true, encrypted: true }
  } catch (e) {
    logWarn('settings', 'Key 加密迁移失败（不影响使用）', { error: e instanceof Error ? e.message : String(e) })
    return { migrated: false, encrypted }
  }
}

/** 跟随 autoLaunch 设置开机自启。 */
function applyLoginItem(): void {
  try {
    app.setLoginItemSettings({ openAtLogin: cache.autoLaunch })
  } catch {
    // 某些平台/权限下会失败，忽略
  }
}

/** 启动时把已存设置应用到登录项（避免重启后丢失自启状态）。 */
export function applySettingsOnReady(): void {
  applyLoginItem()
}
