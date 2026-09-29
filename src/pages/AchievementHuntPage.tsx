import { useMemo, useState } from 'react'
import { BadgeCheck, Crosshair, Info, Sparkles, Star, Target, Trophy } from 'lucide-react'
import { Badge, Button, Card, EmptyState, GameCover, ProgressBar, SectionHeader, Select, StatCard, Tooltip } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { pickKey, useDataStore } from '@/store/useDataStore'
import { useAppStore } from '@/store/useAppStore'
import { bridge } from '@/services/bridge'
import { formatPercent, rarityLabel } from '@/utils/format'
import { usePersistedState } from '@/hooks/usePersistedState'

type SortKey = 'remaining' | 'percent' | 'global'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'remaining', label: '剩余最少优先' },
  { value: 'percent', label: '完成度最高优先' },
  { value: 'global', label: '最容易解锁优先' }
]

interface HuntGroup {
  appId: number
  gameName: string
  headerImage: string
  total: number
  unlocked: number
  remainingRare: number
  percent: number
  items: Array<{ appId: number; apiName: string; displayName: string; description: string; globalPercent: number; hidden: boolean }>
}

/**
 * 稀有成就追猎清单：把「稀有（全球解锁率 < 10%）**且尚未解锁**」的成就做成一份待办清单。
 *
 * 为什么值得单独一页：成就中心回答的是「我还差多少」，这一页回答的是「下一步先做哪一个」。
 * 数据全在本地 achievements 表里（isRare 由 achievement-sync.ts 判定），不额外请求任何接口。
 */
