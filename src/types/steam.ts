/**
 * Steam Insight 领域模型。
 * 金额统一以「分」为最小单位存储，展示层用 utils/format.ts 转成 ¥ 文本。
 * 时长统一以「分钟」为最小单位存储，展示层转小时。
 */
import type { PriceAlert, ReportPeriod } from '@shared/contract'

export type { PriceAlert, ReportPeriod }
export type { GameNote, HuntPick, AccountSwitchInfo } from '@shared/contract'

export type DataSource = 'api' | 'local' | 'demo'
export type ThemeMode = 'dark' | 'light' | 'system'
export type RangeKey = 'week' | 'month' | 'year' | 'all'

export interface SteamUser {
  steamId: string
  personaName: string
  avatarUrl: string
  profileUrl: string
  countryCode: string
  accountCreatedAt: number | null
  lastLogoffAt: number | null
  personaState: number
  source: DataSource
  syncedAt: number | null
  /**
   * F-6：Steam 会员概览（`IPlayerService/GetBadges`）。
   * 全部可选且默认 0：老库与演示/离线数据没有这些列，
   * 让「等级显示不出来」降级为一个空值，而不是让类型逼着每个构造点都补齐。
   */
  level?: number
  /** 已获得的徽章枚数 */
  badgeCount?: number
  /** 徽章经验（升级的主要来源） */
  badgeXp?: number
  /** 当前等级已积累经验 */
  playerXp?: number
  /** 距下一级还需要的经验，0 = 接口未返回 */
  xpToNext?: number
}

export interface Game {
  appId: number
  name: string
  headerImage: string
  capsuleImage: string
  genres: string[]
  tags: string[]
  releaseDate: string
  developer: string
  publisher: string
  /** 商店现价（分），-1 表示未获取 */
  priceCents: number
  /** 商店原价（分） */
  originalPriceCents: number
  priceCheckedAt: number | null
  /** 该游戏当前是否为史低 */
  isHistoricalLow: boolean
  reviewPercent: number
  reviewCount: number
}

export interface OwnedGame extends Game {
  playtimeForeverMin: number
  playtimeTwoWeeksMin: number
  firstPlayedAt: number | null
  lastPlayedAt: number | null
  achievementsTotal: number
  achievementsUnlocked: number
  rareAchievements: number
  /** 首次游玩时间是「精确值」还是「依据成就/采样推算」 */
  firstPlayedEstimated: boolean
}

export interface Achievement {
  appId: number
  apiName: string
  displayName: string
  description: string
  iconUrl: string
  iconGrayUrl: string
  unlocked: boolean
  unlockedAt: number | null
  /** 全球解锁百分比，越小越稀有 */
  globalPercent: number
  isRare: boolean
  hidden: boolean
}

/* ------------------- 快照里成就的紧凑表示（IPC 瘦身） ------------------- */

/**
 * 成就图标的公共前缀。Steam 的成就在 `GetSchemaForGame` 里返回的是**完整 URL**，
 * 而同一个游戏下所有成就的地址只差最后那个文件名：
 *   https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/620/<hash>.jpg
 *
 * 4536 条成就 × 2 个图标 × 约 90 字符的前缀 ≈ **0.8 MB 的纯冗余**
 * 每次 reload 都要走一遍 IPC 结构化克隆。所以快照里只传文件名，渲染层拼回来。
 * 数据库里仍然存完整 URL —— 数据包导出 / 导入因此完全不受影响。
 */
export const ACHIEVEMENT_ICON_BASE = 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/'

/**
 * 图标 URL 的**通用**形态：任意 CDN 主机 + `/steamcommunity/public/images/apps/<appId>/<file>`。
 *
 * ⚠️ 为什么必须写成「任意主机」而不是拿 `ACHIEVEMENT_ICON_BASE` 做前缀匹配：
 * 实测库里 4536 条成就的图标地址**全部**是 `https://steamcdn-a.akamaihd.net/...`
 * （Steam 接口返回的是这个老域名），与常量里的 cloudflare 域名**一条都对不上**。
 * 用固定前缀做裁剪的结果是：一条都裁不掉 → 这个优化实际省下 0 字节，白写。
 * 所以改成按路径形态匹配，主机是谁都能裁。
 *
 * 顺带修掉一个真问题：`steamcdn-a.akamaihd.net` 在实测环境里**直接连不上**（curl 返回 000），
 * 而 cloudflare 域名实测 200 且返回 2947 字节的 image/jpeg。
 * 因为展开时统一用 `ACHIEVEMENT_ICON_BASE` 重建，图标会一并被换到能取到的那个 CDN 上。
 */
const ACHIEVEMENT_ICON_RE = /^https?:\/\/[^/]+\/steamcommunity\/public\/images\/apps\/\d+\/(.+)$/

/**
 * 快照传输形态：图标地址换成文件名。
 * 用 `Omit` 而不是给 Achievement 加可选字段，是为了让 TS 在「拿快照的成就当完整成就用」时直接报错。
 */
