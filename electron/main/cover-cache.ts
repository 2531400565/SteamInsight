/**
 * 封面本地缓存（V4/F6）。
 *
 * 之前封面全部由渲染层 `<img>` 直连 Steam CDN：每次冷启动都重新走一遍网络，
 * 弱网 / 离线时整屏字母占位，还重复烧流量。这里在主进程加一层磁盘缓存：
 *
 *   渲染层把 CDN URL 换算成 si-cover://cover/<appid>.jpg?u=<encodeURIComponent(原始URL)>
 *     → protocol handler 先查 userData/covers/<appid>.jpg
 *     → 命中直接回文件字节（0 网络）
 *     → 未命中用统一传输层（http.ts，优先 Electron net）下载，写盘后返回
 *     → 下载失败回 404，渲染层 onError 先退回直连 CDN、再失败才字母占位
 *
 * 约束：
 * - 只对 /apps/<id>/ 形态的 URL 生效（appid 是唯一缓存键），其余 URL 由渲染层原样放行；
 * - 同一 appid 的并发请求共享同一次下载（in-flight 去重），一屏多张同封面只发一次网络请求；
 * - 写盘失败不阻塞返回（磁盘满时降级为「本次会话内仍能显示」）；
 * - 缓存不做自动清理：单张 header.jpg 约 30–100KB，几百款游戏也就几十 MB，
 *   「自动清理」省的那点空间远不值得引入「封面突然全没」的困惑；
 *   V5 优化 2 起设置页提供手动清理入口（clearCoverCache），比让用户去翻目录体面。
 */
import fs from 'node:fs'
import path from 'node:path'
import { protocol } from 'electron'
import { userDataDir } from './paths'
import { fetchBuffer } from './http'
import { logInfo, logWarn } from './logger'

export const COVER_SCHEME = 'si-cover'

function coverDir(): string {
  return path.join(userDataDir, 'covers')
}

function coverFile(appId: string): string {
  return path.join(coverDir(), `${appId}.jpg`)
}

/**
 * app.ready 之前调用：把自定义协议登记为 standard + secure。
 * 不登记的话 Chromium 会把 si-cover:// 当成非标准 scheme，`<img>` 直接拒载；
 * `registerSchemesAsPrivileged` 全进程只允许调用一次，所以固定在主进程模块顶层执行。
 */
export function registerCoverSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: COVER_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ])
}

/** 同一 appid 正在进行的下载 —— 并发请求共享同一次网络往返。 */
const inflight = new Map<string, Promise<Buffer | null>>()

async function downloadCover(appId: string, sourceUrl: string): Promise<Buffer | null> {
  const existing = inflight.get(appId)
  if (existing) return existing
  const task = (async () => {
    try {
      const res = await fetchBuffer(sourceUrl, { timeoutMs: 15000 })
      if (!res.ok || !res.raw || res.raw.length === 0) {
        logWarn('cover', '封面下载失败', { appId, status: res.status, error: res.error })
        return null
      }
      // 写盘失败不阻塞返回：内存里这份仍能支撑本次会话显示
      try {
        fs.mkdirSync(coverDir(), { recursive: true })
        fs.writeFileSync(coverFile(appId), res.raw)
      } catch (e) {
        logWarn('cover', '封面写盘失败（本次会话仍可显示）', { appId, error: String(e) })
      }
      return res.raw
    } catch (e) {
      logWarn('cover', '封面下载异常', { appId, error: String(e) })
      return null
    } finally {
      inflight.delete(appId)
    }
  })()
  inflight.set(appId, task)
  return task
}

/** app.ready 之后调用：接管 si-cover:// 请求。 */
export function registerCoverProtocol(): void {
  protocol.handle(COVER_SCHEME, async (request) => {
    let appId = ''
    let sourceUrl = ''
    try {
      const u = new URL(request.url)
      appId = path.basename(u.pathname, '.jpg')
      sourceUrl = u.searchParams.get('u') ?? ''
    } catch {
      return new Response('bad request', { status: 400 })
    }
    if (!/^\d+$/.test(appId)) return new Response('bad appid', { status: 400 })

    // 1) 磁盘命中：直接回文件字节
    try {
      const buf = fs.readFileSync(coverFile(appId))
      if (buf.length > 0) return new Response(buf, { headers: { 'content-type': 'image/jpeg' } })
    } catch {
      /* 未命中，走下载 */
    }

    // 2) 未命中：下载 → 写盘 → 返回；源 URL 缺失或下载失败都回 404（渲染层退回直连 CDN）
    if (!sourceUrl) return new Response('not found', { status: 404 })
    const buf = await downloadCover(appId, sourceUrl)
    if (!buf) return new Response('not found', { status: 404 })
    return new Response(buf, { headers: { 'content-type': 'image/jpeg' } })
  })
  logInfo('cover', '封面缓存协议已注册', { dir: coverDir() })
}

/* ------------------------ V5 优化 2：设置页清理入口 ------------------------ */

/** 封面缓存占用统计（设置页展示用）。 */
export interface CoverCacheStats {
  count: number
  totalBytes: number
}

/**
 * 统计 covers 目录里的文件数与总字节。
 * 目录不存在 = 还没缓存过任何封面，返回 0/0 而不是报错。
 * 单个文件 stat 失败（清理与下载并发时的窗口）只跳过该文件，不让整个统计失败。
 */
export function coverCacheStats(): CoverCacheStats {
  const dir = coverDir()
  let count = 0
  let totalBytes = 0
  try {
    for (const name of fs.readdirSync(dir)) {
      try {
        const st = fs.statSync(path.join(dir, name))
        if (st.isFile()) {
          count += 1
          totalBytes += st.size
        }
      } catch {
        /* 瞬时窗口（正被删除 / 刚写入），跳过 */
      }
    }
  } catch {
    /* 目录不存在 = 空缓存 */
  }
  return { count, totalBytes }
}

/**
 * 清空 covers 目录（保留目录本身）。返回删除的文件数。
 * 单个文件删除失败不阻塞整体（Windows 下文件被占用时会遇到），只把失败记进日志；
 * 协议层对未命中会自动重新下载，清掉后的下一次浏览自会回填，无需失效其它任何状态。
 */
export function clearCoverCache(): { ok: boolean; cleared: number } {
  const dir = coverDir()
  let cleared = 0
  try {
    const names = fs.readdirSync(dir)
    for (const name of names) {
      try {
        fs.rmSync(path.join(dir, name), { force: true })
        cleared += 1
      } catch (e) {
        logWarn('cover', '删除单个封面缓存文件失败，已跳过', { name, error: String(e) })
      }
    }
  } catch {
    // 目录不存在 = 本来就没有缓存可清
    return { ok: true, cleared: 0 }
  }
  logInfo('cover', '封面缓存已清理', { cleared })
  return { ok: true, cleared }
}
