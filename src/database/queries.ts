/**
 * SQL 查询常量 + DbQueryName → SQL 映射。命名参数用 $ 前缀（sql.js 绑定要求）。
 * dayStats / overview 必须是真 SQL 聚合（GROUP BY / SUM / 子查询），不许用 JS 伪装。
 */
import type { DbQueryName } from '@shared/contract'

export const SQL = {
  // ---- 基础读写 ----
  user: `SELECT * FROM users LIMIT 1`,
  games: `SELECT * FROM games ORDER BY playtime_forever_min DESC`,
  game: `SELECT * FROM games WHERE app_id = $appId`,
  sessions: `SELECT * FROM play_sessions
             WHERE ($steamId IS NULL OR steam_id = $steamId)
               AND ($appId IS NULL OR app_id = $appId)
             ORDER BY play_date DESC, started_at DESC`,
  achievements: `SELECT * FROM achievements
                WHERE ($appId IS NULL OR app_id = $appId)
                ORDER BY app_id, api_name`,
  wishlist: `SELECT * FROM wishlist ORDER BY added_at DESC`,
  discounts: `SELECT * FROM discounts
              WHERE ($category IS NULL OR category = $category)
              ORDER BY discount_percent DESC`,
  priceHistory: `SELECT * FROM price_history WHERE app_id = $appId ORDER BY captured_at ASC`,
  // 用户自己的内容：不分账号、全表返回（体量 = 用户实际写了多少条，几十行量级）
  gameNotes: `SELECT * FROM game_notes ORDER BY updated_at DESC`,
  huntPicks: `SELECT * FROM hunt_picks ORDER BY added_at DESC`,

  // ---- 真 SQL 聚合 ----
  // 每天总时长 + 会话数，用于热力图；按 play_date 分组。
  dayStats: `SELECT play_date AS date, SUM(minutes) AS minutes, COUNT(*) AS session_count
             FROM play_sessions
             WHERE ($steamId IS NULL OR steam_id = $steamId)
             GROUP BY play_date
             ORDER BY play_date ASC`,
  /**
   * 概览：用标量子查询一次性聚合（本周/今日/最近30天时长、会话数、游戏数、今日解锁成就数）。
   *
   * ⚠️ 日期边界一律用**参数**（`$today` / `$day7` / `$day30` / `$todayStart` / `$tomorrowStart`），
   * 不许写 SQLite 的 `date('now')` —— 那是 **UTC**，而 `play_date` 存的是**本地**日期
   * （sync.ts 的 todayYMD() 用 getFullYear/getMonth/getDate）。在 UTC+8 下两者每天有 8 小时不一致，
   * 「今天」/「本周」的窗口会整体错位一天，凌晨到早上这段时间 `today_minutes` 恒为 0。
   * 时间戳同理：`unlocked_at` 与本地零点比，而不是 `date(unlocked_at,'unixepoch') = date('now')`。
   * 这些参数由 `aggregateDefaults()` 在**每次调用时**按本地时区现算，不能在模块加载时冻结。
   */
  overview: `SELECT
               (SELECT COALESCE(SUM(minutes),0) FROM play_sessions
                 WHERE play_date >= $day7 AND ($steamId IS NULL OR steam_id = $steamId)) AS week_minutes,
               (SELECT COALESCE(SUM(minutes),0) FROM play_sessions
                 WHERE play_date >= $day30 AND ($steamId IS NULL OR steam_id = $steamId)) AS last30_minutes,
               (SELECT COALESCE(SUM(minutes),0) FROM play_sessions
                 WHERE play_date = $today AND ($steamId IS NULL OR steam_id = $steamId)) AS today_minutes,
               (SELECT COUNT(*) FROM play_sessions
                 WHERE ($steamId IS NULL OR steam_id = $steamId)) AS session_count,
               (SELECT COUNT(DISTINCT app_id) FROM play_sessions
                 WHERE ($steamId IS NULL OR steam_id = $steamId)) AS game_count,
               (SELECT COUNT(*) FROM achievements WHERE unlocked = 1) AS achievements_unlocked,
               (SELECT COUNT(*) FROM achievements WHERE unlocked = 1
                 AND unlocked_at >= $todayStart AND unlocked_at < $tomorrowStart) AS today_achievements`
} as const

