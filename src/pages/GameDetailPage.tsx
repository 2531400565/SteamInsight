import { useMemo } from 'react'
import { ArrowLeft, Award, Calendar, ChartLine, Clock, ExternalLink, Hourglass, Info, ShoppingCart, Star, Tag, Trophy } from 'lucide-react'
import { Badge, Button, Card, EmptyState, GameCover, ProgressBar, RatingBar, SectionHeader, Tooltip } from '@/components/ui'
import { MonthlyBarChart, PriceLineChart } from '@/components/charts'
import { MetricTile } from '@/components/shared/MetricTile'
import { AchievementTile } from '@/components/shared/AchievementTile'
import { NotesCard } from '@/components/shared/NotesCard'
import { ManualSessionCard } from '@/components/shared/ManualSessionCard'
import { useAppStore, ROUTE_LABELS } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { bridge } from '@/services/bridge'
import type { OwnedGame } from '@/types/steam'
import { gameFirstLast, gameMonthlyTrend, gameYearlyTotals, pricePercentileRank, priceTrend } from '@/utils/analytics'
import { formatDate, formatHours, formatMinutes, formatMoney, formatPercent, formatRelative } from '@/utils/format'

export default function GameDetailPage({ game }: { game: OwnedGame }) {
  const navigate = useAppStore((s) => s.navigate)
  /** 从哪一页点进来的：决定「返回」回到哪。直接深链进来时没有来源，退回游戏分析。 */
  const from = useAppStore((s) => s.params.from)
  const backTo = from && from !== 'game' ? from : 'analysis'
  const snapshot = useDataStore((s) => s.snapshot)
  // 成就读 derived 展开后的那一份（快照里是紧凑形态：图标只带文件名）
  const achievements = useDataStore((s) => s.derived?.achievements) ?? []

  const sessions = snapshot?.sessions ?? []

  /** 这款游戏的价格采样（库里存的，已按 captured_at 升序）。 */
  const pricePoints = useMemo(
    () => (snapshot?.priceHistory ?? []).filter((p) => p.appId === game.appId && p.priceCents >= 0),
    [snapshot, game.appId]
  )
  /** 采样里的历史最低价（与 StorePage 的史低判定同一口径：本机采样，不是第三方数据）。 */
  const priceLow = useMemo(
    () => (pricePoints.length === 0 ? null : pricePoints.reduce((m, p) => (p.priceCents < m.priceCents ? p : m), pricePoints[0])),
    [pricePoints]
  )

  const monthly = useMemo(
    () => gameMonthlyTrend(sessions, game.appId, 12).map((p) => ({ month: p.month, minutes: p.minutes, achievements: 0 })),
    [sessions, game.appId]
  )
  /** V3/F-5：降价节奏与降幅（纯本地采样计算，单次采样推不出结论时为 null） */
  const trend = useMemo(() => priceTrend(pricePoints, 90), [pricePoints])
  /** V4/F1：当前价在历史采样中的分位（0=比所有采样都低，100=最贵），越低越划算 */
  const buyPct = useMemo(
    () => pricePercentileRank(pricePoints, game.priceCents > 0 ? game.priceCents : -1),
    [pricePoints, game.priceCents]
  )
  const yearly = useMemo(() => gameYearlyTotals(sessions, game.appId), [sessions, game.appId])
  const fact = useMemo(() => gameFirstLast(sessions, game.appId), [sessions, game.appId])
  const unlocked = useMemo(
    () =>
      achievements
        .filter((a) => a.appId === game.appId && a.unlocked && a.unlockedAt !== null)
        .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
        .slice(0, 6),
    [achievements, game.appId]
  )

  const progress = game.achievementsTotal > 0 ? (game.achievementsUnlocked / game.achievementsTotal) * 100 : 0
  const firstLabel = fact.first
    ? game.firstPlayedEstimated
      ? `约 ${fact.first}`
      : fact.first
    : formatDate(game.firstPlayedAt, '未知')
  const rangeMinutes = useMemo(
    () => sessions.reduce((acc, s) => (s.appId === game.appId ? acc + s.minutes : acc), 0),
    [sessions, game.appId]
  )
  const segmentCount = useMemo(
    () => sessions.reduce((acc, s) => (s.appId === game.appId ? acc + 1 : acc), 0),
    [sessions, game.appId]
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => navigate(backTo)}>
          返回{ROUTE_LABELS[backTo]}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<ExternalLink size={14} />}
          onClick={() => void bridge.app.openExternal(`https://store.steampowered.com/app/${game.appId}/`)}
        >
          在 Steam 商店打开
        </Button>
      </div>

      {/* 头部横幅 */}
      <div className="relative overflow-hidden rounded-card border border-line shadow-card">
        <div className="absolute inset-0">
          <GameCover src={game.capsuleImage || game.headerImage} name={game.name} className="h-full w-full" rounded="rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg1 via-bg1/92 to-bg1/55" />
        </div>
        <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-center">
          <GameCover src={game.headerImage} name={game.name} className="h-[124px] w-[248px] shrink-0 shadow-card" rounded="rounded-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[26px] font-semibold leading-tight text-t1 text-shadow-soft" title={game.name}>
              {game.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {game.genres.map((genre) => (
                <Badge key={genre} tone="accent" size="xs">
                  {genre}
                </Badge>
              ))}
              {game.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} tone="neutral" size="xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-t3">
              {game.developer || '未知开发商'}
              {game.publisher && game.publisher !== game.developer ? ` · 发行：${game.publisher}` : ''}
              {game.releaseDate ? ` · 发行日期 ${game.releaseDate}` : ''}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="w-[220px]">
                <div className="mb-1 flex items-center justify-between text-[11.5px] text-t3">
                  <span>成就完成率</span>
                  <span className="text-t1">
                    {game.achievementsUnlocked}/{game.achievementsTotal}
                  </span>
                </div>
                <ProgressBar value={progress} tone={progress >= 100 ? 'ok' : 'accent'} height={6} label={`《${game.name}》成就完成 ${Math.round(progress)}%`} />
              </div>
              {game.reviewPercent > 0 ? (
                <div className="w-[190px]">
                  <div className="mb-1 flex items-center justify-between text-[11.5px] text-t3">
                    <span>商店好评率</span>
                    <span className="text-t1">{formatPercent(game.reviewPercent)}</span>
                  </div>
                  <RatingBar percent={game.reviewPercent} count={game.reviewCount} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 关键数字 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricTile label="总游戏时间" value={formatHours(game.playtimeForeverMin)} unit="小时" icon={<Clock size={12} />} />
        <MetricTile
          label="最近两周"
          value={formatHours(game.playtimeTwoWeeksMin)}
          unit="小时"
          hint={game.playtimeTwoWeeksMin > 0 ? 'Steam 实时数据' : '最近两周未游玩'}
        />
        <MetricTile label="首次游玩" value={<span className="text-[15px]">{firstLabel}</span>} hint={game.firstPlayedEstimated ? '依据成就解锁时间推算' : '有精确会话记录'} icon={<Calendar size={12} />} />
        <MetricTile label="最近游玩" value={<span className="text-[15px]">{fact.last ?? formatDate(game.lastPlayedAt, '未知')}</span>} hint={formatRelative(game.lastPlayedAt, '未知')} />
        <MetricTile
          label="成就进度"
          value={formatPercent(progress, 1)}
          hint={`${game.achievementsUnlocked} / ${game.achievementsTotal} 已解锁`}
          icon={<Trophy size={12} />}
        />
        <MetricTile label="稀有成就" value={game.rareAchievements} unit="个" hint="全球解锁率 < 10% 且已获得" icon={<Star size={12} />} />
      </div>

      {/* 图表 */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card padding="md">
          <SectionHeader title="月度游玩趋势" subtitle="最近 12 个月 · 单位：小时" icon={<ChartLine size={15} />} />
          <div className="mt-3">
            {sessions.some((s) => s.appId === game.appId) ? (
              <MonthlyBarChart data={monthly} height={240} />
            ) : (
              <EmptyState
                icon={<ChartLine size={24} />}
                title="还没有这款游戏的时长记录"
                description="Steam 官方接口不提供每日明细，月度趋势来自快照差分：同步 → 游玩 → 再同步才会出现数据。"
              />
            )}
          </div>
        </Card>
        <Card padding="md">
          <SectionHeader
            title="每年累计时长"
            subtitle={yearly.length > 0 ? `${yearly[0].month} ~ ${yearly[yearly.length - 1].month}` : '暂无数据'}
            icon={<Calendar size={15} />}
          />
          <div className="mt-3">
            {sessions.some((s) => s.appId === game.appId) ? (
              <MonthlyBarChart data={yearly.map((y) => ({ month: y.month, minutes: y.minutes, achievements: 0 }))} height={240} />
            ) : (
              <EmptyState
                icon={<Calendar size={24} />}
                title="还没有年度累计数据"
                description="与月度趋势同源，同样需要至少两次跨天同步来积累。"
              />
            )}
          </div>
        </Card>
      </div>

      {/* 价格走势：数据一直在 price_history 里躺着，这里把它接成图（N0-2） */}
      <Card padding="md">
        <SectionHeader
          title="价格走势"
          subtitle={
            pricePoints.length > 0
              ? `${pricePoints.length} 次采样 · ${formatDate(pricePoints[0].capturedAt)} 起 · 单位：人民币`
              : '还没有价格采样'
          }
          icon={<Tag size={15} />}
          action={
            <div className="flex items-center gap-1.5">
              {priceLow ? (
                <Badge tone="ok" size="xs">
                  本机史低 {formatMoney(priceLow.priceCents)}
                </Badge>
              ) : null}
              <Badge tone="neutral" size="xs">
                当前 {game.priceCents > 0 ? formatMoney(game.priceCents) : game.priceCents === 0 ? '免费' : '未获取'}
              </Badge>
            </div>
          }
        />
        {/* V3/F-5：把「这款游戏多久降一次、降幅多大」算出来 —— 「是否史低」是二值的，
            回答不了「再等等会不会更便宜」。 */}
        {trend ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={`近 ${trend.windowDays} 天降价次数`} value={`${trend.discountRuns} 次`} hint={`基于 ${trend.points} 次采样`} />
            <Stat label="平均降幅" value={trend.avgDiscountPercent > 0 ? formatPercent(trend.avgDiscountPercent) : '未打折'} hint={`打折时间占比 ${trend.discountDaysPercent}%`} />
            <Stat label="区间最低价" value={formatMoney(trend.lowestCents)} hint={formatDate(trend.lowestAt)} />
            <Stat
              label="距更低还差"
              value={trend.gapToLowestCents > 0 ? formatMoney(trend.gapToLowestCents) : '已是区间最低'}
              hint={trend.gapToLowestCents > 0 ? '再等等或许能省这么多' : '现在就是这段时间的低点'}
            />
          </div>
        ) : null}

        {/* V4/F1：入手建议。当前价在历史采样里的分位越低越划算，比「是否史低」更有信息量。 */}
        {buyPct !== null ? (
          <BuyAdvice pct={buyPct} gap={trend?.gapToLowestCents ?? 0} />
        ) : null}

        <div className="mt-3">
          {pricePoints.length >= 2 ? (
            <PriceLineChart
              data={pricePoints}
              height={260}
              currentCents={game.priceCents > 0 ? game.priceCents : undefined}
              rangeKey={`game-price-${game.appId}`}
            />
          ) : (
            <EmptyState
              icon={<Tag size={24} />}
              title={pricePoints.length === 0 ? '还没有这款游戏的价格记录' : '只有一次采样，画不出走势'}
              description="价格历史完全来自本机的每次同步采样：每同步一次就记一笔。采满两次之后，这里会自动出现折线图。"
            />
          )}
        </div>
        <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-t3">
          与「折扣商城」的史低判定同一口径：全部基于<span className="text-t2">本机历史采样</span>，
          没有引入任何第三方史低数据源。所以安装越久、同步越勤，这条线越准；
          「本机史低」也不等于全网历史最低价。
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card padding="md">
          <SectionHeader
            title="最近获得的成就"
            subtitle={`该游戏共解锁 ${game.achievementsUnlocked} 个成就`}
            icon={<Award size={15} />}
            action={
              <button type="button" onClick={() => navigate('achievements')} className="text-[12px] text-accent hover:underline">
                去成就中心 →
              </button>
            }
          />
          <div className="mt-3 space-y-2">
            {unlocked.length === 0 ? (
              <EmptyState
                icon={<Trophy size={22} />}
                title="还没有已解锁的成就"
                description="完成一次数据同步后，这里会按解锁时间倒序显示。"
              />
            ) : (
              unlocked.map((a) => <AchievementTile key={`${a.appId}-${a.apiName}`} achievement={a} />)
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <NotesCard appId={game.appId} />

          {/* V3/F-1：会话记录 + 手动补录（原「最近会话记录」卡片并入此卡，来源标记一并纠正） */}
          <ManualSessionCard appId={game.appId} gameName={game.name} />

          <Card padding="md">
            <SectionHeader title="区间汇总" subtitle="全部时间维度" icon={<Info size={15} />} />
            <div className="mt-3 space-y-2 text-[12.5px]">
              <Row label="有记录的天数" value={`${fact.days} 天`} />
              <Row label="累计会话段数" value={`${segmentCount} 段`} />
              <Row label="累计采样时长" value={formatMinutes(rangeMinutes)} />
              <Row label="平均每天" value={fact.days > 0 ? formatMinutes(Math.round(rangeMinutes / fact.days)) : '—'} />
              <Row label="商店现价" value={game.priceCents > 0 ? `¥${(game.priceCents / 100).toFixed(2)}` : game.priceCents === 0 ? '免费' : '未获取'} />
            </div>
            <Tooltip label="采样时长来自本机自己记录的会话，通常小于 Steam 的累计总时长（本软件安装前的历史无法追溯）">
              <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-t3">
                为什么累计采样时长 ≠ Steam 总时长？
              </p>
            </Tooltip>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-t3">{label}</span>
      <span className="text-t1">{value}</span>
    </div>
  )
}

/** F-5：降价趋势的小数字块。与页面其它统计块同一套视觉，只是更紧凑。 */
function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg1/45 px-3 py-2">
      <p className="text-[11px] text-t3">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-t1">{value}</p>
      <p className="truncate text-[10.5px] text-t3" title={hint}>
        {hint}
      </p>
    </div>
  )
}

/**
 * V4/F1：入手建议卡。pct = 当前价在历史采样中的分位（0=最便宜，100=最贵）。
 * 分四档给出「现在买划不划算」的结论，并附距史低差额，直接回答用户的真实疑问。
 */
function BuyAdvice({ pct, gap }: { pct: number; gap: number }) {
  const tone =
    pct <= 15
      ? { cls: 'border-ok/30 bg-ok/10', icon: <ShoppingCart size={15} className="text-ok" />, title: '现在很划算，可以考虑入手', text: '当前价处于历史低位，比绝大多数采样都便宜。' }
      : pct <= 40
        ? { cls: 'border-accent3/30 bg-accent3/10', icon: <ShoppingCart size={15} className="text-accent" />, title: '价格偏低，可以入手', text: '当前价低于历史中位数，是个不错的入手时机。' }
        : pct <= 70
          ? { cls: 'border-line2 bg-bg2/50', icon: <Hourglass size={15} className="text-t3" />, title: '价格中等，不急可以再等等', text: '当前价处于历史中游，等促销可能更划算。' }
          : { cls: 'border-warn/30 bg-warn/10', icon: <Hourglass size={15} className="text-warn" />, title: '当前偏贵，建议再等等', text: '当前价处于历史高位，等打折会更省。' }
  return (
    <div className={`mt-3 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${tone.cls}`}>
      <span className="mt-0.5 shrink-0">{tone.icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-t1">{tone.title}</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-t3">
          {tone.text} 当前价处于历史 <span className="text-t2">{pct}%</span> 分位（越低越划算）
          {gap > 0 ? `，距本机史低还差 ${formatMoney(gap)}` : '，已是本机采样最低价'}。
        </p>
      </div>
    </div>
  )
}
