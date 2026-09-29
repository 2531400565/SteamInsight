/** 探针入口：把托盘图标解析逻辑打包出来，供 tray-probe.cjs 在 Electron 里验证。 */
export { resolveTrayIcon, resolveTrayIconPath, trayIconCandidates, trayIconSize } from '../../electron/main/tray-icon'
