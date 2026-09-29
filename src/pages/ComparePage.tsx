import { useMemo, useState, type ReactNode } from 'react'
import { ExternalLink, GitCompareArrows, Info, Search, Star, X } from 'lucide-react'
import { Badge, Button, Card, EmptyState, GameCover, ProgressBar, SectionHeader } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { StarRating } from '@/components/shared/StarRating'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { bridge } from '@/services/bridge'
import type { OwnedGame } from '@/types/steam'
import { formatHours, formatMoney, formatPercent, formatRelative } from '@/utils/format'

/** 对比款数上限。再多就不是「并排看」而是表格了，横向滚动会让人放弃阅读。 */
const MAX_COMPARE = 4

/** 完成度 0–1；没有成就系统返回 -1（排最后）。 */
const completion = (g: OwnedGame): number => (g.achievementsTotal > 0 ? g.achievementsUnlocked / g.achievementsTotal : -1)

interface Metric {
  key: string
  label: string
  hint?: string
  render: (g: OwnedGame, rating: number) => ReactNode
  /** 返回参与「谁更好」比较的数值，越大越好；null = 不参与高亮（例如价格） */
  score?: (g: OwnedGame) => number | null
}

/**
 * 游戏对比（N1-4）。
 *
 * 要解决的问题很具体：库里有一批「买了但一次没玩」的游戏（本机实测 11 款），
 * 真正的决策问题是「先玩哪个」；此前只能一款一款点进详情页来回翻、靠脑子记。
 *
 * 数据全部来自 `games` 表，零新增请求。
 */
