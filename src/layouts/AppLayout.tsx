import { useEffect, type ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TitleBar } from '@/components/layout/TitleBar'
import { AccountSwitchBanner } from '@/components/layout/AccountSwitchBanner'
import { ShortcutsHelp } from '@/components/shared/ShortcutsHelp'
import { useDensity } from '@/hooks/useDensity'

/** 主框架：顶部栏 + 左侧固定导航 + 右侧内容区（内容区自己滚动）。 */
export function AppLayout({ children }: { children: ReactNode }) {
  // O-7：把密度写到 <html data-density>，全局 CSS 据此收窄间距
  const [density] = useDensity()
  useEffect(() => {
    document.documentElement.setAttribute('data-density', density)
  }, [density])

  return (
    <div className="app-aurora flex h-screen flex-col bg-app text-t1">
      <TitleBar />
      <div className="relative z-10 flex min-h-0 flex-1">
        <Sidebar />
        {/* O-4：`<main>` 是读屏用户的「跳到正文」锚点。没有它，每次 Tab 都要先穿过十个导航按钮 */}
        <main aria-label="主内容区" className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1460px] px-6 py-6">
            {/* 换账号提示放在内容区最上方：它解释的是「库里的数据为什么变了」，
                属于全局事件，挂在布局里比塞进首页更不容易被错过。 */}
            <AccountSwitchBanner />
            {children}
          </div>
        </main>
      </div>
      {/* V4 / F-7：? 键呼出的快捷键清单（portal 到 body） */}
      <ShortcutsHelp />
    </div>
  )
}
