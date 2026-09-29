import { usePersistedState } from './usePersistedState'

export type Density = 'comfortable' | 'compact'

/**
 * 界面密度（V4 / O-7）：舒适 / 紧凑。
 *
 * 持久化在 localStorage（视觉偏好，不进设置文件、不进数据包），
 * 全局只此一份：AppLayout 负责把当前值写到 `<html data-density>`，
 * 全局 CSS 据此收窄间距；设置页的「外观」提供切换。
 */
export function useDensity(): [Density, (v: Density) => void] {
  return usePersistedState<Density>('density', 'comfortable')
}
