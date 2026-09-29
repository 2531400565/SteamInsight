import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Clock, Crown, Download, FileText, Flame, Gamepad2, Info, Rocket, Sparkles, Trophy } from 'lucide-react'
import { Badge, Button, Card, EmptyState, GameCover, SectionHeader, Segmented, Select } from '@/components/ui'
import { DailyBarChart, GenrePieChart, HourBarChart, MonthlyBarChart } from '@/components/charts'
import { MetricTile } from '@/components/shared/MetricTile'
import { useDataStore } from '@/store/useDataStore'
import { bridge } from '@/services/bridge'
import { availableMonths, availableWeeks, availableYears, buildPeriodReport, buildWrapped } from '@/utils/wrapped'
import { formatHours, formatMinutes, formatPercent } from '@/utils/format'
import type { ReportPeriod } from '@/types/steam'
import { PosterOverlay } from './wrapped/PosterOverlay'

interface WrappedPageProps {
  year?: number
  period?: ReportPeriod
  key?: string
  exportMode?: 'png'
}

const PERIOD_OPTIONS: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'year', label: '年度' },
  { value: 'month', label: '月度' },
  { value: 'week', label: '周度' }
]

/** `2026-09` → `2026 年 9 月`；`2026-W39` → `2026 年第 39 周` */
function periodOptionLabel(key: string): string {
  const month = /^(\d{4})-(\d{2})$/.exec(key)
  if (month) return `${month[1]} 年 ${Number(month[2])} 月`
  const week = /^(\d{4})-W(\d{2})$/.exec(key)
  if (week) return `${week[1]} 年第 ${Number(week[2])} 周`
  return key
}

