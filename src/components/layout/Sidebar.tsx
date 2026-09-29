import { useEffect, useState, type ComponentType } from 'react'
import { Crosshair, Gamepad2, GitCompareArrows, Heart, LayoutDashboard, Library, PanelLeftClose, PanelLeftOpen, Settings, Sparkles, Store, Trophy } from 'lucide-react'
import { useAppStore, ROUTE_LABELS, type RouteKey } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'

type IconType = ComponentType<{ size?: number | string; className?: string }>

interface NavItem {
  key: RouteKey
  icon: IconType
  /** 右上角角标：愿望单降价数量这类需要提醒的数字 */
  badge?: 'wishlistDrops' | 'huntRare'
}

/** 标签统一从 ROUTE_LABELS 取，别在这里写第二份。 */
const NAV: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'analysis', icon: Gamepad2 },
  { key: 'library', icon: Library },
  { key: 'compare', icon: GitCompareArrows },
  { key: 'achievements', icon: Trophy },
  { key: 'hunt', icon: Crosshair, badge: 'huntRare' },
  { key: 'store', icon: Store },
  { key: 'wishlist', icon: Heart, badge: 'wishlistDrops' },
  { key: 'wrapped', icon: Sparkles },
  { key: 'settings', icon: Settings }
]

export function Sidebar() {
  const route = useAppStore((s) => s.route)
  const params = useAppStore((s) => s.params)
  const navigate = useAppStore((s) => s.navigate)
  const overview = useDataStore((s) => s.derived?.overview)
  const counts = useDataStore((s) => s.snapshot?.counts)
  const huntRare = useDataStore((s) => s.derived?.huntRareCount ?? 0)

  // 游戏详情页本身不在导航里，高亮跟着来源走：从游戏库点进去的详情就继续高亮「游戏库」。
  const activeKey: RouteKey = route === 'game' ? (params.from ?? 'analysis') : route

  // O3：窄窗口侧边栏折叠。窗口 < 900px 自动收起成图标栏（autoCollapsed）；
  // 用户也可点顶部按钮手动收起 / 展开（explicit 优先于 auto）。
  const [autoCollapsed, setAutoCollapsed] = useState(false)
  const [explicit, setExplicit] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const apply = (): void => setAutoCollapsed(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  const collapsed = explicit ?? autoCollapsed
  const toggle = (): void => setExplicit(!collapsed)

  return (
    // O-4：整块导航此前只是十几个孤立按钮 —— 没有 <nav> 上的名字，读屏软件报不出「这是主导航」。
    <nav
      aria-label="主导航"
      className={`flex shrink-0 flex-col gap-1 border-r border-line bg-bg1/60 px-3 py-4 transition-[width] duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[212px]'
      }`}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center pb-2' : 'justify-between pb-2'}`}>
        {!collapsed ? <p className="px-3 text-[11px] font-medium tracking-wider text-t3 uppercase">导航</p> : null}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? '展开导航' : '收起导航'}
          className="rounded-lg p-1.5 text-t3 transition-colors hover:bg-bg3 hover:text-t1"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {NAV.map((item) => {
        const active = activeKey === item.key
        const badgeValue =
          item.badge === 'wishlistDrops' ? (overview?.wishlistDropCount ?? 0) : item.badge === 'huntRare' ? huntRare : 0
        const Icon = item.icon
        const badgeHint =
          item.badge === 'wishlistDrops' ? `${badgeValue} 款愿望单游戏正在打折` : item.badge === 'huntRare' ? `${huntRare} 个稀有成就待追猎` : ''
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.key)}
            aria-current={active ? 'page' : undefined}
            aria-label={badgeValue > 0 ? `${ROUTE_LABELS[item.key]}，${badgeHint}` : ROUTE_LABELS[item.key]}
            title={collapsed ? ROUTE_LABELS[item.key] : undefined}
            className={[
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200',
              collapsed ? 'justify-center' : '',
              active
                ? 'bg-accent3/18 text-t1 shadow-[inset_0_0_0_1px_var(--si-line-2)]'
                : 'text-t2 hover:bg-bg3/70 hover:text-t1'
            ].join(' ')}
          >
            {active ? <span className="accent-gradient absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-pill" /> : null}
            <Icon size={17} className={active ? 'text-accent' : 'text-t3 group-hover:text-accent'} />
            {!collapsed ? <span className="flex-1 truncate">{ROUTE_LABELS[item.key]}</span> : null}
            {badgeValue > 0 ? (
              <span aria-hidden="true" className={`rounded-pill bg-accent3/25 px-1.5 py-0.5 text-[11px] font-medium text-accent ${collapsed ? 'absolute right-1 top-1' : ''}`}>
                {badgeValue}
              </span>
            ) : null}
          </button>
        )
      })}

      {!collapsed ? (
        <div className="mt-auto space-y-2 px-1 pt-4">
          <div className="rounded-xl border border-line bg-bg2/60 px-3 py-2.5">
            <p className="text-[11px] text-t3">本地数据库</p>
            <p className="mt-0.5 text-xs text-t2">{(counts?.play_sessions ?? 0).toLocaleString('zh-CN')} 条游玩记录</p>
          </div>
          <p className="px-2 text-[11px] leading-relaxed text-t3">
            数据来源：Steam 官方 OpenID 与 Web API
            <br />
            所有统计优先读取本地 SQLite
          </p>
        </div>
      ) : null}
    </nav>
  )
}
