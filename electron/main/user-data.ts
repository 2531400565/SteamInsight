/**
 * 「用户自己产生的内容」与「采样表保留策略」。
 *
 * 从 repository.ts 拆出来，两个理由：
 *  1) 守住单文件 ≤ 300 行的约定（repository 已经顶到上限）；
 *  2) 这一组逻辑与「Steam 同步下来的数据」是**不同的生命周期**：
 *     游戏出库 / 换账号 / 清缓存重新同步都会删改 games、achievements，
 *     但用户写下的评分与笔记不会由任何接口重建，两者不该混在一个模块里改。
 *
 * 依赖方向：本模块只依赖 database（SQL 原语）与 mappers（行映射），
 * 不依赖 repository —— 避免和 repository 形成循环引用。
 */
import type { AccountSwitchInfo, GameNote, HuntPick } from '@shared/contract'
import { all, get, run, transaction } from './database'
import { num, str, parseArr, rowToGameNote, rowToHuntPick } from './mappers'
import { PRUNE_SQL } from '@/database/queries'

/* ------------------------- 采样表保留策略（N0-1） ------------------------- */

/** 采样保留天数：这段时间内一行不删，`isHistoricalLow` 的判定因此始终精确。 */
export const SAMPLE_KEEP_DAYS = 90

/**
 * snapshots 每款游戏保留的最近条数。
 *
 * 原来是 2，理由是「它只被 lastSnapshot() 用来做一次差分」—— 但这等于**主动扔掉了自己的历史**：
 * 实测 69 款游戏只有 138 行快照（正好 2 行/款），于是 play_sessions 只有 15 段，
 * 「累计时长曲线 / 连续游玩天数 / 年度对比」这类分析没有数据基础。
 * 而这恰恰是本软件唯一没法被手机端替代的地方（需要长期本地累积）。
 *
 * 30 条的代价：69 款 × 30 = 2070 行，SQLite 里几乎不占空间（比一条成就小得多）。
 * 2 条只能回答「现在玩了多久」，30 条能回答「这一年在玩什么」。
 */
export const SNAPSHOT_KEEP_ROWS = 30

/**
 * 给两张采样表瘦身。**降采样，不是简单删除**。
 *
 * 背景（实测）：默认 30 分钟同步一次，`price_history` 每次 +75 行、`snapshots` 每次 +69 行
 * → 各自约 **131 万 / 121 万行每年**。而 `loadSnapshot()` 会把 `price_history` 整表走 IPC。
 *
 * 规则：
 *  - `price_history`：90 天内全留；更早的每天只留最后一笔（收盘价）+ **该游戏历史最低那一笔**
 *    （保证 `priceLowest()` 返回的仍然是真值，史低判定不会因为清理而失真）；
 *  - `snapshots`：每款游戏保留最近 30 条（见 SNAPSHOT_KEEP_ROWS 的注释：差分 + 趋势都要用）。
 *
 * 幂等，可以在每次同步收尾调用；也用于给老库做一次性瘦身。
 */
export function pruneSamples(nowSec = Math.floor(Date.now() / 1000)): { priceHistory: number; snapshots: number } {
  const cutoff = nowSec - SAMPLE_KEEP_DAYS * 86400
  const count = (t: string): number => num(get(`SELECT COUNT(*) AS c FROM ${t}`)?.c)
  const beforeP = count('price_history')
  const beforeS = count('snapshots')
  transaction(() => {
    run(PRUNE_SQL.priceHistory, { cutoff })
    run(PRUNE_SQL.snapshots)
  })
  return { priceHistory: beforeP - count('price_history'), snapshots: beforeS - count('snapshots') }
}

/* --------------------- 用户自己的内容：评分 / 笔记 / 追猎清单 --------------------- */

/** 笔记长度上限（字符）。够写一段心得，又不会让快照膨胀。 */
export const NOTE_MAX_LEN = 2000

const clampRating = (v: number): number => (!Number.isFinite(v) ? 0 : Math.max(0, Math.min(5, Math.round(v))))