export default function ComparePage() {
  const snapshot = useDataStore((s) => s.snapshot)
  const navigate = useAppStore((s) => s.navigate)
  const notes = useDataStore((s) => s.derived?.notes)
  const preset = useAppStore((s) => s.params.appIds)

  const games = snapshot?.games ?? []
  const [selected, setSelected] = useState<number[]>(preset ?? [])
  const [query, setQuery] = useState('')

  const byId = useMemo(() => new Map(games.map((g) => [g.appId, g])), [games])
  /** V4/F8：本机价格采样里每个 appId 的最低价（与史低同一口径），用于「史低达成率」。 */
  const lowestByApp = useMemo(() => {
    const m = new Map<number, number>()
    for (const p of snapshot?.priceHistory ?? []) {
      if (p.priceCents < 0) continue
      const cur = m.get(p.appId)
      if (cur === undefined || p.priceCents < cur) m.set(p.appId, p.priceCents)
    }
    return m
  }, [snapshot])
  const picked = useMemo(
    () => selected.map((id) => byId.get(id)).filter((g): g is OwnedGame => Boolean(g)),
    [selected, byId]
  )

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return games.filter((g) => !selected.includes(g.appId) && (!q || g.name.toLowerCase().includes(q) || g.developer.toLowerCase().includes(q)))
  }, [games, selected, query])

  const toggle = (appId: number): void => {
    setSelected((prev) => (prev.includes(appId) ? prev.filter((x) => x !== appId) : prev.length >= MAX_COMPARE ? prev : [...prev, appId]))
  }

  const metrics: Metric[] = [
    { key: 'playtime', label: '总游戏时间', score: (g) => g.playtimeForeverMin, render: (g) => <span className="text-accent">{formatHours(g.playtimeForeverMin)} h</span> },
    { key: 'twoWeeks', label: '最近两周', score: (g) => g.playtimeTwoWeeksMin, render: (g) => (g.playtimeTwoWeeksMin > 0 ? `${formatHours(g.playtimeTwoWeeksMin)} h` : '—') },
    {
      key: 'completion',
      label: '成就完成度',
      score: completion,
      render: (g) =>
        g.achievementsTotal > 0 ? (
          <div className="flex items-center gap-2">
            <ProgressBar value={g.achievementsUnlocked} max={g.achievementsTotal} height={4} label={`《${g.name}》成就 ${g.achievementsUnlocked}/${g.achievementsTotal}`} />
            <span className="shrink-0 text-[11.5px] text-t3">
              {g.achievementsUnlocked}/{g.achievementsTotal}
            </span>
          </div>
        ) : (
          <span className="text-t3">无成就</span>
        )
    },
    { key: 'rating', label: '商店好评率', score: (g) => (g.reviewPercent > 0 ? g.reviewPercent : null), render: (g) => (g.reviewPercent > 0 ? formatPercent(g.reviewPercent, 1) : '—') },
    { key: 'price', label: '当前商店价', hint: '按当前标价，不是实付价', render: (g) => (g.priceCents > 0 ? formatMoney(g.priceCents) : g.priceCents === 0 ? '免费' : '未获取') },
    { key: 'original', label: '原价', render: (g) => (g.originalPriceCents > 0 ? formatMoney(g.originalPriceCents) : '—') },
    {
      key: 'discount',
      label: '折扣',
      score: (g) => (g.originalPriceCents > g.priceCents && g.priceCents > 0 ? Math.round((1 - g.priceCents / g.originalPriceCents) * 100) : null),
      render: (g) =>
        g.originalPriceCents > g.priceCents && g.priceCents > 0 ? (
          <Badge tone="ok" size="xs">
            -{Math.round((1 - g.priceCents / g.originalPriceCents) * 100)}%
          </Badge>
        ) : (
          <span className="text-t3">—</span>
        )
    },
    { key: 'value', label: '性价比', hint: '每花 1 元能玩多少小时（按时长 ÷ 现价）', score: (g) => (g.priceCents > 0 && g.playtimeForeverMin > 0 ? g.playtimeForeverMin / g.priceCents : null), render: (g) => (g.priceCents > 0 && g.playtimeForeverMin > 0 ? `${((g.playtimeForeverMin * 100) / (60 * g.priceCents)).toFixed(1)} h/元` : '—') },
    {
      key: 'lowRate',
      label: '史低达成率',
      hint: '当前价 ÷ 本机史低（100% = 已达史低）',
      score: (g) => {
        const low = lowestByApp.get(g.appId)
        return low && low > 0 && g.priceCents > 0 ? Math.round((g.priceCents / low) * 100) : null
      },
      render: (g) => {
        const low = lowestByApp.get(g.appId)
        if (!low || low <= 0 || g.priceCents <= 0) return '—'
        const r = Math.round((g.priceCents / low) * 100)
        return <span className={r <= 100 ? 'text-ok' : 'text-t1'}>{r}%</span>
      }
    },
    { key: 'last', label: '最近游玩', score: (g) => g.lastPlayedAt, render: (g) => formatRelative(g.lastPlayedAt, '从未') },
    { key: 'release', label: '发行日期', render: (g) => g.releaseDate || '—' },
    { key: 'genres', label: '类型', render: (g) => g.genres.slice(0, 3).join(' · ') || '未分类' },
    {
      key: 'myRating',
      label: '我的评分',
      score: (g) => (notes?.get(g.appId)?.rating ?? 0) || null,
      render: (g) => <StarRating value={notes?.get(g.appId)?.rating ?? 0} readOnly size={13} />
    }
  ]

  if (!snapshot) return null

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<GitCompareArrows size={19} />}
        title="游戏对比"
        subtitle={`挑 2–${MAX_COMPARE} 款游戏并排看：时长、成就完成度、好评率、价格与性价比一次对齐。数据全部来自本地 SQLite，不额外请求任何接口。`}
        action={
          picked.length > 0 ? (
            <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setSelected([])}>
              清空选择
            </Button>
          ) : undefined
        }
      />

      <Card padding="md">
        <SectionHeader
          title="选择要对比的游戏"
          subtitle={`已选 ${picked.length} / ${MAX_COMPARE}${picked.length >= MAX_COMPARE ? ' · 已达上限' : ''}`}
          icon={<Search size={15} />}
        />

        {picked.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {picked.map((g) => (
              <span key={g.appId} className="flex items-center gap-2 rounded-pill border border-line3 bg-accent3/15 py-1 pl-1 pr-2">
                <GameCover src={g.headerImage} name={g.name} className="h-6 w-[42px] shrink-0" rounded="rounded-sm" />
                <span className="max-w-[160px] truncate text-[12px] text-t1">{g.name}</span>
                <button type="button" onClick={() => toggle(g.appId)} aria-label={`移除 ${g.name}`} className="text-t3 transition-colors hover:text-danger">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索要对比的游戏名 / 开发商"
            aria-label="搜索要对比的游戏"
            className="h-9 w-full max-w-[420px] rounded-pill border border-line bg-bg2/55 px-4 text-[13px] text-t1 outline-none transition-colors placeholder:text-t3 focus:border-line3"
          />
        </div>

        <div className="mt-3 max-h-[168px] overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="text-[12px] text-t3">{games.length === 0 ? '游戏库还是空的，先去同步一次。' : '没有更多匹配的游戏了。'}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {candidates.slice(0, 60).map((g) => (
                <button
                  key={g.appId}
                  type="button"
                  disabled={picked.length >= MAX_COMPARE}
                  onClick={() => toggle(g.appId)}
                  title={g.name}
                  className="max-w-[220px] truncate rounded-pill border border-line bg-bg2/50 px-3 py-1 text-[12px] text-t2 transition-colors hover:border-line2 hover:text-t1 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {picked.length < 2 ? (
        <EmptyState
          icon={<GitCompareArrows size={26} />}
          title="至少选 2 款游戏才能对比"
          description="在上面搜索并点选游戏；最多 4 款。"
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-[132px] bg-bg2/95 px-4 py-3 text-left text-[11.5px] font-medium text-t3">指标</th>
                  {picked.map((g) => (
                    <th key={g.appId} className="px-3 py-3 align-bottom">
                      <div className="flex flex-col items-start gap-2">
                        <GameCover src={g.headerImage} name={g.name} className="h-[62px] w-[124px] shrink-0" rounded="rounded-lg" />
                        <button
                          type="button"
                          onClick={() => navigate('game', { appId: g.appId, from: 'compare' })}
                          className="max-w-[180px] truncate text-left text-[12.5px] font-medium text-t1 transition-colors hover:text-accent"
                          title={g.name}
                        >
                          {g.name}
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, rowIndex) => {
                  // 每行标出「最好」的那一列（价格类不标：便宜不等于好）
                  const scored = m.score ? picked.map((g) => ({ appId: g.appId, score: m.score?.(g) ?? null })) : []
                  const known = scored.filter((s) => s.score !== null) as Array<{ appId: number; score: number }>
                  const best = known.length >= 2 ? Math.max(...known.map((s) => s.score)) : null
                  return (
                    <tr key={m.key} className={rowIndex % 2 === 0 ? 'bg-bg1/30' : ''}>
                      <td className="sticky left-0 z-10 bg-bg2/95 px-4 py-2.5 text-[12px] text-t3">
                        <span className="inline-flex items-center gap-1">
                          {m.label}
                          {m.hint ? (
                            <span title={m.hint} className="text-t3/70">
                              <Info size={11} />
                            </span>
                          ) : null}
                        </span>
                      </td>
                      {picked.map((g) => {
                        const s = scored.find((x) => x.appId === g.appId)?.score ?? null
                        const isBest = best !== null && s !== null && s === best
                        return (
                          <td key={g.appId} className="px-3 py-2.5 text-[12.5px] text-t1">
                            <div className="flex items-center gap-1.5">
                              {m.render(g, notes?.get(g.appId)?.rating ?? 0)}
                              {isBest ? (
                                <Badge tone="accent" size="xs">
                                  最好
                                </Badge>
                              ) : null}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                <tr>
                  <td className="sticky left-0 z-10 bg-bg2/95 px-4 py-3 text-[12px] text-t3">操作</td>
                  {picked.map((g) => (
                    <td key={g.appId} className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => navigate('game', { appId: g.appId, from: 'compare' })}>
                          看详情
                        </Button>
                        <button
                          type="button"
                          onClick={() => void bridge.app.openExternal(`https://store.steampowered.com/app/${g.appId}/`)}
                          className="inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[11px] text-t3 transition-colors hover:bg-bg3 hover:text-accent"
                        >
                          <ExternalLink size={12} />
                          商店
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-t3">
        <Star size={12} className="mt-0.5 shrink-0" />
        <span>
          「当前商店价 / 原价」是 Steam 商店接口给出的标价，<span className="text-t2">不是</span>你的实付价；
          「性价比」按时长 ÷ 现价计算，只对「已玩过且有标价」的游戏有意义。
          成就完成度、好评率、时长都直接取自本地库，不额外请求接口。
        </span>
      </p>
    </div>
  )
}
