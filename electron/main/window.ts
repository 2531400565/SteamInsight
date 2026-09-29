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

let win: BrowserWindow | null = null

export function createWindow(): BrowserWindow {
  win = new BrowserWindow({
    width: 1560, height: 980, minWidth: 1280, minHeight: 720,
    frame: false, show: false, backgroundColor: '#0e1621',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  })

  win.once('ready-to-show', () => win?.show())

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) void win.loadURL(rendererUrl)
  else void win.loadFile(path.join(__dirname, '../renderer/index.html'))

  win.webContents.setWindowOpenHandler(({ url }) => { void shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) { event.preventDefault(); void shell.openExternal(url) }
  })

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
