import { useMemo, type ReactNode } from 'react'
import { BadgePercent, ExternalLink, Gift, Info, Library, Star, Store, Tag, Timer } from 'lucide-react'
import { Badge, Card, EmptyState, SectionHeader, Select } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { DiscountCard } from '@/components/shared/DiscountCard'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { bridge } from '@/services/bridge'
import type { DiscountCategory, DiscountItem, OwnedGame } from '@/types/steam'
import { DISCOUNT_TABS } from '@/utils/constants'
import { formatMoney } from '@/utils/format'
import { usePersistedState } from '@/hooks/usePersistedState'

type SortKey = 'discount' | 'price' | 'rating' | 'ending'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'discount', label: '折扣力度最大' },
  { value: 'price', label: '现价从低到高' },
  { value: 'rating', label: '好评率最高' },
  { value: 'ending', label: '即将结束优先' }
]

function sortItems(items: DiscountItem[], key: SortKey): DiscountItem[] {
  const list = [...items]
  switch (key) {
    case 'price':
      return list.sort((a, b) => a.finalPriceCents - b.finalPriceCents)
    case 'rating':
      return list.sort((a, b) => b.reviewPercent - a.reviewPercent)
    case 'ending':
      return list.sort((a, b) => (a.endsAt ?? Number.MAX_SAFE_INTEGER) - (b.endsAt ?? Number.MAX_SAFE_INTEGER))
    default:
      return list.sort((a, b) => b.discountPercent - a.discountPercent)
  }
}

/**
 * 「史低专区 / 高评分折扣 / 限时免费」不是独立抓取的条目，而是从同一批折扣里按维度筛出来的。
 * 早前直接用 category === tab 过滤，而同步只写 'hot' / 'free' 两种 category，
 * 于是这三个 Tab 恒定显示 0 条。
 */
function filterByTab(items: DiscountItem[], tab: DiscountCategory): DiscountItem[] {
  switch (tab) {
    case 'lowest':
      return items.filter((d) => d.isHistoricalLow)
    case 'toprated':
      return items.filter((d) => d.reviewPercent >= 90)
    case 'free':
      return items.filter((d) => d.category === 'free')
    default:
      return items.filter((d) => d.category === 'hot')
  }
}

/**
 * 「我库内打折」：**不额外发任何请求**，直接用游戏库里的现价/原价算。
 *
 * 库里每款游戏的价格本来就随每次同步刷新（appdetails，12 小时 TTL），
 * 于是「我拥有的哪些游戏正在打折」这个最贴合本软件定位的问题，答案已经在本地数据库里。
 * 史低标记也直接沿用 games 表的判定结果，与「史低专区」口径一致。
 */
function ownedDeals(games: OwnedGame[]): DiscountItem[] {
  const now = Math.floor(Date.now() / 1000)
  return games
    .filter((g) => g.priceCents > 0 && g.originalPriceCents > g.priceCents)
    .map((g) => ({
      appId: g.appId, name: g.name, headerImage: g.headerImage,
      originalPriceCents: g.originalPriceCents, finalPriceCents: g.priceCents,
      discountPercent: Math.round((1 - g.priceCents / g.originalPriceCents) * 100),
      currency: 'CNY', isHistoricalLow: g.isHistoricalLow, historicalLowCents: g.priceCents,
      reviewPercent: g.reviewPercent, reviewCount: g.reviewCount, tags: g.tags, releaseDate: g.releaseDate,
      storeUrl: `https://store.steampowered.com/app/${g.appId}/`,
      category: 'owned' as const, endsAt: null, fetchedAt: now, notifiedAt: null
    }))
}

