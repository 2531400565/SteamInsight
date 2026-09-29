import { useMemo } from 'react'
import { Award, BadgeCheck, Crown, Search, Star, Target, Trophy } from 'lucide-react'
import { Badge, Button, Card, EmptyState, GameCover, ProgressBar, SectionHeader, StatCard } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { AchievementTile } from '@/components/shared/AchievementTile'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { almostDone, rarestUnlocked, recentUnlocks } from '@/utils/analytics'
import { formatPercent } from '@/utils/format'
import { usePersistedState } from '@/hooks/usePersistedState'

const RECENT_LIMIT = 30
const ALMOST_LIMIT = 8
const RAREST_LIMIT = 9

export default function AchievementsPage() {
  const snapshot = useDataStore((s) => s.snapshot)
  const derived = useDataStore((s) => s.derived)
  const navigate = useAppStore((s) => s.navigate)
  // O-5：搜索词与「显示未解锁」跨会话记住（这是两个每次进来都要重设的开关）
  const [query, setQuery] = usePersistedState('achievements.query', '')
  const [showLocked, setShowLocked] = usePersistedState('achievements.showLocked', true)

  const games = snapshot?.games ?? []
  // 成就读 derived 展开后的那一份（快照里是紧凑形态：图标只带文件名）
  const achievements = derived?.achievements ?? []

  const summary = derived?.achievement
  const almost = useMemo(() => almostDone(games, achievements, ALMOST_LIMIT), [games, achievements])
  const recent = useMemo(() => recentUnlocks(achievements, games, RECENT_LIMIT), [achievements, games])
  // N1-3：已经拿到手的稀有成就。追猎页看的是「还没拿到的」，这一张看的是「已经拿到的」。
  const rarest = useMemo(() => rarestUnlocked(achievements, games, RAREST_LIMIT), [achievements, games])

  const keyword = query.trim().toLowerCase()
  const matchGame = (name: string): boolean => (keyword ? name.toLowerCase().includes(keyword) : true)

  const filteredAlmost = almost.filter((g) => matchGame(g.gameName))
  const filteredRecent = recent.filter((a) => matchGame(a.gameName) || a.displayName.toLowerCase().includes(keyword))
  const filteredRarest = rarest.filter((a) => matchGame(a.gameName) || a.displayName.toLowerCase().includes(keyword))

  const lockedPreview = useMemo(() => {
    if (!showLocked) return []
    return achievements
      .filter((a) => !a.unlocked)
      .sort((a, b) => b.globalPercent - a.globalPercent)
      .slice(0, 8)
      .map((a) => ({ ...a, gameName: games.find((g) => g.appId === a.appId)?.name ?? '' }))
  }, [achievements, games, showLocked])

  if (!snapshot || !summary) return null

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Trophy size={19} />}
        title="成就中心"
        subtitle={`覆盖 ${summary.trackedGames} 款有成就系统的游戏。完成率与稀有度统计全部由本地 SQLite 聚合，不额外请求成就接口。`}
        action={
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索游戏或成就名…"
              className="w-[228px] rounded-pill border border-line bg-bg2/70 py-2 pl-9 pr-3 text-[13px] text-t1 outline-none transition-colors placeholder:text-t3 focus:border-line3"
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Trophy size={18} />} label="总成就数量" value={summary.total} unit="个" hint={`来自 ${summary.trackedGames} 款游戏`} />
        <StatCard icon={<BadgeCheck size={18} />} label="已完成数量" value={summary.unlocked} unit="个" hint={`完美通关 ${summary.perfectGames} 款`} />
        <StatCard
          icon={<Target size={18} />}
          label="总完成率"
          value={formatPercent(summary.percent, 1)}
          hint="按全部已拥有游戏口径计算"
        />
        <StatCard icon={<Star size={18} />} label="稀有成就" value={summary.rareUnlocked} unit="个" hint="全球解锁率低于 10%" />
      </div>

      <Card padding="md">
        <SectionHeader
          title="即将完成"
          subtitle="距离满成就最近的游戏，优先推进收益最高"
          icon={<Target size={15} />}
          action={
            <Badge tone="accent" size="xs">
              共 {filteredAlmost.length} 款
            </Badge>
          }
        />
        {filteredAlmost.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Award size={24} />}
              title={keyword ? '没有匹配的游戏' : '暂时没有接近满成就的游戏'}
              description={keyword ? '试试其它关键词。' : '继续游玩，进度过 60% 的游戏会自动出现在这里。'}
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {filteredAlmost.map((group) => (
              <div key={group.appId} className="rounded-xl border border-line bg-bg1/45 p-3">
                <div className="flex items-center gap-3">
                  <GameCover src={group.headerImage} name={group.gameName} className="h-10 w-[74px] shrink-0" rounded="rounded-md" />
                  <button
                    type="button"
                    onClick={() => navigate('game', { appId: group.appId, from: 'achievements' })}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[13px] font-medium text-t1 hover:text-accent" title={group.gameName}>
                      {group.gameName}
                    </p>
                    <p className="text-[11px] text-t3">
                      还差 {group.remaining} 个 · 已完成 {group.unlocked}/{group.total}
                    </p>
                  </button>
                  <span className="shrink-0 text-[12.5px] font-medium text-accent">{formatPercent(group.percent, 0)}</span>
                </div>
                <div className="mt-2.5">
                  <ProgressBar value={group.percent} tone={group.percent >= 90 ? 'ok' : 'accent'} height={5} label={`《${group.gameName}》成就完成 ${Math.round(group.percent)}%`} />
                </div>
                {group.nextUp.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {group.nextUp.map((a) => (
                      <Badge key={a.apiName} tone="neutral" size="xs">
                        待解锁：{a.displayName}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* N1-3：已经拿到手的稀有成就。追猎页看的是「还没拿到的」，这一张看的是「已经拿到的」。 */}
      <Card padding="md">
        <SectionHeader
          title="我拿到的最稀有成就"
          subtitle="按全球解锁率升序 —— 越靠前，全球拿到它的玩家越少"
          icon={<Crown size={15} />}
          action={
            <Badge tone="accent" size="xs">
              TOP {filteredRarest.length}
            </Badge>
          }
        />
        <div className="mt-3">
          {filteredRarest.length === 0 ? (
            <EmptyState
              icon={<Crown size={24} />}
              title={keyword ? '没有匹配的成就' : '还没有可排行的稀有成就'}
              description={
                keyword
                  ? '试试其它关键词。'
                  : '这张榜只统计「已解锁、且 Steam 给出了全球解锁率」的成就。完成一次同步后会按稀有度从高到低排列。'
              }
            />
          ) : (
            <div className="grid gap-2.5 xl:grid-cols-3">
              {filteredRarest.map((a, index) => (
                <div key={`${a.appId}-${a.apiName}`} className="relative">
                  <span className="absolute -left-1 -top-1 z-10 flex size-5 items-center justify-center rounded-pill border border-line bg-bg2 text-[10.5px] font-semibold text-accent">
                    {index + 1}
                  </span>
                  <AchievementTile
                    achievement={a}
                    gameName={a.gameName}
                    gameHeader={a.gameHeader}
                    onOpenGame={(appId) => navigate('game', { appId, from: 'achievements' })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {filteredRarest.length > 0 ? (
          <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-t3">
            全球解锁率来自 Steam 的成就元数据（<span className="text-t2">全球占比</span>），只在成就中心与追猎页使用；
            Steam 没有返回该字段的成就不参与排行（显示为「全球占比未知」），不会被误当成 0%。
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card padding="md">
          <SectionHeader
            title="最近解锁"
            subtitle="按解锁时间倒序，最多展示 30 条"
            icon={<BadgeCheck size={15} />}
            action={
              <Badge tone="neutral" size="xs">
                {filteredRecent.length} 条
              </Badge>
            }
          />
          <div className="mt-3 space-y-2">
            {filteredRecent.length === 0 ? (
              <EmptyState title="还没有解锁记录" description="完成一次同步后会按时间倒序显示。" />
            ) : (
              filteredRecent.map((a) => (
                <AchievementTile
                  key={`${a.appId}-${a.apiName}`}
                  achievement={a}
                  gameName={a.gameName}
                  gameHeader={a.gameHeader}
                  onOpenGame={(appId) => navigate('game', { appId, from: 'achievements' })}
                />
              ))
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card padding="md">
            <SectionHeader
              title="待解锁成就"
              subtitle="全球解锁率最高的先做，性价比最高"
              icon={<Award size={15} />}
              action={
                <Button size="sm" variant="ghost" onClick={() => setShowLocked((v) => !v)}>
                  {showLocked ? '收起' : '展开'}
                </Button>
              }
            />
            <div className="mt-3 space-y-2">
              {lockedPreview.length === 0 ? (
                <p className="text-[12px] text-t3">{showLocked ? '暂无未解锁成就数据。' : '已收起。'}</p>
              ) : (
                lockedPreview.map((a) => (
                  <div key={`${a.appId}-${a.apiName}`} className="flex items-center gap-3 rounded-lg border border-line bg-bg1/45 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] text-t1">{a.displayName}</p>
                      <p className="truncate text-[11px] text-t3">{a.gameName}</p>
                    </div>
                    {/* globalPercent 为 0 表示 Steam 没给该成就的全球占比（未知），不是「0% 玩家拥有」 */}
                    <span className="shrink-0 text-[11.5px] text-accent">
                      {a.globalPercent > 0 ? formatPercent(a.globalPercent, 1) : '—'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card padding="md">
            <SectionHeader title="口径说明" icon={<Target size={15} />} />
            <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-t3">
              <li>· 「总成就数量」是全部已拥有游戏成就数之和；「已完成数量」是有成就系统游戏的已解锁数之和。</li>
              <li>· 稀有成就 = 全球解锁率低于 10% 且已被你解锁的成就。</li>
              <li>· 部分游戏（尤其是新上架或未开放成就的游戏）在 Steam 侧没有成就数据，不计入分母。</li>
              <li>· 解锁时间是 Steam 返回的历史时间戳，不是本软件的采样时间。</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
