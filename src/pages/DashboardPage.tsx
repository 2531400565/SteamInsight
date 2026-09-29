import { Fragment, useMemo, type ReactNode } from 'react'
import { Activity, Calendar, Flame, Info, LayoutDashboard, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import { Badge, Card, EmptyState, SectionHeader, StatCard } from '@/components/ui'
import { DailyBarChart, ChartCard, TrendLineChart } from '@/components/charts'
import { PageHeader } from '@/components/shared/PageHeader'
import { RecentGameCard } from '@/components/shared/RecentGameCard'
import { SteamProfileBadge, hasProfileLevel } from '@/components/shared/SteamProfileBadge'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { useDashboardLayout, visibleCards, type DashboardCardKey } from '@/hooks/useDashboardLayout'
import { formatHours, formatMinutes, formatRelative, toYMD } from '@/utils/format'
import { streaks } from '@/utils/stats'

export default function DashboardPage() {
  const derived = useDataStore((s) => s.derived)
  const snapshot = useDataStore((s) => s.snapshot)
  const navigate = useAppStore((s) => s.navigate)
  // V4/O6：区块显隐 + 排序（设置 → 外观 → 仪表盘布局 里编辑）
  const [layout] = useDashboardLayout()
  const user = snapshot?.user

  const longestStreak = useMemo(() => (snapshot ? streaks(snapshot.sessions).longest : 0), [snapshot])

  if (!derived || !snapshot) return null
  const o = derived.overview
  const today = toYMD(new Date())
  const weekRange = o.dailyThisWeek.length
    ? `${o.dailyThisWeek[0].date.slice(5).replace('-', '/')} ~ ${o.dailyThisWeek[o.dailyThisWeek.length - 1].date.slice(5).replace('-', '/')}`
    : ''

  /** 每个可定制区块的渲染内容（顺序由 useDashboardLayout 决定，见页尾 map）。 */
  const renderCard = (key: DashboardCardKey): ReactNode => {
    switch (key) {
      case 'stats':
        return (
          /* 第一行：四个速览卡片 */
          <div key="stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<TrendingUp size={18} />}
              label="本周游戏时间"
              value={formatHours(o.weekMinutes)}
              unit="小时"
              delta={o.weekDeltaPercent}
              hint={weekRange ? `统计区间 ${weekRange}` : '本周暂无记录'}
            />
            <StatCard
              icon={<Flame size={18} />}
              label="连续游玩天数"
              value={o.streakDays}
              unit="天"
              hint={`历史最长连续 ${longestStreak} 天`}
            />
            <StatCard
              icon={<Trophy size={18} />}
              label="本周 TOP 游戏"
              value={
                <span className="block max-w-[170px] truncate text-[16px]" title={o.weekTopGame?.name ?? ''}>
                  {o.weekTopGame?.name ?? '—'}
                </span>
              }
              hint={o.weekTopGame ? `本周 ${formatMinutes(o.weekTopGame.minutes)}` : '本周还没有游玩记录'}
            />
            <StatCard
              icon={<Sparkles size={18} />}
              label="愿望单降价数量"
              value={o.wishlistDropCount}
              unit="款"
              hint={`共 ${snapshot.wishlist.length} 款在愿望单中`}
            />
          </div>
        )
      case 'today':
        return (
          /* 第二行：今日摘要 */
          <Card key="today" padding="md">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl accent-gradient text-white">
                <Sparkles size={17} />
              </div>
              <p className="text-[14px] leading-relaxed text-t1">
                今天游玩 <span className="font-semibold text-accent">{formatHours(o.todayMinutes)} 小时</span>，解锁{' '}
                <span className="font-semibold text-accent">{o.todayAchievements}</span> 个成就，
                <span className="font-semibold text-accent">{o.todayHistoricalLows}</span> 款游戏达到史低。
              </p>
              <div className="ml-auto flex items-center gap-2 text-[11.5px] text-t3">
                <Badge tone="neutral" size="xs">
                  今日 {formatMinutes(o.todayMinutes)}
                </Badge>
                <Badge tone={o.todayAchievements > 0 ? 'ok' : 'neutral'} size="xs">
                  成就 +{o.todayAchievements}
                </Badge>
              </div>
            </div>
          </Card>
        )
      case 'chart-week':
        return (
          <ChartCard
            key="chart-week"
            title="本周每日游戏时间"
            subtitle={`${weekRange || '本周'} · 单位：小时`}
            icon={<Calendar size={15} />}
            height={238}
          >
            {snapshot.sessions.length > 0 ? (
              <DailyBarChart data={o.dailyThisWeek} height={238} />
            ) : (
              <EmptyState
                icon={<Calendar size={24} />}
                title="每日时长需要至少两次跨天同步才能积累"
                description="Steam 官方接口不提供每日明细，本软件靠「同步 → 游玩 → 再同步」做快照差分。现在已有累计时长，但还没有产生差值记录。"
              />
            )}
          </ChartCard>
        )
      case 'chart-trend':
        return (
          <ChartCard key="chart-trend" title="每日趋势" subtitle="每日时长与 7 日移动平均" icon={<Activity size={15} />} height={238}>
            {/* O-6：数据给到 365 天，图上由 30/90/全部 决定看多久 —— 标题不再写死「最近 30 天」 */}
            {snapshot.sessions.length > 0 ? (
              <TrendLineChart data={o.dailyTrend} height={238} rangeKey="dashboard-trend" />
            ) : (
              <EmptyState
                icon={<Activity size={24} />}
                title="趋势数据尚未积累"
                description="与左侧同理：完成第二次跨天同步后，这里会出现每日时长与 7 日移动平均曲线。"
              />
            )}
          </ChartCard>
        )
      case 'recent':
        return (
          /* 底部：最近游玩 */
          <div key="recent">
            <SectionHeader
              title="最近游玩的游戏"
              subtitle="按最后一次启动时间排序"
              icon={<Trophy size={15} />}
              action={
                <button
                  type="button"
                  onClick={() => navigate('analysis')}
                  className="text-[12px] text-accent transition-colors hover:underline"
                >
                  查看全部排行 →
                </button>
              }
            />
            {o.recentGames.length === 0 ? (
              <EmptyState title="还没有游玩记录" description="同步完成后这里会显示最近玩过的游戏。" />
            ) : (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {o.recentGames.map((row) => (
                  <RecentGameCard key={row.appId} row={row} variant="recent" onOpen={(appId) => navigate('game', { appId, from: 'dashboard' })} />
                ))}
              </div>
            )}
          </div>
        )
    }
  }

  /* V4/O6：区块按用户配置（显隐 + 顺序）渲染。
     两张图表在用户没调序时并排一行；只要它们相邻就保持并排（不管谁在前），
     被其它区块隔开则各自独占一行。 */
  const visible = visibleCards(layout)
  const blocks: ReactNode[] = []
  let bi = 0
  while (bi < visible.length) {
    const k = visible[bi]
    const nk = visible[bi + 1]
    const paired =
      (k === 'chart-week' && nk === 'chart-trend') || (k === 'chart-trend' && nk === 'chart-week')
    if (paired) {
      blocks.push(
        <div key="charts" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {renderCard(k)}
          {renderCard(nk)}
        </div>
      )
      bi += 2
    } else {
      blocks.push(<Fragment key={k}>{renderCard(k)}</Fragment>)
      bi += 1
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<LayoutDashboard size={19} />}
        title={`欢迎回来，${user?.personaName ?? '玩家'}`}
        subtitle={`本地数据库已就绪，共 ${snapshot.games.length} 款游戏 / ${snapshot.sessions.length.toLocaleString('zh-CN')} 条游玩记录。所有统计优先读取 SQLite，不会重复消耗 Steam API 配额。`}
        action={
          <>
            <Badge tone="accent" icon={<Calendar size={11} />}>
              今天 {today}
            </Badge>
            <Badge tone="neutral" icon={<Activity size={11} />}>
              上次同步 {formatRelative(snapshot.user?.syncedAt, '未同步')}
            </Badge>
            {snapshot.user?.source === 'demo' ? (
              <Badge tone="warn" size="sm">
                内置演示数据
              </Badge>
            ) : null}
          </>
        }
      />

      {/* F-6：等级与徽章由每次常规同步顺手带回，放在页首当作「资历」概览 */}
      {hasProfileLevel(user) ? (
        <div className="w-full max-w-[320px]">
          <SteamProfileBadge user={user} />
        </div>
      ) : null}

      {/* V4/O6：区块按用户配置（显隐 + 顺序）渲染，图表相邻时并排 */}
      {blocks}

      <p className="flex items-start gap-2 rounded-xl border border-line bg-bg1/50 px-3 py-2.5 text-[11.5px] leading-relaxed text-t3">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          Steam 官方 API 只提供「累计时长」与「最近两周时长」，不提供每日明细。本软件的每日数据来自两种来源：
          <span className="text-t2">每次同步对 playtime_forever 做快照差分采样</span>（真实数据，随使用逐步积累），
          以及首次启动的<span className="text-t2">内置演示数据集</span>（用于在没有 API Key 时预览全部功能）。
        </span>
      </p>
    </div>
  )
}
