/**
 * 托盘图标解析。
 *
 * 单独成文件是为了能被探针直接调用 —— notifications.ts 会 `import ./sync`，
 * 而 sync → database → paths 在模块顶层就摸 app.getPath()，连带拉起整个启动链。
 *
 * 踩过的坑：这里的候选路径曾经写成 `resourcesPath/icon.png` 与 `appPath/public/icon.png`，
 * 两个都不存在 —— `public/` 下只有 favicon.svg，而 `build/` 是 electron-builder 的
 * buildResources 目录、默认不进 app（files 里也排除了 `!build/**`）。
 * 结果是 nativeImage.createEmpty()，`new Tray(空图)` 不报错但托盘里什么都看不见，
 * 全链路静默。所以现在：资源显式进包（见 electron-builder.yml 的 extraResources）、
 * 路径取不到就 console.warn，不再无声无息。
 *
 * 另外托盘图标不能直接把 256×256 丢给壳层：这个标志的外环笔画只有 12/256，
 * 缩到托盘尺寸（100% 缩放 16px、150% 24px）后不足 1.5px，再插值一次就糊没了 ——
 * 所以 build/tray.png 是把底板抠掉、笔画加粗一档后单独出的一版。
 */
import path from 'node:path'
import { app, nativeImage, screen, type NativeImage } from 'electron'

/**
 * 候选路径，按优先级：
 * 1. 打包态：extraResources 把 build/tray.png 复制成 process.resourcesPath/tray.png
 * 2. 开发态：electron-vite 以项目根为 appPath
 * 3. 开发态兜底：主进程产物固定落在 out/main/，往上两级就是项目根 ——
 *    这条不依赖 app.getAppPath() 的语义（它随「怎么启动 Electron」变，
 *    例如以脚本形式启动时 appPath 是脚本所在目录，2 就会落空）
 * 4. 兜底：万一只带了 app 图标，有总比没有强（打包态它同样不存在，无害）
 */
export function trayIconCandidates(): string[] {
  return [
    `${process.resourcesPath}/tray.png`,
    `${app.getAppPath()}/build/tray.png`,
    path.resolve(__dirname, '../../build/tray.png'),
    `${process.resourcesPath}/icon.png`
  ]
}

/**
 * 目标像素尺寸。Windows 托盘图标在 100% 缩放下是 16×16，按屏幕缩放比取整后
 * 自己缩放，避免把大图丢给壳层二次插值。
 */
export function trayIconSize(): number {
  try {
    const sf = screen.getPrimaryDisplay().scaleFactor
    return Math.max(16, Math.round(16 * (sf || 1)))
  } catch {
    return 16
  }
}

/** 返回第一个能解出有效位图的候选路径；全都拿不到时返回 null。 */
export function resolveTrayIconPath(): string | null {
  for (const c of trayIconCandidates()) {
    try {
      if (!nativeImage.createFromPath(c).isEmpty()) return c
    } catch { /* 试下一个 */ }
  }
  return null
}

/** 解析托盘图标：拿不到时返回空图并留下警告（曾经这里连警告都没有）。 */
export function resolveTrayIcon(): NativeImage {
  const p = resolveTrayIconPath()
  if (!p) {
    console.warn('[tray] 未找到托盘图标资源，托盘图标将不可见。候选路径：', trayIconCandidates())
    return nativeImage.createEmpty()
  }
  const size = trayIconSize()
  return nativeImage.createFromPath(p).resize({ width: size, height: size, quality: 'best' })
}
