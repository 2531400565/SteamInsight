import { useEffect, useRef, useState } from 'react'
import { ArrowRightLeft, ChevronDown, LogIn, LogOut, Search, Settings, UserCog } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { personaStateLabel } from '@/utils/format'
import { useRecentAccounts, type RecentAccount } from '@/hooks/useRecentAccounts'
import { Logo } from './Logo'
import { NetworkPopover } from '@/components/layout/NetworkPopover'
import { SyncIndicator } from './SyncIndicator'
import { WindowControls } from './WindowControls'

function Avatar({ src, name }: { src: string; name: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="flex size-8 items-center justify-center rounded-pill accent-gradient text-xs font-semibold text-white">
        {(name || '?').slice(0, 1).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setBroken(true)}
      className="size-8 rounded-pill border border-line2 object-cover"
    />
  )
}

const MENU_ITEM =
  'no-drag flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-t2 transition-colors hover:bg-bg4 hover:text-t1'

/** 顶部栏：标题 + 账号菜单 + 同步状态 + 设置 + 窗口按钮，整条可拖动窗口。 */
export function TitleBar() {
  const user = useDataStore((s) => s.snapshot?.user)
  const navigate = useAppStore((s) => s.navigate)
  const route = useAppStore((s) => s.route)
  const previewMode = useAppStore((s) => s.previewMode)
  const settings = useAppStore((s) => s.settings)
  const patchSettings = useAppStore((s) => s.patchSettings)
  const demoMode = useAppStore((s) => s.settings.enableDemoData)
  const logout = useAppStore((s) => s.logout)
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen)
  const state = personaStateLabel(user?.personaState)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // V5 优化 4：最近账号快捷切换。TitleBar 常驻，把「记住账号」的效果放在这里，
  // 登录 / 切换在任何页面发生都能被记下来（设置页 AccountSection 里还有一份同款效果，互为冗余但不冲突）。
  const { recent, remember } = useRecentAccounts()
  useEffect(() => {
    if (settings.steamId) remember(settings.steamId, user?.personaName)
  }, [settings.steamId, user?.personaName, remember])
  const otherAccounts = recent.filter((r) => r.steamId !== settings.steamId)
  // 正在切换的账号 id（'' = 空闲）。切换期间整个菜单的切换项全部禁用，防连点。
  const [switchingId, setSwitchingId] = useState('')

  /**
   * 顶栏一键切换：与设置页 switchAccount 同一条链路 ——
   * patchSettings({steamId}) → runSync('api')，数据面（清旧会话 / 换账号策略）完全交给 sync 的 F-4 逻辑。
   * 同步结束后 App.tsx 依赖 lastSyncAt 自动重读快照，界面随之切到新账号的数据。
   */
  const quickSwitch = async (target: RecentAccount): Promise<void> => {
    if (switchingId) return
    setSwitchingId(target.steamId)
    setMenuOpen(false)
    await patchSettings({ steamId: target.steamId })
    await useAppStore.getState().runSync('api')
    setSwitchingId('')
  }

  // 点击空白处或按 Esc 关闭菜单
  useEffect(() => {
    if (!menuOpen) return
    const onMouseDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="drag relative z-20 flex h-[54px] shrink-0 items-center gap-4 border-b border-line bg-bg1/70 px-4 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => navigate('dashboard')}
        className="no-drag flex items-center gap-2.5"
        title="返回首页"
      >
        <Logo size={26} />
        <span className="text-[15px] font-semibold tracking-tight text-t1">Steam Insight</span>
        <span className="hidden rounded-pill border border-line px-1.5 py-[1px] text-[10px] text-t3 lg:inline">v1.0</span>
      </button>

      <div className="ml-auto flex items-center gap-3">
        {/* 命令面板入口：快捷键是 Ctrl+K，但只写快捷键等于没入口，所以给一个可点的 */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          title="搜索游戏 / 跳转页面（Ctrl+K）"
          className="no-drag hidden items-center gap-2 rounded-pill border border-line bg-bg2/70 py-1.5 pl-2.5 pr-1.5 text-[12px] text-t3 transition-colors hover:border-line3 hover:text-t1 md:flex"
        >
          <Search size={13} />
          <span>搜索</span>
          <kbd className="rounded border border-line bg-bg3 px-1.5 py-0.5 text-[10px] text-t3">Ctrl K</kbd>
        </button>

        {previewMode ? (
          <span
            className="rounded-pill border border-warn/40 bg-warn/12 px-2.5 py-1 text-[11px] text-warn"
            title="未连接 Electron 主进程，当前使用内置演示数据（浏览器预览模式）"
          >
            预览模式 · 演示数据
          </span>
        ) : null}

        <NetworkPopover />
        <SyncIndicator />

        {user ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="账号菜单：快捷切换最近账号或退出登录"
              className="no-drag flex items-center gap-2.5 rounded-pill border border-line bg-bg2/70 py-1 pl-1 pr-2.5 transition-colors hover:border-line3 hover:bg-bg4"
            >
              <Avatar src={user.avatarUrl} name={user.personaName} />
              <div className="text-left leading-tight">
                <p className="max-w-[140px] truncate text-xs font-medium text-t1">{user.personaName}</p>
                <p className={`text-[10px] ${state.tone === 'ok' ? 'text-ok' : state.tone === 'warn' ? 'text-warn' : 'text-t3'}`}>
                  {state.label}
                </p>
              </div>
              <ChevronDown size={13} className={`shrink-0 text-t3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                data-esc-layer="account-menu"
                className="no-drag absolute right-0 top-[calc(100%+8px)] w-[252px] rounded-2xl border border-line bg-bg2/95 p-1.5 shadow-2xl backdrop-blur-xl"
              >
                <div className="px-2.5 py-2">
                  <p className="text-[11px] text-t3">
                    {demoMode ? '当前使用本地演示数据' : '已连接 Steam 账号'}
                  </p>
                  <p className="mt-0.5 truncate text-[12.5px] font-medium text-t1">{user.personaName}</p>
                  {user.steamId ? (
                    <p className="mt-0.5 truncate text-[10.5px] text-t3">SteamID64 {user.steamId}</p>
                  ) : null}
                </div>

                <div className="my-1 border-t border-line" />

                {/* V5 优化 4：最近账号快捷切换（排除当前账号；演示模式 settings.steamId 为空 → 全部账号都可切换） */}
                {otherAccounts.length > 0 ? (
                  <>
                    <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] text-t3">最近账号 · 点击切换并同步</p>
                    {otherAccounts.map((r) => (
                      <button
                        key={r.steamId}
                        type="button"
                        role="menuitem"
                        disabled={!!switchingId}
                        className={MENU_ITEM}
                        title={`切换到 ${r.personaName || r.steamId}，会用该账号重新同步`}
                        onClick={() => void quickSwitch(r)}
                      >
                        <ArrowRightLeft size={14} className="shrink-0 text-t3" />
                        <span className="min-w-0 flex-1 truncate">
                          {r.personaName || `SteamID64 …${r.steamId.slice(-4)}`}
                          {r.personaName ? <span className="ml-1 text-[10.5px] text-t3">…{r.steamId.slice(-4)}</span> : null}
                        </span>
                      </button>
                    ))}
                    <div className="my-1 border-t border-line" />
                  </>
                ) : null}

                <button
                  type="button"
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('settings')
                  }}
                >
                  <UserCog size={14} className="shrink-0 text-t3" />
                  账号与登录设置
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={MENU_ITEM}
                  onClick={() => {
                    setMenuOpen(false)
                    void logout()
                  }}
                >
                  <LogOut size={14} className="shrink-0 text-t3" />
                  退出登录
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('welcome')}
            title="前往登录页"
            className="no-drag flex items-center gap-1.5 rounded-pill border border-line bg-bg2/70 px-3 py-1.5 text-xs text-t2 transition-colors hover:border-line3 hover:bg-bg4 hover:text-t1"
          >
            <LogIn size={14} />
            登录 Steam 账号
          </button>
        )}

        <button
          type="button"
          aria-label="打开设置"
          title="设置"
          onClick={() => navigate('settings')}
          className={[
            'no-drag flex size-8 items-center justify-center rounded-pill transition-colors',
            route === 'settings' ? 'bg-accent3/20 text-accent' : 'text-t2 hover:bg-bg4 hover:text-t1'
          ].join(' ')}
        >
          <Settings size={16} />
        </button>

        <div className="ml-1 self-stretch border-l border-line" />
        <WindowControls />
      </div>
    </header>
  )
}
