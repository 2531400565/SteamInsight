import type { RouteKey } from '@/store/useAppStore'

/**
 * 页面 chunk 预热表。
 *
 * 路由改成 lazy 之后，点侧栏第一次进某个页面要现下载那个 chunk（本地 file:// 下也有几十到几百毫秒）。
 * 鼠标移到按钮上时就把 chunk 拿掉，等真正点下去时通常已经是热的 —— 这是把「懒加载的代价」
 * 从「每次切页都能感觉到」压到「几乎察觉不到」最省事的办法。
 *
 * 用动态 import 的写法与 App.tsx 里的 lazy 保持一致，vite 会复用同一个 chunk，不会重复下载。
 */
const LOADERS: Record<RouteKey, () => Promise<unknown>> = {
  dashboard: () => import('@/pages/DashboardPage'),
  analysis: () => import('@/pages/AnalysisPage'),
  library: () => import('@/pages/LibraryPage'),
  compare: () => import('@/pages/ComparePage'),
  achievements: () => import('@/pages/AchievementsPage'),
  hunt: () => import('@/pages/AchievementHuntPage'),
  store: () => import('@/pages/StorePage'),
  wishlist: () => import('@/pages/WishlistPage'),
  wrapped: () => import('@/pages/WrappedPage'),
  career: () => import('@/pages/CareerPage'),
  settings: () => import('@/pages/SettingsPage'),
  game: () => import('@/pages/GameDetailPage'),
  welcome: () => import('@/pages/WelcomePage')
}

const warmed = new Set<RouteKey>()

/** 预热某个页面的代码块；已预热过或加载失败都直接返回（失败也不该影响导航）。 */
export function prefetchRoute(key: RouteKey): void {
  if (warmed.has(key)) return
  const loader = LOADERS[key]
  if (!loader) return
  warmed.add(key)
  void loader().catch(() => { warmed.delete(key) })
}
