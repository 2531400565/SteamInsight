/**
 * 仓库层：SQL 执行、upsert、命名查询与快照装配。所有 SQL 常量在 @/database/queries，
 * 行 ↔ 领域对象映射在 ./mappers（拆出去是为了守住单文件 300 行）。
 */
import type { SqlValue } from 'sql.js'
import { all, get, run, transaction, type Row } from './database'
import { aggregateDefaults, QUERY_MAP } from '@/database/queries'
import type { AccountSwitchInfo, DbQueryName, GameNote, HuntPick } from '@shared/contract'
import type {
  Achievement, DiscountItem, OwnedGame, PlaySession, PricePoint,
  SnapshotAchievement, SteamUser, WishlistItem
} from '@/types/steam'
import { toSnapshotAchievement } from '@/types/steam'
import { detectAccountSwitch, listNotes, listPicks } from './user-data'
import {
  num, str, optNum,
  rowToUser, rowToGame, rowToSession, rowToAchievement, rowToWishlist, rowToDiscount, rowToPricePoint,
  rowToGameNote, rowToHuntPick,
  gameToRow, achievementToRow, wishlistToRow, discountToRow, priceToRow, sessionToRow, userToRow
} from './mappers'

// ---------- 通用 upsert（按主键幂等写入）----------
/**
 * 通用 upsert（按主键幂等写入），更新时带「空值保护」。
 *
 * 为什么需要保护：某次同步拿不到某字段时（API 抖动、取键失败、隐私设置变更），
 * 无条件覆盖会把上一次的好数据洗成空值，而数据只劣化不自愈。
 * 规则：空字符串 / 空数组 / null 不覆盖已有值；负数（-1 = 未定价哨兵）不覆盖非负值。
 */
function upsert(table: string, pk: string[], values: Record<string, SqlValue>): void {
  const cols = Object.keys(values)
  const nonPk = cols.filter((c) => !pk.includes(c))
  const colList = cols.join(', ')
  const placeholders = cols.map((c) => `$${c}`).join(', ')
  const guard = (c: string): string => {
    const v = values[c]
    if (v === null) return `${c}=COALESCE($${c}, ${c})`
    if (typeof v === 'string') {
      if (v === '') return `${c}=CASE WHEN $${c} <> '' THEN $${c} ELSE ${c} END`
      if (v === '[]' || v === '{}') return `${c}=CASE WHEN $${c} NOT IN ('', '[]', '{}') THEN $${c} ELSE ${c} END`
      return `${c}=$${c}`
    }
    if (typeof v === 'number' && v < 0) return `${c}=CASE WHEN $${c} >= 0 THEN $${c} ELSE ${c} END`
    return `${c}=$${c}`
  }
  const updates = nonPk.map(guard).join(', ')
  run(`INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT(${pk.join(',')}) DO UPDATE SET ${updates}`, values)
}

/** 批量写入一组领域对象，整体包一个事务。 */
export function saveGames(games: OwnedGame[]): void {
  transaction(() => games.forEach((g) => upsert('games', ['app_id'], gameToRow(g))))
}
export function saveAchievements(list: Achievement[]): void {
  transaction(() => list.forEach((a) => upsert('achievements', ['app_id', 'api_name'], achievementToRow(a))))
}
export function saveWishlist(list: WishlistItem[]): void {
  transaction(() => list.forEach((w) => upsert('wishlist', ['app_id', 'steam_id'], wishlistToRow(w))))
}
export function saveDiscounts(list: DiscountItem[]): void {
  transaction(() => list.forEach((d) => upsert('discounts', ['app_id', 'category'], discountToRow(d))))
}
export function savePriceHistory(list: PricePoint[]): void {
  transaction(() => list.forEach((p) => upsert('price_history', ['app_id', 'captured_at'], priceToRow(p))))
}
/** play_sessions 自增主键，直接插入（快照差分天然不冲突）。 */
export function saveSessions(list: PlaySession[]): void {
  transaction(() => list.forEach((s) => run(
    `INSERT INTO play_sessions (steam_id, app_id, play_date, minutes, started_at, ended_at, source) VALUES ($steam_id,$app_id,$play_date,$minutes,$started_at,$ended_at,$source)`,
    sessionToRow(s))))
}
export function saveUser(u: SteamUser): void {
  upsert('users', ['steam_id'], userToRow(u))
}
/**
 * 写入一次快照采样（用于差分计算每日时长）。
 * steamId（V5 优化 1）：快照打上账号标记，换账号清理才能从「整表 DELETE」变成按账号精确删。
 * 演示模式不写 snapshots，所以这里不给默认值 —— 调用方（sync）必须显式传。
 */
export function saveSnapshot(appId: number, capturedAt: number, playtime: number, steamId: string): void {
  upsert('snapshots', ['app_id', 'captured_at'], { app_id: appId, captured_at: capturedAt, playtime_minutes: playtime, steam_id: steamId })
}