export default function StorePage() {
  const snapshot = useDataStore((s) => s.snapshot)
  const navigate = useAppStore((s) => s.navigate)
  // O-5：分类与排序跨会话记住 —— 用户几乎总是停在同一个分类上挑折扣
  const [tab, setTab] = usePersistedState<DiscountCategory>('store.tab', 'hot')
  const [sort, setSort] = usePersistedState<SortKey>('store.sort', 'discount')

  const discounts = snapshot?.discounts ?? []
  const wishlistAppIds = useMemo(() => new Set((snapshot?.wishlist ?? []).map((w) => w.appId)), [snapshot])

  // 「我库内打折」来自游戏库本地价格（零请求），与全站促销池是两套数据源
  const owned = useMemo(() => ownedDeals(snapshot?.games ?? []), [snapshot?.games])
  const tabItems = useMemo(
    () => (tab === 'owned' ? owned : filterByTab(discounts, tab)),
    [owned, discounts, tab]
  )
  const items = useMemo(() => sortItems(tabItems, sort), [tabItems, sort])

  const stats = useMemo(() => {
    const lows = discounts.filter((d) => d.isHistoricalLow).length
    const free = discounts.filter((d) => d.category === 'free').length
    const best = discounts.reduce((acc, d) => Math.max(acc, d.discountPercent), 0)
    const lowest = discounts
      .filter((d) => d.finalPriceCents > 0)
      .reduce((acc, d) => Math.min(acc, d.finalPriceCents), Number.POSITIVE_INFINITY)
    return { lows, free, best, lowest: Number.isFinite(lowest) ? lowest : 0 }
  }, [discounts])

  const openStore = (item: DiscountItem): void => {
    void bridge.app.openExternal(item.storeUrl || `https://store.steampowered.com/app/${item.appId}/`)
  }

  if (!snapshot) return null

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Store size={19} />}
        title="折扣商城"
        subtitle="按「我库内打折 / 今日热门 / 史低专区 / 高评分折扣 / 限时免费」浏览折扣。「我库内打折」只看你自己的库；其余四类来自 Steam 中国区商店接口（cc=cn），点击卡片可直接跳转商店。"
        action={
          <>
            <Badge tone="warn" icon={<BadgePercent size={11} />}>
              最高 -{Math.round(stats.best)}%
            </Badge>
            <Badge tone="ok" icon={<Gift size={11} />}>
              免费 {stats.free} 款
            </Badge>
            <Select value={sort} options={SORT_OPTIONS} onChange={(v) => setSort(v as SortKey)} />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {DISCOUNT_TABS.map((t) => {
          const active = tab === t.key
          const count = t.key === 'owned' ? owned.length : filterByTab(discounts, t.key).length
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              title={t.hint}
              className={[
                'flex items-center gap-2 rounded-pill border px-4 py-2 text-[13px] transition-all duration-200',
                active
                  ? 'border-line3 bg-accent3/18 text-t1 shadow-[0_0_0_1px_var(--si-line-2)]'
                  : 'border-line bg-bg2/55 text-t2 hover:border-line2 hover:text-t1'
              ].join(' ')}
            >
              {t.label}
              <span className={`text-[11px] ${active ? 'text-accent' : 'text-t3'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox icon={<BadgePercent size={16} />} label="在售折扣" value={`${discounts.length} 款`} hint="本次同步抓取到的全部折扣条目" />
        <StatBox icon={<Library size={16} />} label="我库内打折" value={`${owned.length} 款`} hint="你已拥有且正在打折的游戏" />
        <StatBox icon={<Tag size={16} />} label="达到史低" value={`${stats.lows} 款`} hint="现价 ≤ 本机历史采样最低价" />
        <StatBox icon={<Gift size={16} />} label="限时免费" value={`${stats.free} 款`} hint="当前价格为零" />
        <StatBox
          icon={<Star size={16} />}
          label="最低到手价"
          value={stats.lowest > 0 ? formatMoney(stats.lowest) : '—'}
          hint="不含免费与未定价条目"
        />
      </div>

      <Card padding="md">
        <SectionHeader
          title={DISCOUNT_TABS.find((t) => t.key === tab)?.label ?? '折扣'}
          subtitle={DISCOUNT_TABS.find((t) => t.key === tab)?.hint}
          icon={<Tag size={15} />}
          action={
            <Badge tone="neutral" size="xs" icon={<Timer size={10} />}>
              {items.length} 条结果
            </Badge>
          }
        />

        {items.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Store size={24} />}
              title="这个分类下暂时没有数据"
              description={
                snapshot.user?.source === 'api'
                  ? tab === 'owned'
                    ? '「我库内打折」直接读游戏库里已缓存的价格（每次同步刷新，12 小时内可能有一次延迟）。你现在没有任何已拥有的游戏在打折 —— 这通常是好事，说明你的库买得很准。'
                    : tab === 'lowest'
                      ? '「史低」以本机 price_history 累计采样到的最低价为基准，至少需要两次跨天同步才有可比数据。'
                      : '这三个专区由同一批折扣按维度筛出：「高评分折扣」要求好评率 ≥ 90%，「限时免费」要求 Steam 当前存在 100% 折扣活动；当前没有对应促销时为空属正常。'
                  : '先完成一次数据同步，或切换到其它分类。'
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <DiscountCard
                key={`${item.category}-${item.appId}`}
                name={item.name}
                headerImage={item.headerImage}
                originalPriceCents={item.originalPriceCents}
                finalPriceCents={item.finalPriceCents}
                discountPercent={item.discountPercent}
                isHistoricalLow={item.isHistoricalLow}
                reviewPercent={item.reviewPercent}
                reviewCount={item.reviewCount}
                tags={item.tags}
                endsAt={item.endsAt}
                onOpenStore={() => openStore(item)}
                onOpenDetail={
                  snapshot.games.some((g) => g.appId === item.appId)
                    ? () => navigate('game', { appId: item.appId, from: 'store' })
                    : undefined
                }
                footer={
                  wishlistAppIds.has(item.appId) ? (
                    <button
                      type="button"
                      onClick={() => navigate('wishlist')}
                      className="w-full rounded-pill border border-line2 px-3 py-1.5 text-[11.5px] text-accent transition-colors hover:bg-accent3/15"
                    >
                      已在愿望单 · 查看降价 →
                    </button>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </Card>

      <p className="flex items-start gap-2 rounded-xl border border-line bg-bg1/50 px-3 py-2.5 text-[11.5px] leading-relaxed text-t3">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          「史低」的判定口径需要说清楚：Steam 官方没有提供历史最低价接口，本软件把每次同步抓到的价格写入 price_history 表，
          用<span className="text-t2">本机累计采样到的最低价</span>作为基准。也就是说，用得越久判定越准，刚安装时它只代表「你见过的最低价」。
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void bridge.app.openExternal('https://store.steampowered.com/specials/')}
          className="flex items-center gap-1.5 rounded-pill border border-line2 px-3.5 py-2 text-[12.5px] text-accent transition-colors hover:bg-accent3/15"
        >
          <ExternalLink size={13} />
          打开 Steam 特惠页面
        </button>
        <button
          type="button"
          onClick={() => void bridge.app.openExternal('https://store.steampowered.com/search/?maxprice=free&specials=1')}
          className="flex items-center gap-1.5 rounded-pill border border-line2 px-3.5 py-2 text-[12.5px] text-accent transition-colors hover:bg-accent3/15"
        >
          <Gift size={13} />
          查看全部免费游戏
        </button>
      </div>
    </div>
  )
}

function StatBox({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card padding="md" hover>
      <div className="flex items-center gap-2 text-t3">
        {icon}
        <span className="text-[11.5px]">{label}</span>
      </div>
      <p className="mt-1.5 text-[19px] font-semibold text-t1">{value}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-t3">{hint}</p>
    </Card>
  )
}
