import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { usePersistedState } from '@/hooks/usePersistedState'
import { ExternalLink, GitCompareArrows, Library, Search, Tag, Trophy, X } from 'lucide-react'
import { Badge, Button, Card, EmptyState, GameCover, ProgressBar, Select } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { LibraryValueCard } from '@/components/shared/LibraryValueCard'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { bridge } from '@/services/bridge'
import type { OwnedGame } from '@/types/steam'
import { formatHours, formatMinutes, formatPercent, formatRelative } from '@/utils/format'

type SortKey = 'playtime' | 'recent' | 'name' | 'completion' | 'rating'
type FilterKey = 'all' | 'played' | 'unplayed' | 'achievements' | 'perfect' | 'dusty'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'playtime', label: '游玩时长最长' },
  { value: 'recent', label: '最近玩过优先' },
  { value: 'name', label: '按名称排序' },
  { value: 'completion', label: '成就完成度最高' },
  { value: 'rating', label: '好评率最高' }
]

interface FilterDef {
  key: FilterKey
  label: string
  hint: string
  test: (g: OwnedGame) => boolean
}

const FILTERS: FilterDef[] = [
  { key: 'all', label: '全部', hint: '游戏库里的全部游戏', test: () => true },
  { key: 'played', label: '玩过', hint: '游玩时长大于 0 分钟', test: (g) => g.playtimeForeverMin > 0 },
  { key: 'unplayed', label: '还没玩', hint: '时长 0 分钟（买回来还没开过）', test: (g) => g.playtimeForeverMin === 0 },
  { key: 'achievements', label: '有成就', hint: '这款游戏带成就系统', test: (g) => g.achievementsTotal > 0 },
  {
    key: 'perfect',
    label: '已全成就',
    hint: '成就全部解锁',
    test: (g) => g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal
  },
  {
    key: 'dusty',
    label: '吃灰中',
    hint: '买过也玩过，但超过 90 天没再打开',
    // 严格定义「吃灰」：曾经玩过（时长 > 0），且最后游玩距今超过 90 天。
    // 没玩过的（unplayed）不算吃灰，那是「没拆封」不是「吃灰」。
    test: (g) =>
      g.playtimeForeverMin > 0 &&
      (g.lastPlayedAt ?? 0) > 0 &&
      Date.now() / 1000 - (g.lastPlayedAt ?? 0) > 90 * 86400
  }
]

/** 成就完成度 0–1；没有成就系统的返回 -1，排序时自然沉底。 */
function completion(g: OwnedGame): number {
  return g.achievementsTotal > 0 ? g.achievementsUnlocked / g.achievementsTotal : -1
}

function sortGames(list: OwnedGame[], key: SortKey): OwnedGame[] {
  const out = [...list]
  switch (key) {
    case 'recent':
      return out.sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
    case 'name':
      return out.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    case 'completion':
      return out.sort((a, b) => completion(b) - completion(a))
    case 'rating':
      return out.sort((a, b) => b.reviewPercent - a.reviewPercent)
    default:
      return out.sort((a, b) => b.playtimeForeverMin - a.playtimeForeverMin)
  }
}

/** 本地搜索：游戏名 / 开发商 / 发行商 / 标签，任一命中即可。 */
function matches(g: OwnedGame, q: string): boolean {
  if (!q) return true
  return [g.name, g.developer, g.publisher, ...g.tags].some((s) => s.toLowerCase().includes(q))
}

/**
 * 按出现频次取 TOP N 的取值（类型 / 标签通用）。
 *
 * 为什么取频次而不是全量：游戏库的类型有几十种、标签上百种，
 * 全铺出来会变成一面按钮墙，「筛选」反而更难用了。
 * 频率高的本来也最可能就是用户想找的那几个。
 */
