/**
 * 桌面通知 + 托盘。
 * - 通知点击：显示主窗口并通过 navigate 通道把 route 推给渲染进程。
 * - 托盘菜单：显示主窗口 / 同步状态（含下次同步倒计时）/ 立即同步 / 打开愿望单 / 退出；双击显示窗口。
 * - settings.minimizeToTray 为 true 时，点关闭只隐藏不退出（由 window.ts 调用 shouldMinimizeToTray）。
 * - 托盘图标的路径解析与尺寸换算在 tray-icon.ts（单独成文件是为了能被探针直接调用）。
 */
import { app, BrowserWindow, Notification, Tray, Menu, type MenuItemConstructorOptions } from 'electron'
import { CH } from '@shared/channels'
import type { NotifyPayload } from '@shared/contract'
import { getSettings, setSettings } from './settings'
import { run as runSync, getSyncStatus, isRunning } from './sync'
import { resolveTrayIcon } from './tray-icon'
import { logInfo, logWarn } from './logger'

let mainWin: BrowserWindow | null = null
let tray: Tray | null = null
let menuTimer: NodeJS.Timeout | null = null

export function initNotifications(win: BrowserWindow): void { mainWin = win }

/** 显示窗口并按需跳转路由。 */
function showWindow(route?: string): void {
  if (!mainWin) return
  if (mainWin.isMinimized()) mainWin.restore()
  mainWin.show()
  if (route) mainWin.webContents.send(CH.navigate, { route })
}

/** 通知点击后跳转。 */
function onNotifyClick(route?: string): void { showWindow(route) }

/** 弹出一条通知。 */
export function notify(payload: NotifyPayload): Promise<{ ok: boolean }> {
  try {
    if (!Notification.isSupported()) return Promise.resolve({ ok: false })
    const n = new Notification({ title: payload.title, body: payload.body, silent: false })
    n.on('click', () => onNotifyClick(payload.route))
    n.show()
    return Promise.resolve({ ok: true })
  } catch {
    return Promise.resolve({ ok: false })
  }
}

/* ------------------------- 托盘菜单文案 ------------------------- */

/** 「3 分钟前」/「刚刚」/「从未」。主进程不能引用渲染层的 utils（不在 tsconfig.node 的 include 里），所以就地实现。 */
function relativeTime(ms: number | null): string {
  if (!ms) return '从未'
  const diff = (Date.now() - ms) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

/** 下次自动同步的倒计时。autoSync 关闭或从未同步过时给出说明文案。 */
function nextSyncText(): string {
  const s = getSettings()
  if (!s.autoSync) return '已关闭'
  const last = getSyncStatus().lastSyncAt
  if (!last) return '等待首次同步'
  const remainSec = Math.round((last + s.syncIntervalMin * 60000 - Date.now()) / 1000)
  if (remainSec <= 0) return '随时'
  const min = Math.ceil(remainSec / 60)
  return min <= 1 ? '不到 1 分钟' : `${min} 分钟`
}

/** 同步状态一行文案：进行中优先，其次失败，最后是上次同步时间。 */
function syncStateText(): string {
  const st = getSyncStatus()
  if (st.running) return `${st.message || '同步中'}（${st.progress}%）`
  if (st.lastSyncOk === false) return `上次失败：${st.lastError ?? '未知原因'}`
  return relativeTime(st.lastSyncAt)
}

/** 重建托盘菜单。展示项（enabled:false）随状态刷新，所以每分钟重建一次。 */
function buildTrayMenu(): Menu {
  const settings = getSettings()
  const syncing = isRunning()
  const template: MenuItemConstructorOptions[] = [
    { label: '显示主窗口', click: () => showWindow() },
    { type: 'separator' },
    { label: `上次同步：${syncStateText()}`, enabled: false },
    { label: `下次同步：${settings.autoSync ? nextSyncText() : '已暂停'}`, enabled: false },
    { type: 'separator' },
    {
      label: syncing ? '正在同步…' : '立即同步（强制刷新）',
      enabled: !syncing,
      click: () => { void runSync({ force: true }) }
    },
    // 自动同步开关：以前只能在设置页里改，想临时停掉定时同步（比如正在玩游戏、怕它抢网络）
    // 必须先打开主窗口 —— 托盘右键是最顺手的地方，放在这里。
    {
      label: settings.autoSync ? '暂停自动同步' : '恢复自动同步',
      click: () => {
        const next = !getSettings().autoSync
        setSettings({ ...getSettings(), autoSync: next })
        logInfo('tray', next ? '已恢复自动同步' : '已暂停自动同步', { intervalMin: getSettings().syncIntervalMin })
        refreshTray()
      }
    },
    { label: '打开愿望单', click: () => showWindow('wishlist') },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]
  return Menu.buildFromTemplate(template)
}

/** 刷新托盘菜单与 tooltip（同步状态变化、定时器到点时调用）。 */
export function refreshTray(): void {
  if (!tray) return
  try {
    tray.setContextMenu(buildTrayMenu())
    tray.setToolTip(`Steam Insight\n上次同步：${syncStateText()}\n下次同步：${nextSyncText()}`)
  } catch { /* 托盘不可用时忽略 */ }
}

/** 创建托盘（重复调用只更新菜单）。 */
export function createTray(): void {
  try {
    if (!tray) tray = new Tray(resolveTrayIcon())
    tray.on('double-click', () => showWindow())
    refreshTray()
    // 倒计时与「x 分钟前」都需要随时间变化；60 秒重建一次足够且开销可忽略。
    if (!menuTimer) {
      menuTimer = setInterval(refreshTray, 60000)
      menuTimer.unref?.()
    }
  } catch (e) {
    logWarn('tray', '托盘创建失败（不影响主功能）', { error: e instanceof Error ? e.message : String(e) })
  }
}

/** 是否应在关闭时最小化到托盘。 */
export function shouldMinimizeToTray(): boolean {
  return getSettings().minimizeToTray
}
