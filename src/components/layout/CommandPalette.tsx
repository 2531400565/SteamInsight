import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import {
  Bell, ChartPie, Crosshair, Gamepad2, GitCompareArrows, Heart, Info, Keyboard, LayoutDashboard, Library,
  Monitor, Palette, Power, Search, Settings, Settings2, Sparkles, Store, Trophy, UserCog, Database
} from 'lucide-react'
import { Badge } from '@/components/ui'
import { useAppStore, ROUTE_LABELS, type RouteKey } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'

interface Item {
  id: string
  group: '页面' | '设置' | '游戏'
  label: string
  hint?: string
  icon: ReactNode
  run: () => void
}

/** 设置页各节的锚点（与 SettingsPage 里 `settings-<id>` 一一对应）。 */
const SETTINGS_SECTIONS: Array<{ id: string; label: string; icon: React.ReactNode }> = [
  { id: 'general', label: '通用 · 启动与同步', icon: <Power size={14} /> },
  { id: 'notify', label: '通知', icon: <Bell size={14} /> },
  { id: 'appearance', label: '外观 · 主题', icon: <Palette size={14} /> },
  { id: 'account', label: '账号与登录', icon: <UserCog size={14} /> },
  { id: 'network', label: '连通性自检', icon: <Monitor size={14} /> },
  { id: 'data', label: '数据 · 数据包 / 诊断包', icon: <Database size={14} /> },
  { id: 'about', label: '关于本应用', icon: <Info size={14} /> }
]

/** 命令面板里出现的页面（welcome / game 不出现：前者是登录页，后者需要 appId）。 */
const NAV_ROUTES: Array<{ key: RouteKey; icon: React.ReactNode }> = [
  { key: 'dashboard', icon: <LayoutDashboard size={14} /> },
  { key: 'analysis', icon: <Gamepad2 size={14} /> },
  { key: 'library', icon: <Library size={14} /> },
  { key: 'compare', icon: <GitCompareArrows size={14} /> },
  { key: 'achievements', icon: <Trophy size={14} /> },
  { key: 'hunt', icon: <Crosshair size={14} /> },
  { key: 'store', icon: <Store size={14} /> },
  { key: 'wishlist', icon: <Heart size={14} /> },
  { key: 'wrapped', icon: <Sparkles size={14} /> },
  { key: 'settings', icon: <Settings size={14} /> }
]

/** 简单的子序列匹配：query 的字符按顺序出现在 text 里即命中（"gta" 能匹配 "Grand Theft Auto"）。 */
function fuzzy(text: string, query: string): boolean {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (!q) return true
  if (t.includes(q)) return true
  let i = 0
  for (const ch of t) {
    if (ch === q[i]) i += 1
    if (i === q.length) return true
  }
  return false
}

/**
 * 全局命令面板（N2-2）。
 *
 * 为什么需要：库里有几十款游戏，想直达某一款此前只能「点游戏库 → 页内搜索」；
 * 跨页跳转（去愿望单、去设置里的某一节）全靠点。桌面应用里 Ctrl+K 是通用手势。
 *
 * 路由完全在内存里（没有 hash 路由），所以这里的每一项都只是调用 `navigate()`，
 * 不涉及任何 URL 处理 —— 也因此 Esc 返回、跳设置分节这类能力都得由 store 配合提供。
 */
export function CommandPalette() {
  const open = useAppStore((s) => s.paletteOpen)
  const setOpen = useAppStore((s) => s.setPaletteOpen)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const navigate = useAppStore((s) => s.navigate)
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen)
  const games = useDataStore((s) => s.snapshot?.games) ?? []

  const items = useMemo<Item[]>(() => {
    const out: Item[] = []
    for (const r of NAV_ROUTES) {
      out.push({
        id: `route:${r.key}`,
        group: '页面',
        label: ROUTE_LABELS[r.key],
        icon: r.icon,
        run: () => navigate(r.key)
      })
    }
    // V4 / F-7：快捷键清单入口（也可以直接按 ? 呼出）
    out.push({
      id: 'shortcuts',
      group: '设置',
      label: '设置 · 键盘快捷键清单',
      icon: <Keyboard size={14} />,
      run: () => setShortcutsOpen(true)
    })
    for (const s of SETTINGS_SECTIONS) {
      out.push({
        id: `settings:${s.id}`,
        group: '设置',
        label: `设置 · ${s.label}`,
        icon: <Settings2 size={14} />,
        run: () => navigate('settings', { tab: s.id })
      })
    }
    for (const g of games.slice(0, 400)) {
      out.push({
        id: `game:${g.appId}`,
        group: '游戏',
        label: g.name,
        hint: `${g.developer || '未知开发商'}${g.playtimeForeverMin > 0 ? ` · ${Math.round(g.playtimeForeverMin / 60)} 小时` : ''}`,
        icon: <Gamepad2 size={14} />,
        run: () => navigate('game', { appId: g.appId, from: 'dashboard' })
      })
    }
    return out
  }, [games, navigate, setShortcutsOpen])

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) {
      // 空查询时只展示「页面 + 设置」，不把几十款游戏一次性铺出来
      return items.filter((i) => i.group !== '游戏').slice(0, 18)
    }
    const hit = items.filter((i) => fuzzy(i.label, q) || (i.hint ? fuzzy(i.hint, q) : false))
    // 游戏类命中最多 10 条，避免一次列表全是游戏把「去设置」这类入口挤没
    const games = hit.filter((i) => i.group === '游戏').slice(0, 10)
    const rest = hit.filter((i) => i.group !== '游戏')
    return [...rest, ...games].slice(0, 24)
  }, [items, query])

  // 打开时重置，关闭时清空草稿
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      // 面板刚挂载时 input 还没渲染完，放到下一个 tick 再聚焦
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (active >= results.length) setActive(0)
  }, [results.length, active])

  // 全局快捷键：Ctrl/Cmd + K 开关面板
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const choose = (item: Item | undefined): void => {
    if (!item) return
    setOpen(false)
    item.run()
  }

  const onKeyDown = (e: ReactKeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (results.length === 0 ? 0 : (i + 1) % results.length))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    }
  }

  return (
    <div
      data-esc-layer="palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        className="pop-enter w-full max-w-[620px] overflow-hidden rounded-2xl border border-line2 bg-bg2/97 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search size={16} className="shrink-0 text-t3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="搜索游戏，或跳转到页面 / 设置…"
            aria-label="搜索游戏或跳转"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
          />
          <Badge tone="neutral" size="xs">
            Esc 关闭
          </Badge>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-t3">没有匹配的结果。试试游戏名的前几个字母。</p>
          ) : (
            results.map((item, index) => {
              const isActive = index === active
              const prevGroup = results[index - 1]?.group
              return (
                <div key={item.id}>
                  {item.group !== prevGroup ? (
                    <p className="px-3 pb-1 pt-2.5 text-[10.5px] font-medium tracking-wider text-t3 uppercase">{item.group}</p>
                  ) : null}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(item)}
                    className={[
                      'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors',
                      isActive ? 'bg-accent3/20 text-t1' : 'text-t2 hover:bg-bg3'
                    ].join(' ')}
                  >
                    <span className={isActive ? 'text-accent' : 'text-t3'}>{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{item.label}</span>
                    {item.hint ? <span className="shrink-0 truncate text-[11px] text-t3">{item.hint}</span> : null}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-t3">
          <span>↑↓ 选择</span>
          <span>Enter 打开</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <ChartPie size={11} />
            共 {games.length} 款游戏可直达
          </span>
        </div>
      </div>
    </div>
  )
}