/**
 * 采样表保留策略（N0-1）。见 repository.pruneSamples()。
 *
 * 为什么用两条 DELETE 而不是「读出来在 JS 里筛」：一年后这两张表是百万行量级，
 * 全量读进内存再写回既慢又占内存；交给 SQLite 用索引直接删才是可持续的做法。
 */
export const PRUNE_SQL = {
  /**
   * price_history：删掉 90 天以前、且「不是当天最后一笔、也不是该游戏历史最低那一笔」的行。
   *
   * - 90 天内一行不删 —— `isHistoricalLow` 的唯一依据就是这些采样，删了就再也算不准；
   * - 90 天以外每天留最后一笔（收盘价），保留长期走势的形状；
   * - 另外**无论多久都留该游戏的历史最低那一笔**，保证 `priceLowest()` 永远返回真值。
   */
  priceHistory: `DELETE FROM price_history
                 WHERE captured_at < $cutoff
                   AND rowid NOT IN (
                     SELECT MAX(rowid) FROM price_history
                     WHERE captured_at < $cutoff
                     GROUP BY app_id, date(captured_at, 'unixepoch')
                   )
                   AND NOT (price_cents >= 0 AND price_cents = (
                     SELECT MIN(p2.price_cents) FROM price_history p2 WHERE p2.app_id = price_history.app_id
                   ))`,
  /**
   * snapshots：每款游戏只留最近 N 条（N = SNAPSHOT_KEEP_ROWS，现为 30）。
   *
   * 差分只需要最近一条，但**历史快照本身就是数据资产**：它让「这个游戏我玩了多久、
   * 什么时候开始玩、这一年玩了哪些」这类问题有答案，而这些问题 Steam 官方不提供历史接口 ——
   * 也就没法靠任何现查型工具（含手机端）回答。代价是每款 30 行 × 游戏数，很小。
   */
  snapshots: `DELETE FROM snapshots
              WHERE rowid IN (
                SELECT rowid FROM snapshots s
                WHERE (SELECT COUNT(*) FROM snapshots s2
                       WHERE s2.app_id = s.app_id AND s2.captured_at > s.captured_at) >= 30
              )`
} as const

/** 11 个查询名 → SQL。缺失 name 在 repository 里会被兜底拒绝。 */
export const QUERY_MAP: Record<DbQueryName, string> = {
  user: SQL.user,
  games: SQL.games,
  game: SQL.game,
  sessions: SQL.sessions,
  achievements: SQL.achievements,
  wishlist: SQL.wishlist,
  discounts: SQL.discounts,
  priceHistory: SQL.priceHistory,
  dayStats: SQL.dayStats,
  overview: SQL.overview,
  gameNotes: SQL.gameNotes,
  huntPicks: SQL.huntPicks
}

/**
 * dayStats / overview 聚合查询的默认绑定。
 *
 * **必须是函数、每次调用时重算**：`today` 之类的边界跨过午夜就会变，
 * 而 Node 进程可以连开好几天。早前这里是模块加载时冻结的对象，
 * 跨过零点后「今天」会一直停在启动那天。
 */
export function aggregateDefaults(): Record<string, unknown> {
  const now = new Date()
  const ymd = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const shiftDays = (n: number): string => {
    const d = new Date(now)
    d.setDate(d.getDate() + n)
    return ymd(d)
  }
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return {
    $steamId: null,
    $appId: null,
    $category: null,
    $today: ymd(now),
    $day7: shiftDays(-7),
    $day30: shiftDays(-30),
    // 本地零点的 unix 秒（unlocked_at 是秒级时间戳）
    $todayStart: Math.floor(startOfToday.getTime() / 1000),
    $tomorrowStart: Math.floor(new Date(startOfToday.getTime() + 86400_000).getTime() / 1000)
  }
}
