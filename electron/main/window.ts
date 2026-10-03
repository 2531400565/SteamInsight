/**
 * 主窗口创建与生命周期。
 * 1560×980 / min 1280×720 / frame:false / 背景深色 / show:false + ready-to-show 才显示。
 * 预加载 contextIsolation + 无 nodeIntegration + sandbox:false。外部链接一律 shell.openExternal。
 * 最大化状态变化通过 window:maximized-changed 广播给渲染层（用于切换窗口按钮图标）。
 * minimizeToTray 为 true 时，点关闭只隐藏不退出（在 win 的 close 事件里拦截）。
 */
import { BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { CH } from '@shared/channels'
import { getSettings } from './settings'
import { logError, logWarn } from './logger'
import { isSafeExternalUrl } from './safe-url'

let win: BrowserWindow | null = null

export function createWindow(): BrowserWindow {
  win = new BrowserWindow({
    width: 1560, height: 980, minWidth: 1280, minHeight: 720,
    frame: false, show: false, backgroundColor: '#0e1621',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: true —— preload 里只用 contextBridge / ipcRenderer（没有任何 Node API），
      // 开沙箱不损失功能，却能让「渲染层被注入任意代码」这条攻击路径的门槛显著提高。
      // 之前是 false，等于白白放弃了 Electron 默认给的一层防护。
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win?.show())

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) void win.loadURL(rendererUrl)
  else void win.loadFile(path.join(__dirname, '../renderer/index.html'))

  // 渲染层里 window.open / target=_blank 会走到这里。
  // **协议白名单是必须的**：`shell.openExternal` 把地址交给系统 shell 处理，
  // 放任 file:// 或自定义协议等于给了渲染层一个任意程序启动入口 ——
  // 只要界面上出现一次 XSS（Steam 返回的游戏名、成就名都是外部文本），就能借它执行本地程序。
  // 规则与 IPC 的 openExternal 保持一致，两条路径不能一个严一个松。
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url)
    else logWarn('window', '已拦截不安全的外部链接', { url: url.slice(0, 120) })
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) { event.preventDefault(); void shell.openExternal(url) }
  })

  // 渲染进程崩溃（OOM / GPU 进程挂掉）时，窗口会变成一片空白且毫无说明 ——
  // 用户看到白窗只知道「坏了」，既不知道发生了什么也不知道能不能恢复。
  // 这里主动记日志并尝试重载；重载失败超过 3 次就不再打扰（避免无限循环刷屏）。
  let reloadAttempts = 0
  win.webContents.on('render-process-gone', (_e, details) => {
    logError('app', '渲染进程崩溃', { reason: details.reason, exitCode: details.exitCode, attempt: reloadAttempts + 1 })
    if (reloadAttempts >= 3) {
      logError('app', '渲染进程反复崩溃，已停止自动重载，请重启应用', { attempts: reloadAttempts })
      return
    }
    reloadAttempts += 1
    setTimeout(() => {
      if (win && !win.isDestroyed()) win.webContents.reload()
    }, 1200)
  })
  win.webContents.on('did-finish-load', () => { reloadAttempts = 0 })

  win.on('maximize', () => win?.webContents.send(CH.windowMaximizedChanged, true))
  win.on('unmaximize', () => win?.webContents.send(CH.windowMaximizedChanged, false))
  // 最小化到托盘：拦截 close，改为隐藏
  win.on('close', (event) => {
    if (getSettings().minimizeToTray && !forceQuit) { event.preventDefault(); win?.hide() }
  })

  return win
}

let forceQuit = false
/** 退出前标记，确保真正退出（用于托盘「退出」）。 */
export function setForceQuit(v: boolean): void { forceQuit = v }

export function getMainWindow(): BrowserWindow | null { return win }
export function isMaximized(): boolean { return win?.isMaximized() ?? false }
export function toggleMaximize(): void {
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
}
export function destroyWindow(): void { win = null }
