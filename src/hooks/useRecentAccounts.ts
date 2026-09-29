import { useCallback, useState } from 'react'

/** 最近账号条目（V4/F2 轻量版：只记 id + 昵称，不改造 users 表）。 */
export interface RecentAccount {
  steamId: string
  personaName: string
  savedAt: number
}

const KEY = 'si:recent-accounts'
/** 最多记 5 个，超出自动淘汰最旧的 —— 「轻量版」不提供手动管理。 */
const LIMIT = 5

/** SteamID64 固定 17 位数字。演示模式下 settings.steamId 为空，天然不会进来。 */
const STEAMID64_RE = /^\d{17}$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/** 从 localStorage 读列表；结构损坏（旧版本 / 手改过）就重置为空，绝不抛错。 */
function load(): RecentAccount[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(isRecord)
      .map((r) => ({
        steamId: typeof r.steamId === 'string' ? r.steamId : '',
        personaName: typeof r.personaName === 'string' ? r.personaName : '',
        savedAt: typeof r.savedAt === 'number' ? r.savedAt : 0
      }))
      .filter((r) => STEAMID64_RE.test(r.steamId))
  } catch {
    return []
  }
}

function save(list: RecentAccount[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // 隐私模式 / 配额满：最近账号是纯便利功能，写失败可以忽略
  }
}

/**
 * 最近使用过的 Steam 账号（V4/F2）。
 *
 * 设计取舍（对应 ROADMAP-V4 F2 的「建议先做轻量版」）：
 * - 只在 localStorage 记最近 5 个 steam_id + 昵称，**不建新表、不动 users 的 LIMIT 1 单行模型**；
 * - 真正的切换 = `patchSettings({ steamId })` + 重新同步，数据面的换账号策略
 *   （F-4 的 `detectAccountSwitch` / `purgePreviousAccount`）由 sync 全权处理，这里不碰库；
 * - `remember()` 对「同账号重复调用」幂等（内容没变返回原数组），
 *   因此可以安全地放进依赖 settings.steamId 的 useEffect 里。
 */
export function useRecentAccounts(): {
  recent: RecentAccount[]
  remember: (steamId: string, personaName?: string) => void
} {
  const [recent, setRecent] = useState<RecentAccount[]>(load)

  const remember = useCallback((steamId: string, personaName = '') => {
    if (!STEAMID64_RE.test(steamId)) return
    setRecent((prev) => {
      const existing = prev.find((r) => r.steamId === steamId)
      const entry: RecentAccount = {
        steamId,
        personaName: personaName || existing?.personaName || '',
        savedAt: Date.now()
      }
      const next = [entry, ...prev.filter((r) => r.steamId !== steamId)].slice(0, LIMIT)
      // 逐项比较内容（不含 savedAt）：没变就不写回，避免「effect 依赖 recent」的场景死循环
      const unchanged =
        prev.length === next.length &&
        prev.every((r, i) => r.steamId === next[i].steamId && r.personaName === next[i].personaName)
      if (!unchanged) save(next)
      return unchanged ? prev : next
    })
  }, [])

  return { recent, remember }
}
