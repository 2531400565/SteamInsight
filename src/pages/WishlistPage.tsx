import { useMemo, useState, type ReactNode } from 'react'
import { Bell, BellRing, Check, Heart, Percent, Tag, Target, TrendingDown, X } from 'lucide-react'
import { Badge, Button, Card, EmptyState, SectionHeader, Select, Switch, Tooltip } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import type { PricePoint } from '@/types/steam'
import { pricePercentileRank } from '@/utils/analytics'
import { usePriceHistory } from '@/hooks/useAchievements'
import { DiscountCard } from '@/components/shared/DiscountCard'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { bridge } from '@/services/bridge'
import type { PriceAlert, WishlistItem } from '@/types/steam'
import { formatMoney, formatPercent, formatRelative } from '@/utils/format'
import { usePersistedState } from '@/hooks/usePersistedState'

type SortKey = 'discount' | 'price' | 'added' | 'priority'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'discount', label: '折扣由高到低' },
  { value: 'price', label: '现价由低到高' },
  { value: 'added', label: '最近加入优先' },
  { value: 'priority', label: '优先级由高到低' }
]

function sortItems(items: WishlistItem[], key: SortKey): WishlistItem[] {
  const list = [...items]
  switch (key) {
    case 'price':
      return list.sort((a, b) => a.finalPriceCents - b.finalPriceCents)
    case 'added':
      return list.sort((a, b) => b.addedAt - a.addedAt)
    case 'priority':
      return list.sort((a, b) => a.priority - b.priority || b.discountPercent - a.discountPercent)
    default:
      return list.sort((a, b) => b.discountPercent - a.discountPercent || b.addedAt - a.addedAt)
  }
}

