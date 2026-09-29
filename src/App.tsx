import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'
import { AppLayout } from '@/layouts/AppLayout'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Logo } from '@/components/layout/Logo'
import { Button, EmptyState, Skeleton } from '@/components/ui'
import { useAppStore, ROUTE_LABELS } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import AchievementsPage from '@/pages/AchievementsPage'
import AchievementHuntPage from '@/pages/AchievementHuntPage'
import AnalysisPage from '@/pages/AnalysisPage'
import ComparePage from '@/pages/ComparePage'
import DashboardPage from '@/pages/DashboardPage'
import GameDetailPage from '@/pages/GameDetailPage'
import LibraryPage from '@/pages/LibraryPage'
import SettingsPage from '@/pages/SettingsPage'
import StorePage from '@/pages/StorePage'
import WelcomePage from '@/pages/WelcomePage'
import WishlistPage from '@/pages/WishlistPage'
import WrappedPage from '@/pages/WrappedPage'

function Splash({ message }: { message: string }) {
  return (
    <div className="app-aurora flex h-screen flex-col items-center justify-center gap-6 bg-app">
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Logo size={54} />
        <h1 className="text-xl font-semibold text-t1">Steam Insight</h1>
        <p className="text-sm text-t3">{message}</p>
      </div>
      <div className="relative z-10 grid w-[420px] grid-cols-3 gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  )
}

function CurrentPage() {
  const route = useAppStore((s) => s.route)
  const params = useAppStore((s) => s.params)
  const navigate = useAppStore((s) => s.navigate)
  const snapshot = useDataStore((s) => s.snapshot)
  const derived = useDataStore((s) => s.derived)

  if (route === 'welcome') return <WelcomePage />
  if (!snapshot || !derived) {
    return (
      <EmptyState
        icon={<TriangleAlert size={26} />}
        title="正在读取本地数据"
        description="如果长时间没有反应，请到「设置 → 数据」里重新同步一次。"
        action={<Button onClick={() => void useDataStore.getState().load()}>重新读取</Button>}
      />
    )
  }

  switch (route) {
    case 'dashboard':
      return <DashboardPage />
    case 'analysis':
      return <AnalysisPage />
    case 'library':
      return <LibraryPage />
    case 'compare':
      return <ComparePage />
    case 'achievements':
      return <AchievementsPage />
    case 'hunt':
      return <AchievementHuntPage />
    case 'store':
      return <StorePage />
    case 'wishlist':
      return <WishlistPage />
    case 'wrapped':
      return <WrappedPage year={params.year} period={params.period} key={params.key} exportMode={params.exportMode} />
    case 'settings':
      return <SettingsPage />
    case 'game': {
      const game = params.appId !== undefined ? derived.gameIndex.get(params.appId) : undefined
      const backTo = params.from && params.from !== 'game' ? params.from : 'analysis'
      if (!game) {
        return (
          <EmptyState
            icon={<TriangleAlert size={26} />}
            title="找不到这款游戏"
            description="它可能已从游戏库中移除，或者链接已失效。"
            action={<Button onClick={() => navigate(backTo)}>返回{ROUTE_LABELS[backTo]}</Button>}
          />
        )
      }
      return <GameDetailPage game={game} />
    }
    default:
      return <DashboardPage />
  }
}

export default function App() {
  const route = useAppStore((s) => s.route)
  const params = useAppStore((s) => s.params)
  const booted = useAppStore((s) => s.booted)
  const loading = useAppStore((s) => s.loading)
  const bootError = useAppStore((s) => s.error)
  const lastSyncAt = useAppStore((s) => s.sync.lastSyncAt)
  const bootstrap = useAppStore((s) => s.bootstrap)
  const navigate = useAppStore((s) => s.navigate)

  // Esc 返回上一页等全局快捷键（N2-3）
  useKeyboardShortcuts()

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  // 主进程就绪后读一次快照；每次同步**结束**后再读一次，保证页面看到的是落库后的数据。
  //
  // 依赖里刻意**不含** sync.running：它在一次同步里翻转两次（开始 true / 结束 false），
  // 带上它会让 load() 在同步刚启动的那一刻跑一次 —— 那时库里还是旧数据，
  // 等于把整个 derived（展开 4536 条成就、重排 ranking、重算最近 30 天序列）白算一遍，
  // 同步结束后还得再算一次。
  // `lastSyncAt` 只在同步成功的收尾更新，正好是我们要的时机。
  useEffect(() => {
    if (booted) void useDataStore.getState().load()
  }, [booted, lastSyncAt])

  if (!booted || loading) return <Splash message="正在初始化本地数据库…" />

  if (bootError) {
    return (
      <div className="app-aurora flex h-screen items-center justify-center bg-app p-10">
        <div className="relative z-10 w-[560px]">
          <EmptyState
            icon={<TriangleAlert size={26} />}
            title="启动失败"
            description={bootError}
            action={
              <Button
                onClick={() => {
                  navigate('welcome')
                  void bootstrap()
                }}
              >
                重试
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  if (route === 'welcome') return <CurrentPage />

  return (
    <>
      <AppLayout>
        <div key={`${route}-${JSON.stringify(params)}`} className="page-enter">
          <CurrentPage />
        </div>
      </AppLayout>
      {/* 命令面板放在 AppLayout 之外：它不该跟着页面 key 一起重挂载，否则每次跳转都会把输入清掉 */}
      <CommandPalette />
    </>
  )
}
