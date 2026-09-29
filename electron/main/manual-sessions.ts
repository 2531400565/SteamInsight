/**
 * 手动补录游玩会话（V3 / F-1）。
 *
 * 为什么需要：Steam **没有任何官方接口**提供「每天玩了多少分钟」。
 * 本应用唯一的自动来源是快照差分采样（sync.ts），而它只能看到
 * 「安装之后 + App 正在运行时」的增量 —— 真库实测 138 条快照全部落在 2 个时刻、
 * 两次之间没有任何一款游戏时长变化，`play_sessions` 恒为 0。
 * 于是「趋势图 / 日历热力图 / 常玩时段 / 年报」这条占一半价值的产品线完全空转，
 * 用户明明玩了 4392 小时却一眼都看不见。
 *
 * 手动补录把主动权交回用户：自己填日期与时长，不依赖 App 常驻。
 * 口径必须诚实 —— 写入时 `source='manual'`，界面要区分展示，不能被当成采样数据。
 */
import type { ManualSessionPatch, ManualSessionResult } from '@shared/contract'
import { all, get, run } from './database'
import { num, str } from './mappers'
import { logInfo } from './logger'

/** 单条会话的分钟数上下限：1 分钟起步，24 小时封顶（再大就是填错了）。 */
export const MANUAL_MIN_MINUTES = 1
export const MANUAL_MAX_MINUTES = 1440

/**
 * 「这局从几点开始」的默认值：本地 20:00。
 *
 * `started_at` 会被 `hourDistribution` 用来算「常玩时段」。若默认给 0（零点），
 * 所有补录会话都会堆在「凌晨」那一格，把这张图彻底带偏。
 * 20:00 是本产品在演示数据集里已经采用的傍晚基准，也最贴近多数人的真实习惯。
 */
export const DEFAULT_START_MINUTE_OF_DAY = 20 * 60

/** play_date 的本地YMD；顺手阻止「给明天补录」这种明显填错。 */
function localTodayYMD(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isValidYmd(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const probe = new Date(y, m - 1, d)
  // 「2026-02-31」会被 Date 静默滚动到 3 月 —— 必须回读这三个字段才算真校验
  return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d
}

/** 把 YYYY-MM-DD + 当日分钟偏移转成本地时间戳（秒）。 */
function localTimeToSeconds(playDate: string, minuteOfDay: number): number {
  const [y, m, d] = playDate.split('-').map(Number)
  const base = new Date(y, m - 1, d, 0, 0, 0, 0)
  return Math.floor(base.getTime() / 1000) + minuteOfDay * 60
}

/**
 * 写入一条手动会话。
 *
 * 所有字段都按「用户可能手输错误」来校验，错误一律**返回给调用方**而不是抛异常：
 * 这是用户直接操作的路径，抛出后只会变成一句没有上下文的「同步失败」。
 */
export function addManualSession(steamId: string, patch: ManualSessionPatch): ManualSessionResult {
  const fail = (error: string): ManualSessionResult => ({ ok: false, error })

  if (!steamId) return fail('尚未登录 Steam 账号，无法补录会话')
  if (!Number.isInteger(patch.appId) || patch.appId <= 0) return fail('游戏 ID 不合法')

  // 必须补录给「库里真实存在」的游戏：否则趋势图会出现数据里查无此游戏的孤儿会话
  const game = get('SELECT app_id, name FROM games WHERE app_id = $appId', { appId: patch.appId })
  if (!game) return fail('游戏库里没有这款游戏，请先完成一次同步')

  if (!isValidYmd(patch.playDate)) return fail('日期格式应为 YYYY-MM-DD，且必须是真实存在的日期')
  if (patch.playDate > localTodayYMD()) return fail('不能给未来补录会话')

  const minutes = Math.round(patch.minutes)
  if (!Number.isFinite(minutes) || minutes < MANUAL_MIN_MINUTES || minutes > MANUAL_MAX_MINUTES) {
    return fail(`时长需在 ${MANUAL_MIN_MINUTES}–${MANUAL_MAX_MINUTES} 分钟之间`)
  }

  const rawMinuteOfDay = patch.startMinuteOfDay ?? DEFAULT_START_MINUTE_OF_DAY
  if (!Number.isFinite(rawMinuteOfDay)) return fail('开始时间不合法')
  const minuteOfDay = Math.min(1439, Math.max(0, Math.round(rawMinuteOfDay)))

  const startedAt = localTimeToSeconds(patch.playDate, minuteOfDay)
  const endedAt = startedAt + minutes * 60

  run(
    `INSERT INTO play_sessions (steam_id, app_id, play_date, minutes, started_at, ended_at, source)
     VALUES ($steam_id,$app_id,$play_date,$minutes,$started_at,$ended_at,'manual')`,
    { steam_id: steamId, app_id: patch.appId, play_date: patch.playDate, minutes, started_at: startedAt, ended_at: endedAt }
  )
  const row = get('SELECT MAX(id) AS id FROM play_sessions')
  const id = row ? num(row.id) : 0
  logInfo('session', '手动补录会话', { appId: patch.appId, playDate: patch.playDate, minutes, minuteOfDay, id })
  return { ok: true, id, startedAt, endedAt }
}

/**
 * 删除一条**手动补录**的会话（幂等）。
 *
 * 只允许删 source='manual'：自动采样出来的会话是 sample 差分的唯一痕迹，
 * 删掉会让下一次差分把这段时间重复算一遍，凭空多出时长。
 */
export function removeManualSession(sessionId: number): { ok: boolean; removed: number } {
  if (!Number.isInteger(sessionId) || sessionId <= 0) return { ok: false, removed: 0 }
  const exists = get('SELECT id FROM play_sessions WHERE id = $id AND source = $src', { id: sessionId, src: 'manual' })
  if (!exists) return { ok: false, removed: 0 }
  run('DELETE FROM play_sessions WHERE id = $id AND source = $src', { id: sessionId, src: 'manual' })
  logInfo('session', '删除手动补录会话', { id: sessionId })
  return { ok: true, removed: 1 }
}

/** 某游戏的会话（含来源），给详情页展示「补录/自动」用。 */
export function listAppSessions(appId: number): Array<{ id: number; playDate: string; minutes: number; source: string }> {
  return all(
    `SELECT id, play_date, minutes, source FROM play_sessions
     WHERE app_id = $appId ORDER BY play_date DESC, started_at DESC LIMIT 200`,
    { appId }
  ).map((r) => ({ id: num(r.id), playDate: str(r.play_date), minutes: num(r.minutes), source: str(r.source) }))
}
