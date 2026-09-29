import { useMemo, useState } from 'react'
import { Calendar, ChartColumn, ChartPie, Clock, Gamepad2, Hourglass, Sparkles, ThumbsUp, Trophy } from 'lucide-react'
import { Badge, Button, Card, EmptyState, GameCover, ProgressBar, Segmented, SectionHeader } from '@/components/ui'
import type { Column } from '@/components/ui'
import { DataTable } from '@/components/ui'
import { DailyBarChart, AchievementTrendChart, ChartCard, GenrePieChart, HourBarChart, YearHeatmap, type AchievementTrendPoint } from '@/components/charts'
import { PageHeader } from '@/components/shared/PageHeader'
import { MetricTile } from '@/components/shared/MetricTile'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { useRangeAnalysis } from '@/hooks/useRangeAnalysis'
import { usePersistedState } from '@/hooks/usePersistedState'
import type { RangeKey, RankingRow } from '@/types/steam'
import { RANGE_OPTIONS } from '@/utils/constants'
import { dailySeries } from '@/utils/stats'
import { formatDate, formatHours, formatMinutes, formatPercent, formatRelative, toYMD } from '@/utils/format'

/**
 * 「每日时长还没积累」期间的引导（N2-1）。
 *
 * 为什么需要：Steam 官方接口不提供每日明细，日粒度数据只能靠「同步 → 游玩 → 再同步」的
 * 快照差分攒出来。新装用户同步完 69 款游戏之后，游戏分析页的四张图会**同时**是空状态 ——
 * 观感很像「功能坏了」，而原来的文案只说「需要至少两次跨天同步」，
 * 没有回答用户真正的问题：**我现在能看到什么？还要等多久？**
 *
 * 所以这一屏做两件事：
 *  1) 把「不用等」的东西先摆出来（累计时长 TOP、好评率 TOP —— 都直接来自 games 表）；
 *  2) 明确写出下一次跨天同步之后会发生什么。
 */