function topValues(lists: string[][], limit: number): string[] {
  const counter = new Map<string, number>()
  for (const list of lists) for (const v of list) counter.set(v, (counter.get(v) ?? 0) + 1)
  return [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN')).slice(0, limit).map(([v]) => v)
}

function LibraryCard({ game, onOpen }: { game: OwnedGame; onOpen: () => void }) {
  const done = completion(game)
  const storeUrl = `https://store.steampowered.com/app/${game.appId}/`
  return (
    <Card padding="none" hover className="overflow-hidden">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative">
          <GameCover src={game.headerImage} name={game.name} className="aspect-[460/215] w-full" rounded="rounded-none" />
          {game.isHistoricalLow ? (
            <span className="absolute left-2 top-2 rounded-pill bg-warn/85 px-2 py-0.5 text-[10.5px] font-medium text-white">
              历史最低价
            </span>
          ) : null}
        </div>
        <div className="space-y-2 px-3 pt-2.5">
          <p className="truncate text-sm font-medium text-t1" title={game.name}>
            {game.name}
          </p>
          <div className="flex items-center gap-1.5 text-[11.5px] text-t3">
            <span>{formatMinutes(game.playtimeForeverMin)}</span>
            <span className="text-line3">·</span>
            <span>{formatRelative(game.lastPlayedAt)}</span>
          </div>
          {game.achievementsTotal > 0 ? (
            <div>
              <div className="flex items-center justify-between text-[11px] text-t3">
                <span className="inline-flex items-center gap-1">
                  <Trophy size={11} />
                  {game.achievementsUnlocked} / {game.achievementsTotal}
                </span>
                <span>{formatPercent(done * 100, 0)}</span>
              </div>
              <ProgressBar value={done * 100} tone={done >= 1 ? 'ok' : 'accent'} height={5} className="mt-1" label={`《${game.name}》成就完成 ${Math.round(done * 100)}%`} />
            </div>
          ) : (
            <p className="text-[11px] text-t3">这款游戏没有成就系统</p>
          )}
        </div>
      </button>
      <div className="flex items-center justify-between px-3 pb-3 pt-2">
        <span className="truncate text-[11px] text-t3">{game.reviewPercent > 0 ? `好评率 ${game.reviewPercent}%` : '好评率未知'}</span>
        <button
          type="button"
          onClick={() => void bridge.app.openExternal(storeUrl)}
          title="在 Steam 商店中打开"
          className="inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[11px] text-t3 transition-colors hover:bg-bg3 hover:text-accent"
        >
          <ExternalLink size={12} />
          商店
        </button>
      </div>
    </Card>
  )
}

export default function LibraryPage() {
  const snapshot = useDataStore((s) => s.snapshot)
  const navigate = useAppStore((s) => s.navigate)
  // O-5：排序 / 筛选 / 搜索词全部跨会话记住。半年里每天重选一次等于白交一笔税，
  // 而这些都是纯视觉偏好，落在 localStorage 里既不需要 IPC，也不会被导出的数据包带走。
  const [sort, setSort] = usePersistedState<SortKey>('library.sort', 'playtime')
  const [filter, setFilter] = usePersistedState<FilterKey>('library.filter', 'all')
  const [query, setQuery] = usePersistedState('library.query', '')
  const [genre, setGenre] = usePersistedState('library.genre', '全部')
  const [tag, setTag] = usePersistedState('library.tag', '全部')

  const games = snapshot?.games ?? []

  // 类型走下拉、标签走按钮：类型取值少（十几个）适合下拉，标签多且用户更常按标签找东西
  const genreOptions = useMemo(
    () => [{ value: '全部', label: '全部类型' }, ...topValues(games.map((g) => g.genres), 24).map((v) => ({ value: v, label: v }))],
    [games]
  )
  const tagOptions = useMemo(() => ['全部', ...topValues(games.map((g) => g.tags), 10)], [games])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const def = FILTERS.find((f) => f.key === filter) ?? FILTERS[0]
    return sortGames(
      games.filter(
        (g) =>
          def.test(g) &&
          matches(g, q) &&
          (genre === '全部' || g.genres.includes(genre)) &&
          (tag === '全部' || g.tags.includes(tag))
      ),
      sort
    )
  }, [games, filter, query, sort, genre, tag])

  const stats = useMemo(() => {
    const totalMin = games.reduce((a, g) => a + g.playtimeForeverMin, 0)
    const nowSec = Date.now() / 1000
    return {
      totalMin,
      played: games.filter((g) => g.playtimeForeverMin > 0).length,
      withAch: games.filter((g) => g.achievementsTotal > 0).length,
      perfect: games.filter((g) => g.achievementsTotal > 0 && g.achievementsUnlocked >= g.achievementsTotal).length,
      // V4/F3：「吃灰」= 玩过且超过 90 天没碰。与筛选同一个判定，避免两处口径漂移。
      dusty: games.filter((g) => g.playtimeForeverMin > 0 && (g.lastPlayedAt ?? 0) > 0 && nowSec - (g.lastPlayedAt ?? 0) > 90 * 86400).length
    }
  }, [games])

  // V4/O1：库列表虚拟化。大库（数百~上千款）下一次性渲染全部卡片会卡，
  // 改成按行虚拟渲染 —— 只渲染视口附近若干行。列数随容器宽度自适应（与 sm/lg/xl 断点一致）。
  const gridRef = useRef<HTMLDivElement>(null)
  const [colCount, setColCount] = useState(4)
  const [scrollMargin, setScrollMargin] = useState(0)
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    setScrollMargin(el.offsetTop)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width
      // sm=640 lg=1024 xl=1280 与原本的断点对齐，避免虚拟化后列数和布局不一致
      setColCount(w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rowCount = Math.max(1, Math.ceil(items.length / colCount))
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    // 本应用的滚动容器是布局里的 <main>（不是 window），虚拟化要相对它来算
    getScrollElement: () => document.querySelector('main[aria-label="主内容区"]'),
    estimateSize: () => 260,
    overscan: 5,
    scrollMargin
  })

  const hasExtraFilter = genre !== '全部' || tag !== '全部'
  const resetAll = (): void => {
    setQuery('')
    setFilter('all')
    setGenre('全部')
    setTag('全部')
  }

  if (!snapshot) return null

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Library size={19} />}
        title="游戏库"
        subtitle="本地数据库里的全部游戏。可以按名称 / 开发商搜索，按玩过与否、有无成就筛选，再按类型 / 标签收窄，最后按时长、最近游玩、成就完成度或好评率排序；点卡片进入单游戏分析。"
        action={
          <>
            <Badge tone="accent">{games.length} 款游戏</Badge>
            <Badge tone="neutral">总时长 {formatHours(stats.totalMin)}</Badge>
            <Button size="sm" variant="secondary" icon={<GitCompareArrows size={14} />} onClick={() => navigate('compare')}>
              游戏对比
            </Button>
            <Select value={sort} options={SORT_OPTIONS} onChange={(v) => setSort(v as SortKey)} />
          </>
        }
      />

      <LibraryValueCard games={games} onOpenGame={(appId) => navigate('game', { appId, from: 'library' })} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索游戏名 / 开发商 / 标签"
            aria-label="搜索游戏"
            className="h-9 w-[270px] rounded-pill border border-line bg-bg2/55 pl-9 pr-8 text-[13px] text-t1 transition-colors placeholder:text-t3 hover:border-line2 focus:border-line3 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清空搜索"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-t3 transition-colors hover:text-t1"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              title={f.hint}
              className={[
                'flex items-center gap-2 rounded-pill border px-4 py-2 text-[13px] transition-all duration-200',
                active
                  ? 'border-line3 bg-accent3/18 text-t1 shadow-[0_0_0_1px_var(--si-line-2)]'
                  : 'border-line bg-bg2/55 text-t2 hover:border-line2 hover:text-t1'
              ].join(' ')}
            >
              {f.label}
              <span className={`text-[11px] ${active ? 'text-accent' : 'text-t3'}`}>{games.filter(f.test).length}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg2/45 px-3 py-2.5">
        <div className="w-[188px]">
          <Select value={genre} options={genreOptions} onChange={setGenre} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag size={13} className="text-t3" />
          {tagOptions.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={[
                'rounded-pill border px-3 py-1 text-[12px] transition-colors',
                tag === t ? 'border-line3 bg-accent3/18 text-t1' : 'border-line bg-bg2/50 text-t2 hover:border-line2 hover:text-t1'
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
        {hasExtraFilter || filter !== 'all' || query ? (
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto rounded-pill border border-line px-3 py-1 text-[11.5px] text-t3 transition-colors hover:border-line2 hover:text-t1"
          >
            清除筛选
          </button>
        ) : null}
      </div>

      <p className="text-[12px] text-t3">
        显示 <span className="text-t2">{items.length}</span> / {games.length} 款
        {hasExtraFilter ? ` · 已按${genre !== '全部' ? `类型「${genre}」` : ''}${genre !== '全部' && tag !== '全部' ? ' + ' : ''}${tag !== '全部' ? `标签「${tag}」` : ''}收窄` : ''}
        {stats.played > 0 ? ` · 已玩过 ${stats.played} 款` : ''}
        {stats.withAch > 0 ? ` · 带成就 ${stats.withAch} 款` : ''}
        {stats.perfect > 0 ? ` · 已全成就 ${stats.perfect} 款` : ''}
        {stats.dusty > 0 ? ` · 吃灰 ${stats.dusty} 款` : ''}
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={<Search size={26} />}
          title="没有符合条件的游戏"
          description={query ? `没有名称、开发商或标签包含「${query}」的游戏。` : '换一个筛选条件试试。'}
          action={
            <button
              type="button"
              onClick={resetAll}
              className="rounded-pill border border-line bg-bg2/55 px-4 py-2 text-[13px] text-t2 transition-colors hover:border-line2 hover:text-t1"
            >
              清除筛选
            </button>
          }
        />
      ) : (
        // V4/O1：虚拟滚动。gridRef 是列表容器，行绝对定位在其内；
        // 列表顶部到滚动容器(<main>)的距离用 scrollMargin 对齐，否则首屏会错位。
        <div ref={gridRef} className="relative" style={{ height: rowVirtualizer.getTotalSize() }}>
          {rowVirtualizer.getVirtualItems().map((vi) => {
            const start = vi.index * colCount
            const rowItems = items.slice(start, start + colCount)
            return (
              <div
                key={vi.key}
                data-index={vi.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 top-0 grid w-full gap-4"
                style={{
                  transform: `translateY(${vi.start - scrollMargin}px)`,
                  gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`
                }}
              >
                {rowItems.map((g) => (
                  <LibraryCard key={g.appId} game={g} onOpen={() => navigate('game', { appId: g.appId, from: 'library' })} />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
