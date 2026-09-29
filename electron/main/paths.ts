/**
 * 主进程路径常量。集中管理 userData 下的文件落点，避免各处硬编码。
 */
import path from 'node:path'
import { app } from 'electron'

/** 应用数据目录（app.getPath('userData')），所有持久化文件都放这里。 */
export const userDataDir: string = app.getPath('userData')

/** SQLite 真实数据库文件。db.export() 的字节写这里，启动时优先读取。 */
export const dbPath: string = path.join(userDataDir, 'steam-insight.db')

/** 设置 JSON 文件路径（settings.ts 用）。 */
export const settingsPath: string = path.join(userDataDir, 'settings.json')

/** 应用版本（关于页展示）。 */
export const appVersion: string = app.getVersion()
