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
  return merged
}

function load(): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8')
    // 合并默认值，避免新增字段在旧文件里缺失；再统一做结构校验
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** 返回设置的浅拷贝，防止外部直接改内部缓存。 */
export function getSettings(): AppSettings {
  return { ...cache }
}

/** 局部更新并持久化。返回最新设置副本。渲染层传来的 patch 不可全信，同样走归一化。 */
export function setSettings(patch: Partial<AppSettings>): AppSettings {
  cache = normalizeSettings({ ...cache, ...patch })
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(cache, null, 2), 'utf8')
  } catch {
    // 写入失败不致命，内存缓存仍有效
  }
  applyLoginItem()
  return { ...cache }
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
