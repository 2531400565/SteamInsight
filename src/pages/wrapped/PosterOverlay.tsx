import { createPortal } from 'react-dom'
import { Award } from 'lucide-react'
import { GameCover } from '@/components/ui'
import type { SteamUser } from '@/types/steam'
import type { buildWrapped } from '@/utils/wrapped'
import { formatCount, formatHours, formatMinutes, formatPercent } from '@/utils/format'

function PosterStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11.5px] text-white/65">{label}</p>
      <p className="mt-1 text-[26px] font-semibold leading-none text-white">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-white/55">{sub}</p> : null}
    </div>
  )
}

/**
 * 分享海报：铺满整个窗口，PNG 导出的就是这一屏。
 * 配色写死为深蓝渐变，不跟随应用主题，保证导出图片在任何主题下都是同一张。
 *
 * 必须用 portal 挂到 body：页面容器 `.page-enter` 的入场动画带 transform，
 * 会给 `position: fixed` 造出一个包含块，导致海报只铺满内容区、盖不住顶栏与侧栏。
 * 同时 `data-export-poster` 是主进程判断「海报已绘制完成，可以截图了」的锚点。
 */
interface PosterOverlayProps {
  report: ReturnType<typeof buildWrapped>
  /**
   * F-6b：把 Steam 等级 / 徽章带进海报。
   *
   * 海报是用户唯一会**拿出去给人看**的界面，而「Steam 等级」恰好是最能被一眼认出的资历信息。
   * 数据已经随每次常规同步落在 `users` 表上，这里只是顺手显示；等级为 0（没拿到）时整行不渲染，
   * 免得海报上出现「Lv.0」这种看着像出错了的东西。
   */
  user?: SteamUser | null
}

export function PosterOverlay({ report, user }: PosterOverlayProps) {
  const level = user?.level ?? 0
  const badges = user?.badgeCount ?? 0
  const hasLevel = level > 0
  const personaLine = user
    ? [
        user.personaName || '玩家',
        hasLevel ? `Steam 等级 Lv.${level}` : '',
        badges > 0 ? `${badges} 枚徽章 · 徽章经验 ${formatCount(user?.badgeXp ?? 0)}` : ''
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return createPortal(
    <div data-export-poster className="fixed inset-0 z-[60] overflow-hidden bg-[#08182b]">
      <div className="absolute inset-0 bg-[linear-gradient(140deg,#08182b_0%,#12365c_48%,#1b6dd5_130%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(40rem_26rem_at_85%_-5%,rgba(102,192,244,0.38),transparent_62%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(34rem_22rem_at_5%_105%,rgba(27,109,213,0.34),transparent_60%)]" />
      <div className="relative flex h-full flex-col justify-between p-14">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium tracking-[0.42em] text-white/65">STEAM WRAPPED</p>
            {report.period === undefined || report.period === 'year' ? (
              <p className="mt-2 text-[86px] font-bold leading-[0.95] tracking-tight text-white">{report.year}</p>
            ) : (
              <p className="mt-2 max-w-[720px] text-[44px] font-bold leading-[1.15] tracking-tight text-white">
                {report.periodLabel ?? report.periodKey}
              </p>
            )}
            {personaLine ? (
              <p className="mt-3 flex items-center gap-2 text-[15px] text-white/75">
                {hasLevel ? <Award size={16} className="text-white/60" /> : null}
                {personaLine}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-[13px] text-white/65">总时长</p>
            <p className="text-[56px] font-bold leading-none text-white">
              {formatHours(report.totalMinutes)}
              <span className="ml-2 text-[16px] font-medium text-white/70">小时</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-5">
          <PosterStat label="游玩游戏" value={`${report.gameCount} 款`} />
          <PosterStat label="解锁成就" value={`${report.achievementsUnlocked} 个`} />
          <PosterStat label="最肝一天" value={report.busiestDay ? formatMinutes(report.busiestDay.minutes) : '—'} sub={report.busiestDay?.date} />
          <PosterStat label="最长连续" value={`${report.longestStreak} 天`} />
        </div>

        <div className="grid grid-cols-5 gap-4">
          {report.topGames.map((g) => (
            <div key={g.appId} className="overflow-hidden rounded-xl border border-white/15 bg-white/8 backdrop-blur-sm">
              <GameCover src={g.headerImage} name={g.name} className="h-[92px] w-full" rounded="rounded-none" />
              <div className="p-2.5">
                <p className="truncate text-[12px] font-medium text-white" title={g.name}>
                  {g.rank}. {g.name}
                </p>
                <p className="mt-0.5 text-[11px] text-white/70">
                  {formatHours(g.minutes)} 小时 · {formatPercent(g.percent, 0)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] text-white/65">最喜欢的类型</p>
            <p className="text-[30px] font-semibold leading-tight text-white">{report.favoriteGenre?.genre ?? '—'}</p>
            <p className="mt-1 text-[12px] text-white/70">
              {report.bestHourRange ? `最常在${report.bestHourRange.label}上线` : ''}
            </p>
          </div>
          <p className="text-[12px] text-white/55">由 Steam Insight 生成 · 数据来源：Steam 官方 API + 本地 SQLite</p>
        </div>
      </div>
    </div>,
    document.body
  )
}