function WaitingGuide({ onSync, busy }: { onSync: () => void; busy: boolean }) {
  const games = useDataStore((s) => s.snapshot?.games) ?? []
  const navigate = useAppStore((s) => s.navigate)

  const topPlaytime = useMemo(
    () => [...games].filter((g) => g.playtimeForeverMin > 0).sort((a, b) => b.playtimeForeverMin - a.playtimeForeverMin).slice(0, 6),
    [games]
  )
  const topRated = useMemo(
    () => [...games].filter((g) => g.reviewPercent > 0 && g.reviewCount >= 50).sort((a, b) => b.reviewPercent - a.reviewPercent).slice(0, 5),
    [games]
  )

  return (
    <Card padding="md" glow>
      <SectionHeader
        title="每日图表还在积累，但下面这些现在就能看"
        subtitle="Steam 不提供每日明细 —— 日粒度数据需要「同步 → 游玩 → 再跨天同步」才会出现"
        icon={<Hourglass size={15} />}
        action={
          <Button size="sm" variant="secondary" icon={<Sparkles size={14} />} onClick={onSync} disabled={busy}>
            {busy ? '同步中…' : '立即同步一次'}
          </Button>
        }
      />

      <div className="mt-3 rounded-xl border border-line bg-bg1/45 px-3 py-2.5 text-[11.5px] leading-relaxed text-t3">
        <p>
          已经拿到的：<span className="text-t2">{games.length} 款游戏的累计时长、成就、好评率</span> 全部就绪，下面两张榜就是它们。
        </p>
        <p className="mt-1">
          还需要等的：<span className="text-t2">每日游玩时长 / 热力图 / 常玩时段 / 最近 30 天趋势</span>。
          下次开机（或再点一次同步）时，只要这中间玩过任意一款游戏，它们就会被自动点亮。
          <span className="text-t2">今天再开一次不会立刻有东西</span> —— 要等有「跨天」的两笔采样才能算出差值。
        </p>
        <p className="mt-1">
          不想等？<span className="text-t2">打开任意游戏的详情页，用「游玩记录」卡片手动补录一段时长</span>，趋势图会立刻有数据 —— 真实账号的每日时长只能靠这种方式或 App 常驻采样积累。
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-line bg-bg1/45 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-t1">
              <Trophy size={13} className="text-accent" />
              累计时长排行
            </span>
            <button type="button" onClick={() => navigate('library')} className="text-[11px] text-accent hover:underline">
              去游戏库 →
            </button>
          </div>
          {topPlaytime.length === 0 ? (
            <p className="mt-2 text-[11.5px] text-t3">库里还没有时长大于 0 的游戏。</p>
          ) : (
            <div className="mt-2.5 space-y-1.5">
              {topPlaytime.map((g, index) => (
                <button
                  key={g.appId}
                  type="button"
                  onClick={() => navigate('game', { appId: g.appId, from: 'analysis' })}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-bg3"
                >
                  <span className="w-4 shrink-0 text-center text-[11.5px] text-t3">{index + 1}</span>
                  <GameCover src={g.headerImage} name={g.name} className="h-8 w-[60px] shrink-0" rounded="rounded-md" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-t1" title={g.name}>
                    {g.name}
                  </span>
                  <span className="shrink-0 text-[12px] text-accent">{formatHours(g.playtimeForeverMin)} h</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-bg1/45 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-t1">
              <ThumbsUp size={13} className="text-ok" />
              库里好评率最高的
            </span>
            <span className="text-[11px] text-t3">仅统计评价数 ≥ 50</span>
          </div>
          {topRated.length === 0 ? (
            <p className="mt-2 text-[11.5px] text-t3">还没有足够的评价数据（评价数不足 50 的会被过滤掉，避免「1 条好评 100%」这种噪声）。</p>
          ) : (
            <div className="mt-2.5 space-y-1.5">
              {topRated.map((g) => (
                <button
                  key={g.appId}
                  type="button"
                  onClick={() => navigate('game', { appId: g.appId, from: 'analysis' })}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-bg3"
                >
                  <GameCover src={g.headerImage} name={g.name} className="h-8 w-[60px] shrink-0" rounded="rounded-md" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-t1" title={g.name}>
                    {g.name}
                  </span>
                  <span className="shrink-0 text-[12px] text-ok">{formatPercent(g.reviewPercent, 1)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function AnalysisPage() {
  const navigate = useAppStore((s) => s.navigate)
  const runSync = useAppStore((s) => s.runSync)
  const syncRunning = useAppStore((s) => s.sync.running)
  const snapshot = useDataStore((s) => s.snapshot)
  // O-5：分析范围跨会话记住。year 不持久化 —— 跨年之后留着去年会自动把这边变成空视图
  const [range, setRange] = usePersistedState<RangeKey>('analysis.range', 'month')
  const [year, setYear] = useState<number>(() => Number(toYMD(new Date()).slice(0, 4)))
  const analysis = useRangeAnalysis(range)

  const games = snapshot?.games ?? []
  /**
   * 一条会话记录都没有 —— 也就是「每日时长还没积累」的新装状态。
   * 此时四张图表全是空状态，「最近 30 天」之类的区间榜也会是空的。
   */
  const sessionsEmpty = (snapshot?.sessions.length ?? 0) === 0

  /**
   * 不依赖差分的累计排行：直接用 Steam 给的 playtime_forever。
   * 只在 `sessionsEmpty` 时用来替代区间榜 —— 让新用户第一眼看到的是真实数据而不是四个空框。
   */
  const cumulative: RankingRow[] = useMemo(
    () =>
      [...games]
        .filter((g) => g.playtimeForeverMin > 0)
        .sort((a, b) => b.playtimeForeverMin - a.playtimeForeverMin)
        .slice(0, 60)
        .map((g, index) => ({
          rank: index + 1,
          appId: g.appId,
          name: g.name,
          headerImage: g.headerImage,
          rangeMinutes: g.playtimeForeverMin,
          playtimeForeverMin: g.playtimeForeverMin,
          playtimeTwoWeeksMin: g.playtimeTwoWeeksMin,
          lastPlayedAt: g.lastPlayedAt,
          achievementsUnlocked: g.achievementsUnlocked,
          achievementsTotal: g.achievementsTotal,
          genres: g.genres
        })),
    [games]
  )

  const years = useMemo(() => {
    const set = new Set<number>()
    for (const s of snapshot?.sessions ?? []) set.add(Number(s.playDate.slice(0, 4)))
    return Array.from(set).sort((a, b) => b - a)
  }, [snapshot])

  // V4 / F-5：成就完成度趋势 —— 按月聚合 achievements.unlocked_at 的累计解锁数。
  // unlockedAt 是 unix 秒；只有真实同步的已解锁成就才有值，演示数据可能稀疏。
  const achievements = useDataStore((s) => s.derived?.achievements) ?? []
  const achTrend = useMemo<AchievementTrendPoint[]>(() => {
    const ts = achievements
      .map((a) => a.unlockedAt)
      .filter((t): t is number => typeof t === 'number' && t > 0)
      .sort((a, b) => a - b)
    if (ts.length === 0) return []
    const byMonth = new Map<string, number>()
    for (const t of ts) {
      const d = new Date(t * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1)
    }
    const keys = [...byMonth.keys()].sort()
    const [startY, startM] = keys[0].split('-').map(Number)
    const [endY, endM] = keys[keys.length - 1].split('-').map(Number)
    const out: AchievementTrendPoint[] = []
    let cum = 0
    for (let y = startY, m = startM; y < endY || (y === endY && m <= endM); ) {
      const key = `${y}-${String(m).padStart(2, '0')}`
      cum += byMonth.get(key) ?? 0
      out.push({ month: key, count: cum })
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
    }
    return out
  }, [achievements])

  const heatmapDays = useMemo(() => {
    if (!snapshot) return []
    const thisYear = Number(toYMD(new Date()).slice(0, 4))
    const end = year >= thisYear ? toYMD(new Date()) : `${year}-12-31`
    return dailySeries(snapshot.sessions, `${year}-01-01`, end)
  }, [snapshot, year])

  const columns: Array<Column<RankingRow>> = [
    {
      key: 'rank',
      title: '排名',
      width: '68px',
      align: 'center',
      render: (row) => (
        <span
          className={[
            'inline-flex size-6 items-center justify-center rounded-pill text-[11.5px] font-semibold',
            row.rank === 1
              ? 'bg-warn/20 text-warn'
              : row.rank === 2
                ? 'bg-accent3/22 text-accent'
                : row.rank === 3
                  ? 'bg-ok/18 text-ok'
                  : 'text-t3'
          ].join(' ')}
        >
          {row.rank}
        </span>
      )
    },
    {
      key: 'game',
      title: '游戏',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <GameCover src={row.headerImage} name={row.name} className="h-9 w-[68px] shrink-0" rounded="rounded-md" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-t1" title={row.name}>
              {row.name}
            </p>
            <p className="truncate text-[11px] text-t3">{row.genres.slice(0, 2).join(' · ') || '未分类'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'range',
      title: '区间时长',
      width: '110px',
      align: 'right',
      render: (row) => <span className="text-[12.5px] text-accent">{formatHours(row.rangeMinutes)} h</span>
    },
    {
      key: 'forever',
      title: '总时长',
      width: '104px',
      align: 'right',
      render: (row) => <span className="text-[12.5px] text-t2">{formatHours(row.playtimeForeverMin)} h</span>
    },
    {
      key: 'twoWeeks',
      title: '最近两周',
      width: '104px',
      align: 'right',
      render: (row) =>
        row.playtimeTwoWeeksMin > 0 ? (
          <span className="text-[12.5px] text-ok">{formatHours(row.playtimeTwoWeeksMin)} h</span>
        ) : (
          <span className="text-[12.5px] text-t3">—</span>
        )
    },
    {
      key: 'last',
      title: '最近游玩',
      width: '112px',
      align: 'right',
      render: (row) => <span className="text-[12px] text-t3">{formatRelative(row.lastPlayedAt, '从未')}</span>
    },
    {
      key: 'progress',
      title: '成就',
      width: '132px',
      render: (row) =>
        row.achievementsTotal > 0 ? (
          <div className="flex items-center gap-2">
            <ProgressBar value={row.achievementsUnlocked} max={row.achievementsTotal} height={4} label={`《${row.name}》成就 ${row.achievementsUnlocked}/${row.achievementsTotal}`} />
            <span className="shrink-0 text-[11px] text-t3">
              {row.achievementsUnlocked}/{row.achievementsTotal}
            </span>
          </div>
        ) : (
          <span className="text-[11.5px] text-t3">无成就</span>
        )
    }
  ]

  if (!analysis) return null

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Gamepad2 size={19} />}
        title="游戏分析"
        subtitle="按周 / 月 / 年 / 全部四个维度拆解你的游玩行为。日粒度数据来自快照差分采样与内置演示集，口径统一由本地 SQLite 提供。"
        action={<Segmented value={range} options={RANGE_OPTIONS} onChange={(v) => setRange(v as RangeKey)} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="区间总时长" value={formatHours(analysis.totalMinutes)} unit="小时" hint={analysis.label} icon={<Clock size={12} />} />
        <MetricTile label="日均时长" value={formatHours(analysis.avgMinutesPerDay)} unit="小时/天" hint={`${analysis.activeDays} 天有记录`} />
        <MetricTile label="涉及游戏" value={analysis.gameCount} unit="款" hint={`${analysis.sessionCount} 段会话`} icon={<Gamepad2 size={12} />} />
        <MetricTile label="解锁成就" value={analysis.achievementsUnlocked} unit="个" hint={analysis.label} icon={<Trophy size={12} />} />
        <MetricTile
          label="连续游玩"
          value={analysis.streak}
          unit="天"
          hint={`区间内最长 ${analysis.longestStreak} 天`}
          icon={<Calendar size={12} />}
        />
      </div>

      {sessionsEmpty ? <WaitingGuide onSync={() => void runSync()} busy={syncRunning} /> : null}

      {/* V4 / O-4：改用 ChartCard，右上角带「导出 PNG」 */}
      <ChartCard
        title="每日游玩时长"
        subtitle={sessionsEmpty ? '等待跨天采样' : `${analysis.label} · 单位：小时`}
        icon={<ChartColumn size={15} />}
        height={250}
        action={
          analysis.topGame ? (
            <Badge tone="accent" size="xs">
              TOP：{analysis.topGame.name}
            </Badge>
          ) : null
        }
      >
        {(snapshot?.sessions.length ?? 0) > 0 ? (
          <DailyBarChart data={analysis.daily} height={250} />
        ) : (
          <EmptyState
            icon={<ChartColumn size={24} />}
            title="这个区间还没有每日时长记录"
            description="Steam 官方接口不提供每日明细，日粒度数据来自「同步 → 游玩 → 再跨天同步」的快照差分。累计时长已经就绪（见上方排行榜），但还没有产生差值记录 —— 下次跨天同步后就会自动出现。"
          />
        )}
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="游戏时间热力图"
          subtitle={`${year} 年每日游玩强度 · 颜色越深时间越长`}
          icon={<Calendar size={15} />}
          height={250}
          exportable={false}
          action={
            years.length > 1 ? (
              <Segmented
                size="sm"
                value={String(year)}
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
                onChange={(v) => setYear(Number(v))}
              />
            ) : (
              <Badge tone="neutral" size="xs">
                {year} 年
              </Badge>
            )
          }
        >
          <div className="h-full overflow-x-auto">
            {(snapshot?.sessions.length ?? 0) > 0 ? (
              <YearHeatmap days={heatmapDays} year={year} />
            ) : (
              <EmptyState
                icon={<Calendar size={24} />}
                title={`${year} 年还没有每日强度数据`}
                description="热力图同样依赖快照差分产生的每日记录：完成第二次跨天同步后会自动点亮，不需要任何额外配置。"
              />
            )}
          </div>
        </ChartCard>

        <ChartCard title="游戏类型占比" subtitle="按时长均摊到各类型" icon={<ChartPie size={15} />} height={250}>
          <GenrePieChart data={analysis.genres} height={250} innerRadius={58} />
        </ChartCard>
      </div>

      <ChartCard
        title="常玩时段分布"
        subtitle={analysis.bestHourRange ? `最常在${analysis.bestHourRange.label}游玩，共 ${formatMinutes(analysis.bestHourRange.minutes)}` : '暂无数据'}
        icon={<Clock size={15} />}
        height={190}
      >
        {(snapshot?.sessions.length ?? 0) > 0 ? (
          <HourBarChart data={analysis.hours} height={190} />
        ) : (
          <EmptyState
            icon={<Clock size={24} />}
            title="还没有可分析的游戏时段"
            description="时段分布来自每日记录的起始时间，同样需要一次跨天同步来产生第一条记录。"
          />
        )}
      </ChartCard>

      {/* V4 / F-5：成就完成度趋势 —— 按月累计解锁数 */}
      <ChartCard
        title="成就完成度趋势"
        subtitle={`按月累计解锁 · 当前共 ${achievements.filter((a) => a.unlocked).length} 个已解锁`}
        icon={<Trophy size={15} />}
        height={220}
        action={
          <Badge tone="neutral" size="xs">
            数据来自成就解锁时间
          </Badge>
        }
      >
        <AchievementTrendChart data={achTrend} height={220} />
      </ChartCard>

      <Card padding="md">
        <SectionHeader
          title="游戏时长排行榜"
          subtitle={sessionsEmpty ? '库内累计时长（来自 Steam，不依赖差分）· 点击任意一行查看游戏详情' : `${analysis.label} · 点击任意一行查看游戏详情`}
          icon={<Trophy size={15} />}
          action={
            <Badge tone="neutral" size="xs">
              共 {(sessionsEmpty ? cumulative : analysis.ranking).length} 款有时长记录
            </Badge>
          }
        />
        <div className="mt-3">
          <DataTable
            columns={columns}
            rows={sessionsEmpty ? cumulative : analysis.ranking}
            rowKey={(row) => String(row.appId)}
            onRowClick={(row) => navigate('game', { appId: row.appId, from: 'analysis' })}
            maxHeight={520}
            empty={
              <EmptyState
                title="这个区间还没有游玩记录"
                description="换一个时间维度，或先完成一次数据同步。"
              />
            }
          />
        </div>
      </Card>

      <p className="text-[11.5px] leading-relaxed text-t3">
        「区间时长」是所选时间范围内的实际游玩时长；「总时长」是该游戏有史以来的累计时长（来自 Steam 的 playtime_forever）。
        最近两周时长直接取自 Steam 返回的 playtime_2weeks。首末游玩时间在缺少精确会话记录时依据成就解锁时间推算，界面会以「约」标注。
      </p>
      {analysis.topGame ? (
        <p className="text-[11.5px] text-t3">
          发行信息参考：{analysis.topGame.name} 最近一次游玩为 {formatDate(analysis.topGame.lastPlayedAt, '未知')}，
          完成度 {formatPercent(analysis.topGame.achievementsTotal > 0 ? (analysis.topGame.achievementsUnlocked / analysis.topGame.achievementsTotal) * 100 : 0, 1)}。
        </p>
      ) : null}
    </div>
  )
}