export default function WrappedPage({ year: initialYear, period: initialPeriod, key: initialKey, exportMode }: WrappedPageProps) {
  const snapshot = useDataStore((s) => s.snapshot)
  // 成就统一读 derived 展开后的那一份（快照里是紧凑形态，图标只带文件名）
  const achievements = useDataStore((s) => s.derived?.achievements)
  const sessions = useMemo(() => snapshot?.sessions ?? [], [snapshot])

  const years = useMemo(() => availableYears(sessions), [sessions])
  const months = useMemo(() => availableMonths(sessions), [sessions])
  const weeks = useMemo(() => availableWeeks(sessions), [sessions])

  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod ?? 'year')
  const [year, setYear] = useState<number>(() => initialYear ?? years[0] ?? new Date().getFullYear())
  const [monthKey, setMonthKey] = useState<string>(() => initialKey ?? months[0] ?? '')
  const [weekKey, setWeekKey] = useState<string>(() => initialKey ?? weeks[0] ?? '')

  // 导出态由主进程通过 navigate 通道指定；进入导出态后整页只渲染海报，供 capturePage 截图
  const poster = exportMode === 'png'
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)

  // 数据变化后把选项夹回合法范围，避免出现「选中了一个已经不存在的月份」
  useEffect(() => {
    if (years.length > 0 && !years.includes(year)) setYear(years[0])
  }, [years, year])
  useEffect(() => {
    if (months.length > 0 && !months.includes(monthKey)) setMonthKey(months[0])
  }, [months, monthKey])
  useEffect(() => {
    if (weeks.length > 0 && !weeks.includes(weekKey)) setWeekKey(weeks[0])
  }, [weeks, weekKey])

  const activeKey = period === 'month' ? monthKey : period === 'week' ? weekKey : String(year)

  const report = useMemo(() => {
    if (!snapshot || !achievements) return null
    if (period === 'year') return buildWrapped(snapshot.games, snapshot.sessions, achievements, year)
    if (!activeKey) return null
    return buildPeriodReport(snapshot.games, snapshot.sessions, achievements, period, activeKey)
  }, [snapshot, achievements, period, year, activeKey])

  const exportAs = async (format: 'png' | 'pdf'): Promise<void> => {
    setBusy(format)
    setMessage(null)
    try {
      // 海报态由主进程驱动：导出前它会通过 navigate 通道把本页切到 exportMode='png'，
      // capturePage 完成后再切回首页。渲染层不需要自己先铺一屏海报。
      const result = await bridge.exporter.wrapped({ format, year, period, key: period === 'year' ? undefined : activeKey })
      if (!result.ok && !result.cancelled) setMessage(result.error ?? '导出失败')
      else if (result.ok && result.filePath) setMessage(`已保存到：${result.filePath}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  /** 周期切换控件：年度用分段（年份通常很少），周/月用下拉（选项多，分段会挤爆）。 */
  const periodPicker = (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented value={period} options={PERIOD_OPTIONS} onChange={(v) => setPeriod(v as ReportPeriod)} />
      {period === 'year' ? (
        years.length > 1 ? (
          <Segmented value={String(year)} options={years.map((y) => ({ value: String(y), label: `${y} 年` }))} onChange={(v) => setYear(Number(v))} />
        ) : (
          <Badge tone="neutral" size="sm">
            {year} 年
          </Badge>
        )
      ) : period === 'month' ? (
        <div className="w-[172px]">
          <Select
            value={monthKey}
            options={months.map((m) => ({ value: m, label: periodOptionLabel(m) }))}
            onChange={setMonthKey}
            disabled={months.length === 0}
          />
        </div>
      ) : (
        <div className="w-[172px]">
          <Select
            value={weekKey}
            options={weeks.map((w) => ({ value: w, label: periodOptionLabel(w) }))}
            onChange={setWeekKey}
            disabled={weeks.length === 0}
          />
        </div>
      )}
    </div>
  )

  if (!snapshot) return null

  if (!report || report.totalMinutes === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 items-center justify-center rounded-xl border border-line bg-bg2 text-accent">
              <Sparkles size={19} />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-t1">Steam 报告</h1>
              <p className="mt-1 max-w-[680px] text-[13px] leading-relaxed text-t3">
                年度回顾 / 月报 / 周报，全部由本地会话、成就与价格记录推导，不需要额外联网。
              </p>
            </div>
          </div>
          {periodPicker}
        </div>
        <EmptyState
          icon={<Rocket size={26} />}
          title={`${report?.periodLabel ?? '这个周期'}还没有足够的游玩数据`}
          description="换一个周期，或先完成一次数据同步。报告完全由本地会话记录推导，不需要额外联网。"
        />
      </div>
    )
  }

  const top1 = report.topGames[0]
  const shareText = top1 ? `我最常玩的是《${top1.name}》，占这段时间的 ${formatPercent(top1.percent, 0)}` : ''
  const label = report.periodLabel ?? `${report.year} 年`
  const isYear = report.period === undefined || report.period === 'year'

  return (
    <div className="space-y-5">
      {poster ? <PosterOverlay report={report} user={snapshot.user} /> : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-10 items-center justify-center rounded-xl border border-line bg-bg2 text-accent">
            <Sparkles size={19} />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-t1">Steam 报告</h1>
            <p className="mt-1 max-w-[680px] text-[13px] leading-relaxed text-t3">
              {label}，你在 Steam 上投入了 {formatHours(report.totalMinutes)} 小时。{shareText}。
              报告完全由本地 SQLite 中的会话、成就与价格记录生成，可导出为分享海报或完整 PDF。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {periodPicker}
          <Button size="sm" variant="secondary" icon={<Download size={14} />} loading={busy === 'png'} onClick={() => void exportAs('png')}>
            导出 PNG
          </Button>
          <Button size="sm" variant="secondary" icon={<FileText size={14} />} loading={busy === 'pdf'} onClick={() => void exportAs('pdf')}>
            导出 PDF
          </Button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-line2 bg-accent3/12 px-3 py-2 text-[12px] text-accent">{message}</div>
      ) : null}

      {/* 主视觉横幅 */}
      <div className="relative overflow-hidden rounded-card border border-line shadow-card">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0b2038_0%,#123a63_45%,#1b6dd5_100%)] opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(28rem_18rem_at_88%_8%,rgba(102,192,244,0.35),transparent_65%)]" />
        <div className="relative grid gap-6 p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-[12px] font-medium tracking-[0.32em] text-white/70">STEAM WRAPPED</p>
            {isYear ? (
              <p className="mt-1 text-[64px] font-bold leading-none tracking-tight text-white">{report.year}</p>
            ) : (
              <p className="mt-1 text-[40px] font-bold leading-tight tracking-tight text-white">{label}</p>
            )}
            <p className="mt-4 text-[15px] text-white/85">这段时间，你把时间留给了这些世界</p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <HeroStat label="总时长" value={formatHours(report.totalMinutes)} unit="小时" icon={<Clock size={13} />} />
              <HeroStat label="游玩游戏" value={String(report.gameCount)} unit="款" icon={<Gamepad2 size={13} />} />
              <HeroStat label="解锁成就" value={String(report.achievementsUnlocked)} unit="个" icon={<Trophy size={13} />} />
              <HeroStat label="最长连续" value={String(report.longestStreak)} unit="天" icon={<Flame size={13} />} />
            </div>
          </div>

          <div className="space-y-3">
            {report.topGames.slice(0, 3).map((g) => (
              <div key={g.appId} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/8 p-2.5 backdrop-blur-sm">
                <span className="w-4 shrink-0 text-center text-[13px] font-bold text-white/80">{g.rank}</span>
                <GameCover src={g.headerImage} name={g.name} className="h-9 w-[64px] shrink-0" rounded="rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-white">{g.name}</p>
                  <p className="text-[11px] text-white/70">
                    {formatHours(g.minutes)} 小时 · {formatPercent(g.percent, 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 基础统计 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="总时长" value={formatHours(report.totalMinutes)} unit="小时" icon={<Clock size={12} />} />
        <MetricTile label="游玩游戏数量" value={report.gameCount} unit="款" icon={<Gamepad2 size={12} />} />
        <MetricTile label="获得成就数量" value={report.achievementsUnlocked} unit="个" icon={<Trophy size={12} />} />
        <MetricTile
          label="最肝的一天"
          value={<span className="text-[15px]">{report.busiestDay?.date ?? '—'}</span>}
          hint={report.busiestDay ? formatMinutes(report.busiestDay.minutes) : '暂无记录'}
          icon={<Flame size={12} />}
        />
        <MetricTile label="最长连续游玩" value={report.longestStreak} unit="天" icon={<Crown size={12} />} />
      </div>

      {/* TOP5 + 类型 */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card padding="md">
          <SectionHeader title={`${label} TOP 5 游戏`} subtitle="按这段时间的游玩时长排序" icon={<Crown size={15} />} />
          <div className="mt-3 space-y-2.5">
            {report.topGames.map((g) => (
              <div key={g.appId} className="flex items-center gap-3 rounded-xl border border-line bg-bg1/45 p-2.5">
                <span
                  className={[
                    'flex size-6 shrink-0 items-center justify-center rounded-pill text-[11.5px] font-semibold',
                    g.rank === 1 ? 'bg-warn/20 text-warn' : g.rank <= 3 ? 'bg-accent3/22 text-accent' : 'text-t3'
                  ].join(' ')}
                >
                  {g.rank}
                </span>
                <GameCover src={g.headerImage} name={g.name} className="h-11 w-[78px] shrink-0" rounded="rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[13px] font-medium text-t1" title={g.name}>
                      {g.name}
                    </p>
                    <span className="shrink-0 text-[12px] text-accent">{formatHours(g.minutes)} 小时</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-pill bg-bg4">
                    <div className="h-full rounded-pill accent-gradient" style={{ width: `${Math.max(3, g.percent)}%` }} />
                  </div>
                </div>
                <span className="w-11 shrink-0 text-right text-[11.5px] text-t3">{formatPercent(g.percent, 0)}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card padding="md">
            <SectionHeader title="最喜欢的游戏类型" icon={<Sparkles size={15} />} />
            <div className="mt-3">
              <GenrePieChart data={report.genres.slice(0, 6)} height={218} innerRadius={52} />
            </div>
            <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-t3">最常玩类型</span>
                <span className="text-t1">{report.favoriteGenre?.genre ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-t3">常玩时段</span>
                <span className="text-t1">{report.bestHourRange?.label ?? '—'}</span>
              </div>
              {report.topGenreGames.length > 0 ? (
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-t3">代表作品</span>
                  <span className="text-right text-t1">{report.topGenreGames.join('、')}</span>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card padding="md">
          {isYear ? (
            <>
              <SectionHeader title="每月游戏时间" subtitle={`${report.year} 年 · 单位：小时`} icon={<Flame size={15} />} />
              <div className="mt-3">
                <MonthlyBarChart data={report.monthly} height={240} />
              </div>
            </>
          ) : (
            <>
              <SectionHeader title="每日游戏时间" subtitle={`${label} · 单位：小时`} icon={<Flame size={15} />} />
              <div className="mt-3">
                <DailyBarChart data={report.daily ?? []} height={240} />
              </div>
            </>
          )}
        </Card>
        <Card padding="md">
          <SectionHeader
            title="每日时段分布"
            subtitle={report.bestHourRange ? `你最爱在${report.bestHourRange.label}上线` : '暂无数据'}
            icon={<Clock size={15} />}
          />
          <div className="mt-3">
            <HourBarChart data={report.hourDistribution} height={240} />
          </div>
        </Card>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-line bg-bg1/50 px-3 py-2.5 text-[11.5px] leading-relaxed text-t3">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          导出说明：PNG 会先切换到铺满窗口的海报视图再截图，得到的是可以直接分享的图片；PDF 打印的是当前完整报告页（含全部图表），
          两者都通过系统保存对话框选择存放位置，不会自动上传到任何服务器。周报 / 月报与年度报告共用同一套导出链路。
        </span>
      </p>
    </div>
  )
}

function HeroStat({ label, value, unit, icon }: { label: string; value: string; unit: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[11px] text-white/70">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none text-white">{value}</span>
        <span className="text-[11px] text-white/70">{unit}</span>
      </p>
    </div>
  )
}
