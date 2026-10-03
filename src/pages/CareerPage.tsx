import { useMemo } from 'react'
import { Award, Clock, History, LineChart, Sparkles, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge, Card, EmptyState, SectionHeader, StatCard } from '@/components/ui'
import { useDataStore } from '@/store/useDataStore'
import { useAchievements } from '@/hooks/useAchievements'
import { buildCareer } from '@/utils/analytics'
import { formatMoney } from '@/utils/format'

/**
 * 「Steam 生涯」。
 *
 * 这一页是这个软件真正的差异化所在：**它回答的不是「这个游戏现在多少钱」，
 * 而是「你的库在过去几年里发生了什么」**。
 *
 * 差别在数据来源：Steam 官方没有历史接口，手机端 App 每次都是现查，所以它们答不了这个问题；
 * 只有本机长期累积采样（时长差分 + 价格采样 + 成就解锁时间）才能拼出这些曲线。
 *
 * 全部计算走本地 SQLite，**不额外请求任何接口**，离线也能看。
 */
export default function CareerPage() {
  const snapshot = useDataStore((s) => s.snapshot)
  const { achievements, status } = useAchievements()

  const career = useMemo(() => {
    if (!snapshot) return null
    return buildCareer(snapshot.sessions, achievements, snapshot.games, 24)
  }, [snapshot, achievements])

  if (!snapshot || !career) return null

  const peak = career.months.reduce((a, p) => (p.minutes > a.minutes ? p : a), career.months[0] ?? { month: '—', minutes: 0, achievements: 0, newGames: 0, spentCents: 0 })
  const activeMonths = career.months.filter((p) => p.minutes > 0).length
  // 数据积累不足时如实说，不拿两个月的数据编趋势结论
  const thin = career.monthsCovered < 2

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<History size={19} />}
        title="Steam 生涯"
        subtitle="你的库在本地累积出的时间序列。Steam 官方没有历史接口，手机端 App 每次现查 —— 这些曲线只有本机长期跑才拼得出来。"
        action={
          <Badge tone={status === 'loading' ? 'warn' : 'neutral'} size="sm">
            {status === 'loading' ? '正在读取成就数据…' : `覆盖 ${career.monthsCovered} 个月`}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Clock size={18} />}
          label="累计时长（会话口径）"
          value={formatHours(career.totalMinutes)}
          hint={thin ? '需要更长积累才准确' : `近 ${activeMonths} 个月有游玩记录`}
        />
        <StatCard
          icon={<Award size={18} />}
          label="累计解锁成就"
          value={career.totalAchievements}
          unit="个"
          hint={`覆盖 ${snapshot.games.length} 款游戏`}
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="游戏库原价总额"
          value={formatMoney(career.libraryValueCents)}
          hint="按原价计，不按今天的折扣价"
        />
        <StatCard
          icon={<Sparkles size={18} />}
          label="最投入的月份"
          value={peak.month}
          hint={peak.minutes > 0 ? `当月 ${formatHours(peak.minutes)}` : '暂无游玩记录'}
        />
      </div>

      <Card padding="md">
        <SectionHeader
          title="每月投入"
          subtitle="会话分钟数（由时长差分推算）· 成就解锁数 · 新增游戏数"
          icon={<LineChart size={15} />}
        />
        <MonthlyChart months={career.months} />
      </Card>

      <Card padding="md">
        <SectionHeader
          title="逐年对比"
          subtitle="今年 vs 去年：时长、成就、新游戏、花费"
          icon={<History size={15} />}
        />
        <YearTable months={career.months} />
      </Card>

      {thin ? (
        <p className="rounded-xl border border-warn/35 bg-warn/10 px-3 py-2.5 text-[11.5px] leading-relaxed text-t2">
          目前的采样只覆盖 <span className="text-warn">{career.monthsCovered} 个月</span>。
          时长是「相邻两次同步的差分」算出来的（Steam 官方不提供历史时长），所以**软件连续运行越久，这页越有价值**——
          这也正是它与手机端工具的差别：别人查不到「过去」，是因为他们没有「过去」。
        </p>
      ) : null}
    </div>
  )
}

function formatHours(minutes: number): string {
  if (minutes <= 0) return '0 小时'
  const h = minutes / 60
  return h >= 1000 ? `${(h / 1000).toFixed(1)}k 小时` : `${h.toFixed(0)} 小时`
}

/** 三个指标的迷你柱状图：纯 CSS，不引第三方图表库（这个页面要「零额外依赖」地轻）。 */
function MonthlyChart({ months }: { months: Array<{ month: string; minutes: number; achievements: number; newGames: number }> }): React.JSX.Element {
  const maxMinutes = Math.max(1, ...months.map((m) => m.minutes))
  if (months.every((m) => m.minutes === 0 && m.achievements === 0)) {
    return (
      <div className="mt-3">
        <EmptyState
          icon={<LineChart size={22} />}
          title="还没有足够的时间序列"
          description="时长来自相邻两次同步的差分，所以至少要跑过两次同步才会有数据。这是本地累积型指标的固有特点。"
        />
      </div>
    )
  }
  return (
    <div className="mt-4 flex items-end gap-1 overflow-x-auto pb-1">
      {months.map((m) => {
        const h = (m.minutes / maxMinutes) * 100
        return (
          <div key={m.month} className="group relative flex w-9 shrink-0 flex-col items-center gap-1">
            <div className="flex h-28 w-full items-end justify-center">
              <div
                className="w-full rounded-t bg-accent/70 transition-all group-hover:bg-accent"
                style={{ height: `${Math.max(2, h)}%` }}
                title={`${m.month}：${formatHours(m.minutes)} · ${m.achievements} 成就 · ${m.newGames} 新游戏`}
              />
            </div>
            <span className="text-[9.5px] text-t3">{m.month.slice(2)}</span>
          </div>
        )
      })}
    </div>
  )
}

/** 逐年对比表。 */
function YearTable({ months }: { months: Array<{ month: string; minutes: number; achievements: number; newGames: number; spentCents: number }> }): React.JSX.Element {
  const byYear = new Map<string, { minutes: number; achievements: number; newGames: number; spentCents: number }>()
  for (const m of months) {
    const y = m.month.slice(0, 4)
    const cur = byYear.get(y) ?? { minutes: 0, achievements: 0, newGames: 0, spentCents: 0 }
    cur.minutes += m.minutes
    cur.achievements += m.achievements
    cur.newGames += m.newGames
    cur.spentCents += m.spentCents
    byYear.set(y, cur)
  }
  const years = [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  if (years.length === 0) return <p className="mt-3 text-[12px] text-t3">还没有跨月数据。</p>
  return (
    <table className="mt-3 w-full text-[12.5px]">
      <thead>
        <tr className="border-b border-line text-left text-[11px] text-t3">
          <th className="pb-2 font-normal">年份</th>
          <th className="pb-2 font-normal">时长</th>
          <th className="pb-2 font-normal">成就</th>
          <th className="pb-2 font-normal">新游戏</th>
          <th className="pb-2 text-right font-normal">当年花费（原价）</th>
        </tr>
      </thead>
      <tbody>
        {years.map(([y, v]) => (
          <tr key={y} className="border-b border-line/50 last:border-0">
            <td className="py-2 text-t1">{y}</td>
            <td className="py-2 text-t2">{formatHours(v.minutes)}</td>
            <td className="py-2 text-t2">{v.achievements}</td>
            <td className="py-2 text-t2">{v.newGames}</td>
            <td className="py-2 text-right text-t1">{v.spentCents > 0 ? formatMoney(v.spentCents) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