// ---------- 查询辅助 ----------
/**
 * 取某游戏上一次快照的 playtime（用于差分）。
 *
 * ⚠️ 修 bug：这里原来把参数写成 `{ app_id: appId }`，而 SQL 占位符是 `$appId`。
 * `normalizeParams()` 会把 `app_id` 规范成 `$app_id`，与 `$appId` 对不上 → 绑定值恒为 NULL
 * → `WHERE app_id = NULL` 永远匹配不到行 → 本函数**恒定返回 null**。
 *
 * 后果（实测）：差分算法拿不到上一次快照，就永远算不出「今天玩了多久」，
 * `play_sessions` 表**一行都不会产生**（真库实测 0 行），游戏分析页的四张图因此永远是空的。
 * 这不是"数据还没积累够"，是一个让功能彻底失效的参数名笔误。
 *
 * steamId（V5 优化 1）：差分基准只读**当前账号**的行。`steam_id = ''` 是 v7 之前
 * 写入的历史行，属于升级前的账号 —— 升级后第一次同步没有带账号的新行时，
 * 用它们兜底，避免白白丢一轮差分（与 loadSnapshot 读 play_sessions 的兼容口径一致）；
 * 其它账号的行（换账号且策略为 keep 时残留）绝不读，否则就是幽灵会话的老 bug。
 */
export function lastSnapshot(appId: number, steamId: string): number | null {
  const row = get(
    `SELECT playtime_minutes FROM snapshots WHERE app_id = $appId AND (steam_id = $steamId OR steam_id = '') ORDER BY captured_at DESC LIMIT 1`,
    { appId, steamId }
  )
  return row ? num(row.playtime_minutes) : null
}
/**
 * 某游戏历史最低采样价（price_history 表 MIN(price_cents)）。
 *
 * ⚠️ 同一个参数名笔误（见 lastSnapshot 的说明）：原来恒返回 null，
 * 导致「是否史低」的判定拿不到历史基线，`is_historical_low` 永远写不进去，
 * 史低提醒与「史低」角标因此都不会出现。
 */
export function priceLowest(appId: number): number | null {
  const row = get(`SELECT MIN(price_cents) AS m FROM price_history WHERE app_id = $appId AND price_cents >= 0`, { appId })
  return row ? optNum(row.m) : null
}
/** 各游戏已有的成就统计（app_id → [总数, **已解锁**数, **已解锁的**稀有数]）；增量同步据此判断是否要拉取，并保留未刷新游戏的旧值。 */
export const achievementCounts = (): Map<number, number[]> =>
  new Map(all('SELECT app_id, COUNT(*) AS t, SUM(unlocked) AS u, SUM(is_rare * unlocked) AS r FROM achievements GROUP BY app_id').map((x) => [num(x.app_id), [num(x.t), num(x.u), num(x.r)]]))

/** 库里已存在的游戏（按 app_id）。商店详情的 TTL 判断靠它：读上次 price_checked_at，并原样复用旧字段。 */
export function existingGames(): Map<number, OwnedGame> {
  const map = new Map<number, OwnedGame>()
  for (const row of all('SELECT * FROM games')) {
    const g = rowToGame(row)
    map.set(g.appId, g)
  }
  return map
}

// ---------- meta：主进程自己的小状态 ----------
/** 读一个 meta 值（不存在返回 null）。 */
export function getMeta(key: string): string | null {
  const row = get('SELECT value FROM meta WHERE key = $key', { key })
  return row ? str(row.value) : null
}

/** 写一个 meta 值（upsert）。 */
export function setMeta(key: string, value: string): void {
  run('INSERT INTO meta (key, value) VALUES ($key, $value) ON CONFLICT(key) DO UPDATE SET value = $value', { key, value })
}
// ---------- 同步后清理（删除本次结果里已不存在的行）----------
/**
 * 删除「本次同步结果里已经没有」的行。
 *
 * 不清理会怎样：换账号、游戏出库、移出愿望单、促销结束之后，这些旧行会永远留在库里，
 * 而 `loadSnapshot()` 是整表返回 —— 界面会一直显示早就不属于这个账号（或早已结束）的条目。
 *
 * 传空数组时直接返回 0：API 异常时返回空列表是常见故障，那**绝不能**被当成「什么都不要了」，
 * 否则一次网络抖动就会把用户的库清空。
 */
function purgeStale(table: string, keepIds: number[]): number {
  const ids = keepIds.filter((v) => Number.isInteger(v))
  if (!ids.length) return 0
  const before = num(get(`SELECT COUNT(*) AS c FROM ${table}`)?.c)
  run(`DELETE FROM ${table} WHERE app_id NOT IN (${ids.join(',')})`)
  return before - num(get(`SELECT COUNT(*) AS c FROM ${table}`)?.c)
}

