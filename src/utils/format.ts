/** 展示层格式化工具。内部一律用「分」和「分钟」，只在渲染时转换。 */

const CNY = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })

/**
 * 时间戳单位兜底：秒与毫秒混用是本项目踩过的坑
 * —— 主进程广播的 lastSyncAt 是 Date.now()（毫秒），而这里过去一律按秒乘 1000，
 * 结果设置页显示「上次同步 58705-10」、同步指示器恒显示「刚刚」。
 * 阈值 1e12：秒级要到公元 33658 年才会触及，任何合理数据都不会误判。
 */
function toMs(input: number): number {
  return input >= 1e12 ? input : input * 1000
}

/** 金额（分）→ ¥ 文本。0 视为免费，负数视为未定价。 */
export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || cents < 0) return '—'
  if (cents === 0) return '免费'
  return CNY.format(cents / 100)
}

/** 只取数字部分，用于价格对比排版 */
export function formatPriceNumber(cents: number): string {
  if (cents <= 0) return '0'
  const yuan = cents / 100
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2)
}

export function formatDiscount(percent: number): string {
  if (!percent || percent <= 0) return ''
  return `-${Math.round(percent)}%`
}

/** 分钟 → 「2.3 小时」/「45 分钟」 */
export function formatMinutes(minutes: number | null | undefined): string {
  const m = Math.max(0, Math.round(minutes ?? 0))
  if (m < 60) return `${m} 分钟`
  const h = m / 60
  return `${h >= 100 ? Math.round(h) : h.toFixed(1)} 小时`
}

/** 分钟 → 纯小时数字文本 */
export function formatHours(minutes: number | null | undefined, digits = 1): string {
  const h = Math.max(0, minutes ?? 0) / 60
  if (h === 0) return '0'
  if (h >= 1000) return Math.round(h).toLocaleString('zh-CN')
  return h.toFixed(digits)
}

/** 大数字压缩：1_234_567 → 123.5万 */
export function formatCompact(value: number | null | undefined): string {
  const n = value ?? 0
  if (Math.abs(n) < 10000) return n.toLocaleString('zh-CN')
  if (Math.abs(n) < 100_000_000) return `${(n / 10000).toFixed(1)}万`
  return `${(n / 100_000_000).toFixed(2)}亿`
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatCount(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('zh-CN')
}

/** unix 秒（或毫秒）→ 本地 YYYY-MM-DD */
export function toYMD(input: number | Date | null | undefined): string {
  if (input === null || input === undefined) return ''
  const d = typeof input === 'number' ? new Date(toMs(input)) : input
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function formatDate(input: number | null | undefined, fallback = '—'): string {
  if (!input) return fallback
  const ymd = toYMD(input)
  return ymd || fallback
}

export function formatDateTime(input: number | null | undefined, fallback = '—'): string {
  if (!input) return fallback
  const d = new Date(toMs(input))
  if (Number.isNaN(d.getTime())) return fallback
  return `${toYMD(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 「3 天前」/「刚刚」/「2 个月前」 */
export function formatRelative(input: number | null | undefined, fallback = '从未'): string {
  if (!input) return fallback
  const diff = (Date.now() - toMs(input)) / 1000
  if (diff < 0) return '刚刚'
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  const days = Math.floor(diff / 86400)
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${(days / 365).toFixed(1)} 年前`
}

/** 剩余时间：「3 天 4 小时后结束」 */
export function formatCountdown(endsAt: number | null | undefined, fallback = ''): string {
  if (!endsAt) return fallback
  const diff = (toMs(endsAt) - Date.now()) / 1000
  if (diff <= 0) return '已结束'
  const d = Math.floor(diff / 86400)
  const h = Math.floor((diff % 86400) / 3600)
  if (d > 0) return `${d} 天 ${h} 小时后结束`
  const m = Math.floor((diff % 3600) / 60)
  return `${h} 小时 ${m} 分钟后结束`
}

/** 热力图色阶：0h=0 / ≤1h=1 / ≤3h=2 / >3h=3 */
export function heatLevel(minutes: number): 0 | 1 | 2 | 3 {
  if (!minutes || minutes <= 0) return 0
  if (minutes < 60) return 1
  if (minutes <= 180) return 2
  return 3
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export function ratioPercent(part: number, total: number): number {
  if (!total) return 0
  return clampPercent((part / total) * 100)
}

/**
 * 徽章文案：稀有度分档。
 * globalPercent 为 0 表示「Steam 没给这个成就的全球占比」，是未知而非 0% 拥有，
 * 必须与「极稀有」区分开，否则会出现「全球 0.0% 玩家拥有」这种荒诞文案。
 */
export function rarityLabel(globalPercent: number): { label: string; tone: 'danger' | 'warn' | 'accent' | 'neutral' } {
  if (!globalPercent || globalPercent <= 0) return { label: '未知', tone: 'neutral' }
  if (globalPercent < 5) return { label: '极稀有', tone: 'danger' }
  if (globalPercent < 15) return { label: '稀有', tone: 'warn' }
  if (globalPercent < 40) return { label: '较少见', tone: 'accent' }
  return { label: '常见', tone: 'neutral' }
}

export function personaStateLabel(state: number | undefined): { label: string; tone: 'ok' | 'warn' | 'neutral' } {
  switch (state) {
    case 1:
      return { label: '在线', tone: 'ok' }
    case 2:
      return { label: '忙碌', tone: 'warn' }
    case 3:
      return { label: '离开', tone: 'warn' }
    case 4:
      return { label: '打盹', tone: 'warn' }
    default:
      return { label: '离线', tone: 'neutral' }
  }
}