export default function AchievementHuntPage() {
  const snapshot = useDataStore((s) => s.snapshot)
  const derived = useDataStore((s) => s.derived)
  const applyPick = useDataStore((s) => s.applyPick)
  const navigate = useAppStore((s) => s.navigate)
  // O-5：排序与「只看我挑的」跨会话记住。`expanded` 刻意不持久化 ——
  // 展开的是「此刻正在看」的分组，下次进来还摊开着只会让页面变长。
  const [sort, setSort] = usePersistedState<SortKey>('hunt.sort', 'remaining')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  /** 只看我自己挑进清单的成就（N2 新表项：hunt_picks）。 */
  const [picksOnly, setPicksOnly] = usePersistedState('hunt.picksOnly', false)

  const games = snapshot?.games ?? []
  const achievements = derived?.achievements ?? []
  const pickIndex = derived?.pickIndex ?? new Set<string>()

  const groups = useMemo<HuntGroup[]>(() => {
    const index = new Map(games.map((g) => [g.appId, g]))
    const byApp = new Map<number, HuntGroup['items']>()
    for (const a of achievements) {
      // 本页的基础集合始终是「稀有且尚未解锁」。星标是**在其中的**优先级标记，不改变入选规则 ——
      // 否则「挑一个不稀有的成就」会让页面出现一个不属于追猎范畴的条目，口径就乱了。
      if (!a.isRare || a.unlocked) continue
      if (picksOnly && !pickIndex.has(pickKey(a.appId, a.apiName))) continue
      const list = byApp.get(a.appId)
      const item = {
        appId: a.appId,
        apiName: a.apiName,
        displayName: a.displayName,
        description: a.description,
        globalPercent: a.globalPercent,
        hidden: a.hidden
      }
      if (list) list.push(item)
      else byApp.set(a.appId, [item])
    }

    const rows: HuntGroup[] = []
    for (const [appId, items] of byApp) {
      const g = index.get(appId)
      if (!g) continue
      rows.push({
        appId,
        gameName: g.name,
        headerImage: g.headerImage,
        total: g.achievementsTotal,
        unlocked: g.achievementsUnlocked,
        remainingRare: items.length,
        percent: g.achievementsTotal > 0 ? (g.achievementsUnlocked / g.achievementsTotal) * 100 : 0,
        // 全球解锁率高的先做，性价比最高
        items: items.sort((a, b) => b.globalPercent - a.globalPercent)
      })
    }

    switch (sort) {
      case 'percent':
        return rows.sort((a, b) => b.percent - a.percent || a.remainingRare - b.remainingRare)
      case 'global':
        return rows.sort((a, b) => (b.items[0]?.globalPercent ?? 0) - (a.items[0]?.globalPercent ?? 0))
      default:
        return rows.sort((a, b) => a.remainingRare - b.remainingRare || b.percent - a.percent)
    }
  }, [games, achievements, sort, picksOnly, pickIndex])

  const stats = useMemo(() => {
    const totalRare = groups.reduce((acc, g) => acc + g.remainingRare, 0)
    const easiest = groups.flatMap((g) => g.items).sort((a, b) => b.globalPercent - a.globalPercent)[0] ?? null
    const easiestGame = easiest ? groups.find((g) => g.appId === easiest.appId)?.gameName ?? '' : ''
    const unlockedRare = derived?.achievement.rareUnlocked ?? 0
    // 星标数直接按「集合 ∩ 清单」算，不看当前筛选条件 ——
    // 否则开着「只看我的」时它恒等于列表长度，关掉筛选又会跳，读数没有独立含义。
    const pickedCount = achievements.filter(
      (a) => a.isRare && !a.unlocked && pickIndex.has(pickKey(a.appId, a.apiName))
    ).length
    return { totalRare, games: groups.length, easiest, easiestGame, unlockedRare, pickedCount }
  }, [groups, derived, pickIndex, achievements])

  /** 把某个成就加入 / 移出手动追猎清单。写库在主进程，成功后只就地更新内存。 */
  const star = async (appId: number, apiName: string): Promise<void> => {
    const next = !pickIndex.has(pickKey(appId, apiName))
    const res = await bridge.hunt.toggle({ appId, apiName, picked: next })
    applyPick(res.picked, appId, apiName)
  }

  const toggle = (appId: number): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(appId)) next.delete(appId)
      else next.add(appId)
      return next
    })
  }

  if (!snapshot) return null

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Crosshair size={19} />}
        title="成就追猎"
        subtitle="稀有（全球解锁率低于 10%）且尚未解锁的成就清单。可以给任意一个打星、只看自己挑的那些；数据全部来自本地 achievements 表，不会额外请求成就接口。"
        action={
          <>
            <button
              type="button"
              onClick={() => setPicksOnly((v) => !v)}
              title={picksOnly ? '显示全部待追猎成就' : '只看我星标过的成就'}
              className={[
                'flex items-center gap-2 rounded-pill border px-4 py-2 text-[13px] transition-all duration-200',
                picksOnly
                  ? 'border-line3 bg-accent3/18 text-t1 shadow-[0_0_0_1px_var(--si-line-2)]'
                  : 'border-line bg-bg2/55 text-t2 hover:border-line2 hover:text-t1'
              ].join(' ')}
            >
              <Star size={13} className={picksOnly ? 'text-accent' : 'text-t3'} fill={picksOnly ? 'currentColor' : 'none'} />
              只看我的追猎清单
              <span className={`text-[11px] ${picksOnly ? 'text-accent' : 'text-t3'}`}>{stats.pickedCount}</span>
            </button>
            <Select value={sort} options={SORT_OPTIONS} onChange={(v) => setSort(v as SortKey)} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Target size={18} />} label="待追猎稀有成就" value={stats.totalRare} unit="个" hint={`分布在 ${stats.games} 款游戏`} />
        <StatCard icon={<Star size={18} />} label="已到手稀有成就" value={stats.unlockedRare} unit="个" hint="全球解锁率低于 10% 且已解锁" />
        <StatCard
          icon={<Sparkles size={18} />}
          label="最容易的下一步"
          value={stats.easiest ? formatPercent(stats.easiest.globalPercent, 1) : '—'}
          hint={stats.easiest ? stats.easiest.displayName : '暂无稀有成就数据'}
        />
        <StatCard
          icon={<BadgeCheck size={18} />}
          label="最接近的一款"
          value={groups[0] ? `${groups[0].remainingRare}` : '—'}
          unit={groups[0] ? '个' : undefined}
          hint={groups[0] ? groups[0].gameName : '暂无'}
        />
      </div>

      {groups.length === 0 ? (
        <Card padding="md">
          {picksOnly && stats.pickedCount === 0 ? (
            // 空是因为筛了「只看我的」，不是真的没有待追猎项 —— 文案要指向正确的下一步，
            // 否则用户会以为数据没同步好，跑去重新同步一遍。
            <EmptyState
              icon={<Star size={26} />}
              title="我的追猎清单还是空的"
              description="在下面任意一条稀有成就前点一下星标，就会加进这份清单。清单存在本机，跟着数据包一起走。"
              action={
                <Button size="sm" onClick={() => setPicksOnly(false)}>
                  显示全部待追猎成就
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Trophy size={26} />}
              title="没有待追猎的稀有成就"
              description="可能是还没同步成就数据，或者你把当前库里的稀有成就都拿到了。完成一次同步后再回来看看。"
              action={
                <Button size="sm" onClick={() => navigate('achievements')}>
                  去成就中心
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const open = expanded.has(g.appId)
            const shown = open ? g.items : g.items.slice(0, 3)
            return (
              <Card key={g.appId} padding="md">
                <div className="flex flex-wrap items-center gap-3">
                  <GameCover src={g.headerImage} name={g.gameName} className="h-11 w-[78px] shrink-0" rounded="rounded-md" />
                  <button
                    type="button"
                    onClick={() => navigate('game', { appId: g.appId, from: 'hunt' })}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[13.5px] font-medium text-t1 hover:text-accent" title={g.gameName}>
                      {g.gameName}
                    </p>
                    <p className="text-[11px] text-t3">
                      还差 {g.remainingRare} 个稀有成就 · 整体进度 {g.unlocked}/{g.total}
                    </p>
                  </button>
                  <span className="shrink-0 text-[12.5px] font-medium text-accent">{formatPercent(g.percent, 0)}</span>
                  {g.items.length > 3 ? (
                    <Button size="sm" variant="ghost" onClick={() => toggle(g.appId)}>
                      {open ? '收起' : `展开全部 ${g.items.length} 个`}
                    </Button>
                  ) : null}
                </div>

                <div className="mt-2.5">
                  <ProgressBar value={g.percent} tone={g.percent >= 90 ? 'ok' : 'accent'} height={5} label={`《${g.gameName}》成就完成 ${Math.round(g.percent)}%`} />
                </div>

                <div className="mt-3 space-y-1.5">
                  {shown.map((a) => {
                    const r = rarityLabel(a.globalPercent)
                    const starred = pickIndex.has(pickKey(a.appId, a.apiName))
                    return (
                      <div key={a.apiName} className="flex items-center gap-3 rounded-lg border border-line bg-bg1/45 px-3 py-2">
                        <Tooltip label={starred ? '移出我的追猎清单' : '加入我的追猎清单（存在本机，不会丢）'}>
                          <button
                            type="button"
                            onClick={() => void star(a.appId, a.apiName)}
                            aria-label={starred ? '移出追猎清单' : '加入追猎清单'}
                            aria-pressed={starred}
                            className={`shrink-0 transition-colors ${starred ? 'text-accent' : 'text-t3 hover:text-t2'}`}
                          >
                            <Star size={14} fill={starred ? 'currentColor' : 'none'} />
                          </button>
                        </Tooltip>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] text-t1">{a.displayName || '（隐藏成就）'}</p>
                          {a.description ? <p className="truncate text-[11px] text-t3">{a.description}</p> : null}
                        </div>
                        <Badge tone={r.tone} size="xs">
                          {r.label}
                        </Badge>
                        {/* globalPercent 为 0 表示 Steam 没给该成就的全球占比（未知），不是「0% 玩家拥有」 */}
                        <span className="w-14 shrink-0 text-right text-[11.5px] text-accent">
                          {a.globalPercent > 0 ? formatPercent(a.globalPercent, 1) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card padding="md">
        <SectionHeader title="口径说明" icon={<Info size={15} />} />
        <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-t3">
          <li>· 入选条件：<span className="text-t2">全球解锁率 &gt; 0 且 &lt; 10%</span>，并且你尚未解锁。</li>
          <li>· 「全球解锁率」为 0 表示 Steam 没有提供该成就的占比（未知），不是「没人拿到」——这类成就不计入追猎清单。</li>
          <li>· 排序默认「剩余最少优先」：同一款游戏里还剩几个稀有成就，先集中拿完收益最高。</li>
          <li>
            · 星标是<span className="text-t2">在本页范围内的</span>优先级标记，不是新的入选条件：只在「稀有且未解锁」里挑，挑中的那几条才会出现在「我的追猎清单」。
            清单存在本机 <code className="text-t2">hunt_picks</code> 表，不会被同步覆盖，导出数据包时一并带走。
          </li>
          <li>· 星标过的成就一旦解锁，就会自动从本页移出（它已不再是「未解锁」），对应清单条目也会一并失效。</li>
          <li>
            ·
            <Tooltip label="提醒基于上一次同步的快照，只在同步结束后判定">
              <span className="ml-1 text-t2">「稀有成就追猎」提醒每天最多弹一次</span>
            </Tooltip>
            可在「设置 → 通知」里关闭。
          </li>
        </ul>
      </Card>
    </div>
  )
}