/** 清理已出库 / 不属于当前账号的游戏。 */
export const purgeGames = (keep: number[]): number => purgeStale('games', keep)
/** 清理不再属于自己的成就记录。keep 传本次 owned 的 app_id —— 被增量跳过的游戏其成就依然有效。 */
export const purgeAchievements = (keep: number[]): number => purgeStale('achievements', keep)
/** 清理已移出愿望单的条目。 */
export const purgeWishlist = (keep: number[]): number => purgeStale('wishlist', keep)
/** 清理已结束的促销条目。price_history / snapshots 不按促销清理：它们是与促销周期无关的长期采样，
 *  由 `user-data.pruneSamples()` 按时间降采样。 */
export const purgeDiscounts = (keep: number[]): number => purgeStale('discounts', keep)

// ---------- 命名查询（11 个）----------
function mapRows(name: DbQueryName, rows: Row[]): unknown[] {
  switch (name) {
    case 'user': return rows.length ? [rowToUser(rows[0])] : []
    case 'games': case 'game': return rows.map(rowToGame)
    case 'sessions': return rows.map(rowToSession)
    case 'achievements': return rows.map(rowToAchievement)
    case 'wishlist': return rows.map(rowToWishlist)
    case 'discounts': return rows.map(rowToDiscount)
    case 'priceHistory': return rows.map(rowToPricePoint)
    case 'dayStats': return rows.map((r) => ({ date: str(r.date), minutes: num(r.minutes), sessionCount: num(r.session_count) }))
    case 'gameNotes': return rows.map(rowToGameNote)
    case 'huntPicks': return rows.map(rowToHuntPick)
    case 'overview': return rows // 已是聚合后的 camelCase 列
    default: return rows
  }
}

/** 执行一个命名查询，返回领域对象（或聚合对象）数组。 */
export function query(name: DbQueryName, params?: Record<string, unknown>): unknown[] {
  const sql = QUERY_MAP[name]
  const merged = { ...aggregateDefaults(), ...(params ?? {}) }
  return mapRows(name, all(sql, merged))
}

/** 一次性读出全部表，拼成渲染层要的 Snapshot。 */
export function loadSnapshot(currentSteamId = ''): {
  user: SteamUser | null; games: OwnedGame[]; sessions: PlaySession[]; achievements: SnapshotAchievement[]
  wishlist: WishlistItem[]; discounts: DiscountItem[]; priceHistory: PricePoint[]
  notes: GameNote[]; picks: HuntPick[]; accountSwitch: AccountSwitchInfo | null
  counts: Record<string, number>; loadedAt: number
} {
  const u = get('SELECT * FROM users LIMIT 1')
  const count = (t: string): number => num(get(`SELECT COUNT(*) AS c FROM ${t}`)?.c)
  const users = u ? [rowToUser(u)] : []
  // BUG-3 的后半：会话必须按账号读取。play_sessions 一直有 steam_id 列，
  // 但这条主查询是全表 SELECT —— 换账号（且策略选了'keep'）后，旧账号的会话会混进分析页。
  //
  // `steam_id = ''` 是加列之前的历史行，无从判定归属，purgePreviousAccount 也刻意不删它们，
  // 所以这里同样把它们算进来 —— 否则库里会躺着一批「存在但永远不显示」的行，
  // 而设置页的 counts 用的是物理行数，两边就对不上了。
  // 表里没有 users 行时（全新库）也确实没有会话可读，走全表分支不会出错。
  const ownerSteamId = users[0]?.steamId ?? null
  return {
    user: users[0] ?? null,
    games: all('SELECT * FROM games ORDER BY playtime_forever_min DESC').map(rowToGame),
    sessions: (
      ownerSteamId
        ? all(
            `SELECT * FROM play_sessions WHERE steam_id = $steam_id OR steam_id = '' ORDER BY play_date DESC`,
            { steam_id: ownerSteamId }
          )
        : all('SELECT * FROM play_sessions ORDER BY play_date DESC')
    ).map(rowToSession),
    // 成就：走更紧凑的传输形态（图标只带文件名），4536 条约省 0.8 MB IPC 负载。
    // 渲染层用 expandAchievement() 拼回完整 URL，界面代码不用改。
    achievements: all('SELECT * FROM achievements').map(rowToAchievement).map(toSnapshotAchievement),
    wishlist: all('SELECT * FROM wishlist').map(rowToWishlist),
    discounts: all('SELECT * FROM discounts').map(rowToDiscount),
    priceHistory: all('SELECT * FROM price_history ORDER BY captured_at').map(rowToPricePoint),
    notes: listNotes(),
    picks: listPicks(),
    accountSwitch: currentSteamId ? detectAccountSwitch(currentSteamId) : null,
    counts: {
      users: count('users'), games: count('games'), sessions: count('play_sessions'), achievements: count('achievements'),
      wishlist: count('wishlist'), discounts: count('discounts'), priceHistory: count('price_history'),
      snapshots: count('snapshots'),
      gameNotes: count('game_notes'), huntPicks: count('hunt_picks')
    },
    loadedAt: Date.now()
  }
}