/** 读全部笔记（按更新时间倒序）。 */
export const listNotes = (): GameNote[] => all('SELECT * FROM game_notes ORDER BY updated_at DESC').map(rowToGameNote)
/** 读全部手动追猎条目。 */
export const listPicks = (): HuntPick[] => all('SELECT * FROM hunt_picks ORDER BY added_at DESC').map(rowToHuntPick)

/**
 * 写一条评分 / 笔记（部分更新：只传要改的字段）。
 * 四个字段都清空（rating=0 且 note='' 且 status='' 且 tags 为空）时直接删行，避免留下一堆空记录 ——
 * 否则「清空笔记」会留下一行空数据，快照里多一个永远为空的条目。
 */
export function saveNote(appId: number, patch: { rating?: number; note?: string; status?: string; tags?: string[] }): GameNote | null {
  if (!Number.isInteger(appId) || appId <= 0) return null
  // ⚠️ 绑定键必须与 SQL 占位符同名：`normalizeParams()` 只会给键补 `$` 前缀，
  // 传 `{ app_id }` 而 SQL 写 `$appId` 会绑成 NULL，读不到已有行 ——
  // 那样「只改备注」会把已有的评分悄悄清零，用户看不出发生了什么。
  const prev = get('SELECT * FROM game_notes WHERE app_id = $appId', { appId })
  const rating = clampRating(patch.rating ?? (prev ? num(prev.rating) : 0))
  const note = (patch.note ?? (prev ? str(prev.note) : '')).slice(0, NOTE_MAX_LEN)
  const status = (patch.status ?? (prev ? str(prev.status) : '')).slice(0, 16)
  const prevTags = prev ? parseArr(prev.tags) : []
  const tags = patch.tags ?? prevTags
  if (rating === 0 && note === '' && status === '' && tags.length === 0) {
    run('DELETE FROM game_notes WHERE app_id = $appId', { appId })
    return null
  }
  const updatedAt = Math.floor(Date.now() / 1000)
  run(
    `INSERT INTO game_notes (app_id, rating, note, status, tags, updated_at) VALUES ($appId, $rating, $note, $status, $tags, $updatedAt)
     ON CONFLICT(app_id) DO UPDATE SET rating = $rating, note = $note, status = $status, tags = $tags, updated_at = $updatedAt`,
    { appId, rating, note, status, tags: JSON.stringify(tags), updatedAt }
  )
  return { appId, rating, note, status, tags, updatedAt }
}

/** 清空某游戏的评分与笔记。 */
export function clearNote(appId: number): boolean {
  run('DELETE FROM game_notes WHERE app_id = $appId', { appId })
  return true
}

/** 加入 / 移出手动追猎清单。返回操作后的选中状态。 */
export function togglePick(appId: number, apiName: string, picked: boolean): boolean {
  if (!Number.isInteger(appId) || appId <= 0 || !apiName) return false
  if (picked) {
    run(
      `INSERT INTO hunt_picks (app_id, api_name, added_at) VALUES ($appId, $apiName, $addedAt)
       ON CONFLICT(app_id, api_name) DO NOTHING`,
      { appId, apiName, addedAt: Math.floor(Date.now() / 1000) }
    )
  } else {
    run('DELETE FROM hunt_picks WHERE app_id = $appId AND api_name = $apiName', { appId, apiName })
  }
  return picked
}

/**
 * 清掉「已经解锁了」的追猎条目。
 *
 * 为什么必须清：追猎页的入选条件是「稀有且未解锁」。用户给一个未解锁的稀有成就打了星，
 * 之后把它打出来了 —— 它已经不满足入选条件，会自动从列表消失；
 * 但 hunt_picks 里的那行还在，于是「我的追猎清单」的计数会悄悄高于实际显示条数，
 * 而且这个数字用户无法解释（点进去也找不到那条）。每次同步收尾清一次最省事。
 *
 * 只在 achievements 表有该记录且确实已解锁时才删，避免误删「尚未同步到成就数据」的条目。
 */