export interface SnapshotAchievement extends Omit<Achievement, 'iconUrl' | 'iconGrayUrl'> {
  iconFile: string
  iconGrayFile: string
}

/**
 * 完整成就 → 快照形态。
 * 只裁「apps/<appId>/」之后的**文件名** —— 早期实现只裁到主机前缀，把 `<appId>/` 留在了文件名里，
 * 展开时又拼一次 `<appId>/`，结果地址变成 `.../apps/570/570/xxx.jpg`，图标全挂。
 * 形态不匹配（空串、非 Steam 地址）时原样保留完整 URL，展开端会原样返回。
 */
export function toSnapshotAchievement(a: Achievement): SnapshotAchievement {
  const cut = (url: string): string => ACHIEVEMENT_ICON_RE.exec(url)?.[1] ?? url
  const { iconUrl, iconGrayUrl, ...rest } = a
  return { ...rest, iconFile: cut(iconUrl), iconGrayFile: cut(iconGrayUrl) }
}

/** 快照形态 → 完整成就。已经是完整 URL 的（形态没匹配上）原样返回。 */
export function expandAchievement(a: SnapshotAchievement): Achievement {
  const { iconFile, iconGrayFile, ...rest } = a
  const full = (file: string): string => (!file || /^https?:/i.test(file) ? file : `${ACHIEVEMENT_ICON_BASE}${a.appId}/${file}`)
  return { ...rest, iconUrl: full(iconFile), iconGrayUrl: full(iconGrayFile) }
}

/** 紧凑表示实际省下的字符数（自检用，见 tools/probe-features）。 */
export function achievementSavings(a: Achievement): number {
  const s = toSnapshotAchievement(a)
  return a.iconUrl.length + a.iconGrayUrl.length - s.iconFile.length - s.iconGrayFile.length
}

export interface PlaySession {
  id: number
  steamId: string
  appId: number
  /** 本地日期 YYYY-MM-DD */
  playDate: string
  minutes: number
  startedAt: number
  endedAt: number
  /**
   * 这条会话从哪来。
   *  - `'api'`：快照差分采样算出来的（自动）
   *  - `'demo'`：内置演示数据集
   *  - `'manual'`：用户手动补录（F-1）—— **界面必须区分展示**，
   *    因为它是用户自述的数据，可信度与自动采样不同。
   */
  source: DataSource | 'manual'
}

export interface DayPlaytime {
  date: string
  minutes: number
  /** 热力图色阶：0=灰 1=浅蓝 2=蓝 3=深蓝 */
  level: 0 | 1 | 2 | 3
}

export interface WishlistItem {
  appId: number
  steamId: string
  name: string
  headerImage: string
  addedAt: number
  priority: number
  tags: string[]
  originalPriceCents: number
  finalPriceCents: number
  discountPercent: number
  currency: string
  isHistoricalLow: boolean
  historicalLowCents: number
  historicalLowAt: number | null
  reviewPercent: number
  reviewCount: number
  releaseDate: string
  notifiedAt: number | null
}

export type DiscountCategory = 'hot' | 'lowest' | 'toprated' | 'free'

export interface DiscountItem {
  appId: number
  name: string
  headerImage: string
  originalPriceCents: number
  finalPriceCents: number
  discountPercent: number
  currency: string
  isHistoricalLow: boolean
  historicalLowCents: number
  reviewPercent: number
  reviewCount: number
  tags: string[]
  releaseDate: string
  storeUrl: string
  category: DiscountCategory
  /** 促销结束时间（unix 秒），null 表示未知 */
  endsAt: number | null
  fetchedAt: number
  /**
   * 上次为这条促销弹过提醒的时间（unix 秒），null = 还没弹过。
   * 用于跨重启去重：促销结束后条目会被 `purgeDiscounts()` 删掉，
   * 下次该游戏再打折就是全新一行（notifiedAt 回到 null），所以不会「一次提醒后永久沉默」。
   */
  notifiedAt: number | null
}

export interface PricePoint {
  appId: number
  capturedAt: number
  priceCents: number
  originalPriceCents: number
  discountPercent: number
  isHistoricalLow: boolean
}

/** 时间维度聚合结果 */
export interface RangeSummary {
  range: RangeKey
  label: string
  totalMinutes: number
  sessionCount: number
  gameCount: number
  achievementsUnlocked: number
  avgMinutesPerDay: number
  streakDays: number
  longestStreak: number
  topGame: { appId: number; name: string; headerImage: string; minutes: number } | null
  daily: DayPlaytime[]
  genres: GenreShare[]
}

export interface GenreShare {
  genre: string
  minutes: number
  percent: number
  color: string
}