export default function WishlistPage() {
  const snapshot = useDataStore((s) => s.snapshot)
  const reload = useDataStore((s) => s.reload)
  const navigate = useAppStore((s) => s.navigate)
  const settings = useAppStore((s) => s.settings)
  const patchSettings = useAppStore((s) => s.patchSettings)
  const runSync = useAppStore((s) => s.runSync)

  // 价格历史按需拉取：愿望单最该有的信息是「现在这个价处在什么位置」，
  // 而 priceTrend / pricePercentileRank 之前只在游戏详情页用过。
  const wishAppIds = useMemo(() => (snapshot?.wishlist ?? []).map((w) => w.appId), [snapshot])
  const { byApp: priceByApp } = usePriceHistory(wishAppIds, { daily: true, sinceDays: 90 })

  // O-5：排序、标签筛选与两个过滤开关跨会话记住（这是本项目里最容易反复重设的一组控件）
  const [sort, setSort] = usePersistedState<SortKey>('wishlist.sort', 'discount')
  const [tag, setTag] = usePersistedState<string>('wishlist.tag', '全部')
  const [onlyLow, setOnlyLow] = usePersistedState('wishlist.onlyLow', false)
  const [onlyAlert, setOnlyAlert] = usePersistedState('wishlist.onlyAlert', false)

  const wishlist = snapshot?.wishlist ?? []
  // 「已提醒」直接读库里的 notified_at（主进程在自动提醒 / 手动提醒时写入同一个字段）。
  // 早前用 useState<Set> 存，点完刷新页面就丢，按钮又变回「提醒我」。
  const notified = useMemo(() => new Set(wishlist.filter((w) => w.notifiedAt).map((w) => w.appId)), [wishlist])
  // 自定义心理价：「降到 ¥X 以下通知我」。列表以 appId 为键。
  const alertMap = useMemo(() => new Map(settings.priceAlerts.map((a) => [a.appId, a])), [settings.priceAlerts])

  const saveAlert = (appId: number, yuanValue: number): void => {
    const thresholdCents = Math.round(yuanValue * 100)
    if (!Number.isFinite(thresholdCents) || thresholdCents < 0) return
    const rest = settings.priceAlerts.filter((a) => a.appId !== appId)
    // 改了阈值就把「已提醒」状态清掉，否则新阈值可能永远不再触发
    void patchSettings({ priceAlerts: [...rest, { appId, thresholdCents, notifiedAt: null, notifiedPriceCents: null }] })
  }

  const clearAlert = (appId: number): void => {
    void patchSettings({ priceAlerts: settings.priceAlerts.filter((a) => a.appId !== appId) })
  }

  const tags = useMemo(() => {
    const counter = new Map<string, number>()
    for (const w of wishlist) for (const t of w.tags) counter.set(t, (counter.get(t) ?? 0) + 1)
    return ['全部', ...[...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t)]
  }, [wishlist])

  const items = useMemo(() => {
    let list = wishlist
    if (tag !== '全部') list = list.filter((w) => w.tags.includes(tag))
    if (onlyLow) list = list.filter((w) => w.isHistoricalLow)
    if (onlyAlert) list = list.filter((w) => alertMap.has(w.appId))
    return sortItems(list, sort)
  }, [wishlist, tag, onlyLow, onlyAlert, alertMap, sort])

  const stats = useMemo(() => {
    const dropped = wishlist.filter((w) => w.discountPercent > 0)
    const lows = wishlist.filter((w) => w.isHistoricalLow)
    const avg = dropped.length > 0 ? dropped.reduce((acc, w) => acc + w.discountPercent, 0) / dropped.length : 0
    const cheapest = dropped.reduce(
      (acc, w) => (w.finalPriceCents >= 0 && w.finalPriceCents < acc ? w.finalPriceCents : acc),
      Number.POSITIVE_INFINITY
    )
    return { dropped: dropped.length, lows: lows.length, avg, cheapest: Number.isFinite(cheapest) ? cheapest : 0 }
  }, [wishlist])

  const remind = (item: WishlistItem): void => {
    void bridge
      .notify({
        title: '愿望单降价提醒',
        body: `${item.name} 当前 ${formatMoney(item.finalPriceCents)}，已降 ${Math.round(item.discountPercent)}%${item.isHistoricalLow ? '（历史最低价）' : ''}`,
        route: 'wishlist',
        tag: `wishlist-${item.appId}`,
        // 主进程会把它写进 wishlist.notified_at，所以刷新后按钮仍是「已提醒」
        wishlistAppIds: [item.appId]
      })
      .then(() => reload())
  }

  if (!snapshot) return null

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Heart size={19} />}
        title="愿望单"
        subtitle="已同步的 Steam 愿望单，按降价幅度、价格、加入时间或优先级排序；达到史低与开启提醒的游戏会在同步完成后推送 Windows 通知。"
        action={
          <>
            <Select value={sort} options={SORT_OPTIONS} onChange={(v) => setSort(v as SortKey)} />
            <Button size="sm" variant="secondary" icon={<Bell size={14} />} onClick={() => void runSync()}>
              同步并检查降价
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox icon={<Heart size={16} />} label="愿望单总数" value={`${wishlist.length} 款`} hint="来自 IWishlistService/GetWishlist" />
        <StatBox icon={<Percent size={16} />} label="正在打折" value={`${stats.dropped} 款`} hint={`平均降幅 ${stats.avg.toFixed(1)}%`} />
        <StatBox icon={<TrendingDown size={16} />} label="达到史低" value={`${stats.lows} 款`} hint="基于本机历史价格采样判定" />
        <StatBox icon={<Tag size={16} />} label="最低到手价" value={stats.cheapest > 0 ? formatMoney(stats.cheapest) : '—'} hint="仅统计正在打折的条目" />
      </div>

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag size={13} className="text-t3" />
            {tags.map((t) => (
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
          <div className="ml-auto flex items-center gap-4">
            <div className="w-[188px]">
              <Switch checked={onlyLow} onChange={setOnlyLow} label="只看史低" description="仅显示历史最低价" />
            </div>
            <div className="w-[188px]">
              <Switch checked={onlyAlert} onChange={setOnlyAlert} label="只看设了心理价" description={`共 ${alertMap.size} 款`} />
            </div>
            <Tooltip label="同步完成后会按设置里的通知开关自动推送；这里只控制手动提醒">
              <span className="text-[11.5px] text-t3">通知设置见「设置 → 通知」</span>
            </Tooltip>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <SectionHeader
          title="愿望单游戏"
          subtitle={tag === '全部' ? '按当前排序展示全部条目' : `已按标签「${tag}」筛选`}
          icon={<Heart size={15} />}
          action={
            <Badge tone="neutral" size="xs">
              {items.length} 款
            </Badge>
          }
        />

        {items.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Heart size={24} />}
              title="没有符合条件的条目"
              description={
                wishlist.length === 0
                  ? '愿望单为空。请在设置里确认已填入 Steam Web API Key，并把 Steam 隐私设置中的「游戏详情」设为公开后再同步。'
                  : '换一个标签或关掉「只看史低」。'
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <DiscountCard
                key={item.appId}
                name={item.name}
                headerImage={item.headerImage}
                originalPriceCents={item.originalPriceCents}
                finalPriceCents={item.finalPriceCents}
                discountPercent={item.discountPercent}
                isHistoricalLow={item.isHistoricalLow}
                reviewPercent={item.reviewPercent}
                reviewCount={item.reviewCount}
                tags={item.tags}
                endsAt={null}
                onOpenStore={() => void bridge.app.openExternal(`https://store.steampowered.com/app/${item.appId}/`)}
                onOpenDetail={
                  snapshot.games.some((g) => g.appId === item.appId) ? () => navigate('game', { appId: item.appId, from: 'wishlist' }) : undefined
                }
                footer={
                  <div className="space-y-2">
                    <PricePositionHint appId={item.appId} points={priceByApp.get(item.appId) ?? []} currentCents={item.finalPriceCents} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-t3">
                        {formatRelative(item.addedAt, '未知')}加入 · {formatPercent(item.reviewPercent, 0)} 好评
                      </span>
                      <button
                        type="button"
                        disabled={notified.has(item.appId)}
                        onClick={() => remind(item)}
                        className="flex shrink-0 items-center gap-1 rounded-pill border border-line2 px-2.5 py-1 text-[11px] text-accent transition-colors hover:bg-accent3/15 disabled:opacity-45"
                      >
                        <BellRing size={11} />
                        {notified.has(item.appId) ? '已提醒' : '提醒我'}
                      </button>
                    </div>
                    <PriceAlertControl
                      item={item}
                      alert={alertMap.get(item.appId) ?? null}
                      onSave={(yuan) => saveAlert(item.appId, yuan)}
                      onClear={() => clearAlert(item.appId)}
                    />
                  </div>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <Card padding="md">
        <SectionHeader title="降价提醒规则" subtitle="由主进程在每次同步结束后判定" icon={<Bell size={15} />} />
        <div className="mt-3 grid gap-3 text-[11.5px] leading-relaxed text-t3 lg:grid-cols-2 xl:grid-cols-4">
          <Rule
            title="愿望单降价"
            enabled={settings.notifyWishlistDrop}
            onToggle={(v) => void patchSettings({ notifyWishlistDrop: v })}
            desc="愿望单中出现新的折扣时推送一次，附带折扣条目数与最低到手价。"
          />
          <Rule
            title="今日史低"
            enabled={settings.notifyHistoricalLow}
            onToggle={(v) => void patchSettings({ notifyHistoricalLow: v })}
            desc="现价低于本机历史采样最低价时推送；安装越久判定越可靠。"
          />
          <Rule
            title="免费游戏提醒"
            enabled={settings.notifyFreeGame}
            onToggle={(v) => void patchSettings({ notifyFreeGame: v })}
            desc="「原价大于 0、现价 0」的限时免费条目会触发提醒；本来就免费的游戏不算。"
          />
          <div className="rounded-xl border border-line bg-bg1/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[13px] text-t1">
                <Target size={13} className="text-accent" />
                自定义心理价
              </span>
              <Badge tone={alertMap.size > 0 ? 'accent' : 'neutral'} size="xs">
                {alertMap.size} 款
              </Badge>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-t3">
              在每张卡片上设「降到 ¥X 以下通知我」。同一价格只提醒一次，价格再降会重新提醒；与上面三个开关独立生效。
            </p>
            <button
              type="button"
              onClick={() => setOnlyAlert((v) => !v)}
              className="mt-2 rounded-pill border border-line2 px-2.5 py-1 text-[11px] text-accent transition-colors hover:bg-accent3/15"
            >
              {onlyAlert ? '显示全部条目' : '只看设了心理价的'}
            </button>
          </div>
        </div>
        <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-t3">
          提醒基于愿望单里记录的<span className="text-t2">加入时间与价格字段</span>做对比，不会在后台持续轮询 Steam；
          只有发生同步（手动、定时或开机自启后）时才会重新判定，避免给账号带来不必要的请求。
          <span className="text-t2">同一条提醒不会重复推送</span>：愿望单降价按 notified_at 去重（跨重启生效），
          史低与限时免费在同一次运行内按「游戏 + 价格」去重，只有出现新条目时才再弹；
          自定义心理价按<span className="text-t2">「游戏 + 价格」</span>去重，价格再降才会重新提醒。
          {settings.notifyWishlistDrop || settings.notifyHistoricalLow || settings.notifyFreeGame || alertMap.size > 0
            ? ` 当前至少有一项提醒生效（含 ${alertMap.size} 条自定义心理价）。`
            : ' 当前所有提醒均已关闭。'}
        </p>
      </Card>
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
      <p className="mt-0.5 text-[11px] text-t3">{hint}</p>
    </Card>
  )
}

function Rule({
  title,
  desc,
  enabled,
  onToggle
}: {
  title: string
  desc: string
  enabled: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <div className="rounded-xl border border-line bg-bg1/45 p-3">
      <Switch checked={enabled} onChange={onToggle} label={title} />
      <p className="mt-2 text-[11px] leading-relaxed text-t3">{desc}</p>
    </div>
  )
}

/**
 * 「设个心理价」内联编辑器：收起时显示当前阈值，展开后是输入框 + 保存 / 清除。
 * 本组件只负责改 `settings.priceAlerts`；判定与去重全在主进程的 notify-plan.ts（纯函数，可单独验证）。
 */
function PriceAlertControl({
  item,
  alert,
  onSave,
  onClear
}: {
  item: WishlistItem
  alert: PriceAlert | null
  onSave: (yuan: number) => void
  onClear: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const begin = (): void => {
    const preset = alert ? alert.thresholdCents / 100 : item.finalPriceCents > 0 ? Math.round(item.finalPriceCents / 100) : 0
    setDraft(preset > 0 ? String(preset) : '')
    setEditing(true)
  }

  const submit = (): void => {
    const n = Number(draft)
    setEditing(false)
    if (!Number.isFinite(n) || n < 0) return
    onSave(n)
  }

  if (!editing) {
    const reached = alert !== null && item.finalPriceCents >= 0 && item.finalPriceCents <= alert.thresholdCents
    return (
      <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
        {alert ? (
          <span className={`truncate text-[11px] ${reached ? 'text-ok' : 'text-t2'}`}>
            心理价 {formatMoney(alert.thresholdCents)}
            {reached ? ' · 已达标' : ''}
            {alert.notifiedPriceCents !== null ? ' · 已提醒' : ''}
          </span>
        ) : (
          <span className="text-[11px] text-t3">未设心理价</span>
        )}
        <button
          type="button"
          onClick={begin}
          className="flex shrink-0 items-center gap-1 rounded-pill border border-line2 px-2.5 py-1 text-[11px] text-t2 transition-colors hover:bg-bg3 hover:text-t1"
        >
          <Target size={11} />
          {alert ? '修改' : '设个心理价'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 border-t border-line pt-2">
      <span className="shrink-0 text-[11px] text-t3">¥</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
        inputMode="decimal"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- 内联编辑必须自动聚焦，否则用户点开后还要再点一次输入框
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') setEditing(false)
        }}
        placeholder="降到这个价以下就提醒我"
        className="min-w-0 flex-1 rounded-lg border border-line bg-bg1/70 px-2 py-1 text-[12px] text-t1 outline-none transition-colors placeholder:text-t3 focus:border-line3"
      />
      <button
        type="button"
        aria-label="保存心理价"
        onClick={submit}
        className="flex size-6 shrink-0 items-center justify-center rounded-pill text-ok transition-colors hover:bg-ok/15"
      >
        <Check size={13} />
      </button>
      {alert ? (
        <button
          type="button"
          aria-label="清除心理价"
          onClick={() => {
            onClear()
            setEditing(false)
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-pill text-danger transition-colors hover:bg-danger/15"
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  )
}


/**
 * 「现在这个价在什么位置」。
 *
 * 用的是**本机 90 天的价格采样**算出的百分位（与「史低」同一口径），不是第三方数据。
 * 愿望单里最常见的纠结是「现在这个价算不算低」—— 有了百分位就不用凭感觉判断。
 * 采样不足 2 个点时什么都不显示：宁可不给结论，也不给一个基于一条数据的结论。
 */
function PricePositionHint({ appId: _appId, points, currentCents }: { appId: number; points: PricePoint[]; currentCents: number }): React.JSX.Element | null {
  const rank = useMemo(() => pricePercentileRank(points, currentCents), [points, currentCents])
  if (rank === null) return null
  const tone = rank <= 20 ? 'text-ok' : rank <= 50 ? 'text-t2' : 'text-t3'
  const label = rank <= 10 ? '接近 90 天最低价' : rank <= 30 ? '低于近期常见价' : rank <= 70 ? '处于常见区间' : '高于近期常见价'
  return (
    <p className={`text-[11px] ${tone}`} title={`基于本机最近 ${points.length} 次价格采样计算的百分位`}>
      {label}（价位百分位 {rank}）
    </p>
  )
}
