import { useMemo, type ReactNode } from 'react'
import { Flame, Info, Percent, PiggyBank, Scale, Wallet } from 'lucide-react'
import { Badge, Card, GameCover, SectionHeader, Tooltip } from '@/components/ui'
import type { OwnedGame } from '@/types/steam'
import { VALUE_CAVEAT, libraryValue } from '@/utils/library'
import { formatHours, formatMoney, formatMinutes, formatPercent } from '@/utils/format'

interface LibraryValueCardProps {
  games: OwnedGame[]
  onOpenGame: (appId: number) => void
}

/**
 * 「库价值与性价比」（N1-1）。
 *
 * 这些字段（`price_cents` / `original_price_cents` / `playtime_forever`）每次同步都在拉，
 * 但此前只在游戏详情页露过一次 —— 相当于采了数据却从没用过。
 *
 * ⚠️ 口径：全部按**当前商店标价**估算。Steam 不返回实付价，
 * 所以这里任何数字都不能说成「你一共花了多少钱」（见 utils/library.ts 的 VALUE_CAVEAT）。
 */
export function LibraryValueCard({ games, onOpenGame }: LibraryValueCardProps) {
  // 必须是 useMemo：LibraryPage 的搜索框每敲一个字符都会重渲这一屏，
  // 而 libraryValue() 要遍历整个游戏库做价格 / 沉没成本聚合 —— 不加记忆会逐字符全量重算。
  const v = useMemo(() => libraryValue(games, { bestLimit: 5, sunkLimit: 6 }), [games])

  // 一个价格都没有时不要展示一整屏 0 —— 那比不展示更像 bug
  if (v.pricedCount === 0) {
    return (
      <Card padding="md">
        <SectionHeader title="库价值与性价比" subtitle="还没有可用于估算的价格数据" icon={<Wallet size={15} />} />
        <p className="mt-3 text-[12px] leading-relaxed text-t3">
          库里没有任何一款游戏拿到商店标价。完成一次同步后这里会自动算出来
          （价格来自 Steam 商店接口，每次同步刷新）。
        </p>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <SectionHeader
        title="库价值与性价比"
        subtitle="按当前商店标价估算，不是你的实付金额"
        icon={<Wallet size={15} />}
        action={
          <Tooltip label={VALUE_CAVEAT}>
            <span className="inline-flex items-center gap-1 rounded-pill border border-line px-2 py-1 text-[11px] text-t3">
              <Info size={11} />
              口径
            </span>
          </Tooltip>
        }
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={<Wallet size={14} />}
          label="库当前商店价"
          value={formatMoney(v.currentTotalCents)}
          hint={`${v.pricedCount} 款有标价 · 另有 ${v.freeCount} 款免费${v.unknownCount > 0 ? ` · ${v.unknownCount} 款未获取价格` : ''}`}
        />
        <Tile
          icon={<Percent size={14} />}
          label="整库原价合计"
          value={formatMoney(v.originalTotalCents)}
          hint={v.onSaleCount > 0 ? `${v.onSaleCount} 款正在促销，平均降幅 ${formatPercent(v.averageSaleDiscountPercent, 0)}` : '当前没有游戏在促销'}
        />
        <Tile
          icon={<PiggyBank size={14} />}
          label="整库折扣率"
          value={formatPercent(v.weightedDiscountPercent, 1)}
          hint={`按现价合计 ÷ 原价合计；现在整库买一遍约省 ${formatMoney(v.originalTotalCents - v.currentTotalCents)}`}
        />
        <Tile
          icon={<Scale size={14} />}
          label="性价比"
          value={v.hoursPerYuanCurrent.toFixed(2)}
          unit="小时 / 元"
          hint={`按现价算（按原价 ${v.hoursPerYuanOriginal.toFixed(2)}）· 累计 ${formatHours(v.totalMinutes)} 小时`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-line bg-bg1/45 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-t1">
              <Flame size={13} className="text-accent" />
              最划算的几款
            </span>
            <span className="text-[11px] text-t3">时长 ÷ 现价</span>
          </div>
          {v.bestValue.length === 0 ? (
            <p className="mt-2 text-[11.5px] text-t3">还没有「已玩过且有标价」的游戏可对比。</p>
          ) : (
            <div className="mt-2.5 space-y-1.5">
              {v.bestValue.map((row) => (
                <button
                  key={row.game.appId}
                  type="button"
                  onClick={() => onOpenGame(row.game.appId)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-bg3"
                >
                  <GameCover src={row.game.headerImage} name={row.game.name} className="h-8 w-[60px] shrink-0" rounded="rounded-md" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-t1" title={row.game.name}>
                    {row.game.name}
                  </span>
                  <span className="shrink-0 text-[11.5px] text-t3">{formatMinutes(row.game.playtimeForeverMin)}</span>
                  <span className="shrink-0 text-[12px] text-accent">{row.hoursPerYuan.toFixed(1)} h/元</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-bg1/45 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-t1">
              <PiggyBank size={13} className="text-warn" />
              在库里但从没打开过
            </span>
            <Badge tone={v.sunkCost.length > 0 ? 'warn' : 'neutral'} size="xs">
              {v.sunkCost.length} 款
            </Badge>
          </div>
          {v.sunkCost.length === 0 ? (
            <p className="mt-2 text-[11.5px] text-ok">库里每款有标价的游戏都玩过了，没有吃灰的。</p>
          ) : (
            <>
              <div className="mt-2.5 space-y-1.5">
                {v.sunkCost.map((row) => (
                  <button
                    key={row.game.appId}
                    type="button"
                    onClick={() => onOpenGame(row.game.appId)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-bg3"
                  >
                    <GameCover src={row.game.headerImage} name={row.game.name} className="h-8 w-[60px] shrink-0" rounded="rounded-md" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-t1" title={row.game.name}>
                      {row.game.name}
                    </span>
                    <span className="shrink-0 text-[12px] text-warn">{formatMoney(row.priceCents)}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2.5 border-t border-line pt-2 text-[11px] leading-relaxed text-t3">
                上面这 {v.sunkCost.length} 款合计标价 <span className="text-warn">{formatMoney(v.sunkCostTotalCents)}</span>（当前价）
                {v.sunkCostAllCount > v.sunkCost.length
                  ? `；加上没列出的另外 ${v.sunkCostAllCount - v.sunkCost.length} 款，全库共 ${v.sunkCostAllCount} 款、${formatMoney(v.sunkCostAllTotalCents)}。`
                  : '。'}
                {' '}只统计有标价、且时长为 0 的游戏 —— 免费领来没玩的不算浪费，放进这份清单只会稀释重点。
              </p>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-t3">{VALUE_CAVEAT}</p>
    </Card>
  )
}

function Tile({ icon, label, value, unit, hint }: { icon: ReactNode; label: string; value: string; unit?: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg1/45 p-3">
      <div className="flex items-center gap-1.5 text-t3">
        {icon}
        <span className="text-[11.5px]">{label}</span>
      </div>
      <p className="mt-1.5 text-[19px] font-semibold text-t1">
        {value}
        {unit ? <span className="ml-1 text-[11px] font-normal text-t3">{unit}</span> : null}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-t3">{hint}</p>
    </div>
  )
}