export interface RankingRow {
  rank: number
  appId: number
  name: string
  headerImage: string
  /** 传入会话集合内的游玩分钟数（例如「本月时长」）；无区间语境时等于累计总时长 */
  rangeMinutes: number
  /** Steam 累计总时长（playtime_forever） */
  playtimeForeverMin: number
  playtimeTwoWeeksMin: number
  lastPlayedAt: number | null
  achievementsUnlocked: number
  achievementsTotal: number
  genres: string[]
}

export interface MonthlyPoint {
  /** 原始月份键，固定为 `YYYY-MM`（年度序列为 `YYYY`）。显示用短标签由图表组件负责生成，不要在这里预先格式化。 */
  month: string
  minutes: number
  achievements: number
}

export interface DashboardOverview {
  weekMinutes: number
  /** 与上周对比的百分比，null 表示上周无数据 */
  weekDeltaPercent: number | null
  streakDays: number
  weekTopGame: { appId: number; name: string; headerImage: string; minutes: number } | null
  wishlistDropCount: number
  todayMinutes: number
  todayAchievements: number
  todayHistoricalLows: number
  dailyThisWeek: DayPlaytime[]
  /** O-6：365 天每日序列（含 7 日均线），供趋势图的「30 / 90 / 全部」切换 */
  dailyTrend: Array<{ date: string; minutes: number; avg7: number }>
  /** 30 天口径 = dailyTrend 的尾部 30 条，保留给不想看长尾的调用方 */
  last30Days: Array<{ date: string; minutes: number; avg7: number }>
  recentGames: RankingRow[]
}

/** 成就中心聚合 */
export interface AchievementSummary {
  total: number
  unlocked: number
  percent: number
  rareUnlocked: number
  perfectGames: number
}

export interface AchievementRow extends Achievement {
  gameName: string
  gameHeader: string
}

export interface AlmostDoneGroup {
  appId: number
  gameName: string
  headerImage: string
  total: number
  unlocked: number
  remaining: number
  percent: number
  nextUp: AchievementRow[]
}

export interface WrappedReport {
  year: number
  /** 报告周期。旧数据（仅年度）不写该字段时按 'year' 处理。 */
  period?: ReportPeriod
  /** 周期键：年度 = `2026`；月度 = `2026-09`；周度 = `2026-W39`。 */
  periodKey?: string
  /** 人类可读标题，例如「2026 年」「2026 年 9 月」「2026 年第 39 周（9/22 - 9/28）」。 */
  periodLabel?: string
  /** 单日序列（周报 / 月报用；年度报告用 monthly）。 */
  daily?: DayPlaytime[]
  totalMinutes: number
  gameCount: number
  achievementsUnlocked: number
  busiestDay: { date: string; minutes: number } | null
  longestStreak: number
  topGames: Array<{ rank: number; appId: number; name: string; headerImage: string; minutes: number; percent: number }>
  favoriteGenre: GenreShare | null
  genres: GenreShare[]
  bestHourRange: { label: string; minutes: number } | null
  hourDistribution: Array<{ hour: number; minutes: number }>
  monthly: MonthlyPoint[]
  topGenreGames: string[]
  generatedAt: number
}

export interface AppSettings {
  autoLaunch: boolean
  minimizeToTray: boolean
  autoSync: boolean
  syncIntervalMin: 15 | 30 | 60
  notifyWishlistDrop: boolean
  notifyHistoricalLow: boolean
  notifyFreeGame: boolean
  /** 稀有成就追猎提醒（每天最多一次） */
  notifyAchievementHunt: boolean
  /** 「降到 ¥X 以下通知我」的自定义阈值列表 */
  priceAlerts: PriceAlert[]
  theme: ThemeMode
  steamApiKey: string
  steamId: string
  personaName: string
  avatarUrl: string
  countryCode: string
  enableDemoData: boolean
  /**
   * 检测到「换账号」时怎么处理上一个账号留下的数据。
   *  - `'clear'`：删掉旧账号的会话与快照（默认，见 user-data.purgePreviousAccount）。
   *  - `'keep'`：本次不清理、旧数据保留在库里并继续显示（适合想先把旧数据导出再处理的情况）。
   */
  accountSwitchPolicy: 'clear' | 'keep'
  /** 定期自动把数据导出一份到本地备份目录（滚动保留 autoBackupKeep 份）。 */
  autoBackup: boolean
  /** 自动备份保留的份数上限，超出后删最旧的。 */
  autoBackupKeep: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoLaunch: false,
  minimizeToTray: true,
  autoSync: true,
  syncIntervalMin: 30,
  notifyWishlistDrop: true,
  notifyHistoricalLow: true,
  notifyFreeGame: true,
  notifyAchievementHunt: true,
  priceAlerts: [],
  theme: 'dark',
  steamApiKey: '',
  steamId: '',
  personaName: '',
  avatarUrl: '',
  countryCode: 'CN',
  enableDemoData: true,
  accountSwitchPolicy: 'clear',
  autoBackup: true,
  autoBackupKeep: 7
}