export function prunePickedUnlocked(): number {
  const before = num(get('SELECT COUNT(*) AS c FROM hunt_picks')?.c)
  run(
    `DELETE FROM hunt_picks WHERE EXISTS (
       SELECT 1 FROM achievements a
       WHERE a.app_id = hunt_picks.app_id
         AND a.api_name = hunt_picks.api_name
         AND a.unlocked = 1
     )`
  )
  return before - num(get('SELECT COUNT(*) AS c FROM hunt_picks')?.c)
}

/* ------------------------------ 换账号检测 ------------------------------ */

/**
 * 库里现有数据是否属于另一个账号。
 *
 * `games.steam_id` 是 v3 加的列（**不参与主键**）。这里只做**检测与告知**：
 * 本程序是单人单账号模型，换账号会用新账号的库整体替换旧的 —— 这本身是对的
 * （否则界面混着两个账号的游戏），但要明确告诉用户，
 * 而不是让他第二天发现 69 款游戏无声消失却不知道发生了什么。
 */
export function detectAccountSwitch(currentSteamId: string): AccountSwitchInfo | null {
  const row = get(`SELECT steam_id, COUNT(*) AS c FROM games WHERE steam_id <> '' GROUP BY steam_id ORDER BY c DESC LIMIT 1`)
  if (!row) return null
  const previousSteamId = str(row.steam_id)
  if (!previousSteamId || previousSteamId === currentSteamId) return null
  return { previousSteamId, previousGames: num(row.c), currentSteamId }
}

/** 把当前同步下来的游戏标记为属于某账号（只补历史空行，不动已标记的其它账号行）。 */
export function stampGameOwners(steamId: string): number {
  if (!steamId) return 0
  const before = num(get(`SELECT COUNT(*) AS c FROM games WHERE steam_id <> $sid`, { sid: steamId })?.c)
  run(`UPDATE games SET steam_id = $sid WHERE steam_id = ''`, { sid: steamId })
  return before
}

/**
 * 换账号后清理「上一个账号」的采样与会话数据。
 *
 * 为什么必须有这一步（之前完全没有，是个真 bug）：`purgeStale()` 只按 `app_id` 清
 * games / achievements / wishlist / discounts，**没有任何一行代码删过 play_sessions**。
 * 于是换账号之后会有两个后果：
 *
 *  1. 旧账号的会话被原样返回给渲染层（`loadSnapshot` 不看 steam_id）
 *     → 趋势图、日历热力图、「常玩时段」显示的是两个人的混合数据。
 *
 *  2. 更隐蔽也更严重：`snapshots` 里留着**旧账号**的 playtime_forever 当差分基准。
 *     新账号第一次同步时 `minutes = 新账号总时长 − 旧账号总时长`，
 *     可以直接凭空生成「今天玩了 300 小时」这种会话。
 *     （v7 之前 `snapshots` 没有 steam_id 列，无法按账号筛，只能整表清 ——
 *      它唯一的用途是给 `lastSnapshot()` 做差分，清掉只是下一次采样没有基准，
 *      代价远小于生成幽灵会话。V5 优化 1 加了 steam_id 列后改为按账号精确删，
 *      但**空串行仍一律删掉**：它们是 v7 之前写入的，必然属于「换出去的那个账号」，
 *      留着同样可能给新账号当差分基准。）
 */
export function purgePreviousAccount(keepSteamId: string): { sessions: number; snapshots: number } {
  const countSessions = (): number => num(get('SELECT COUNT(*) AS c FROM play_sessions')?.c)
  const countSnapshots = (): number => num(get(`SELECT COUNT(*) AS c FROM snapshots WHERE steam_id <> $sid`, { sid: keepSteamId })?.c)
  const beforeSessions = countSessions()
  const beforeSnapshots = countSnapshots()
  transaction(() => {
    // steam_id = '' 是 v3 之前的历史行（列还没加出来时的遗留），无从判断归属，保守保留
    run(`DELETE FROM play_sessions WHERE steam_id <> '' AND steam_id <> $sid`, { sid: keepSteamId })
    run(`DELETE FROM snapshots WHERE steam_id <> $sid`, { sid: keepSteamId })
  })
  return { sessions: beforeSessions - countSessions(), snapshots: beforeSnapshots - countSnapshots() }
}
