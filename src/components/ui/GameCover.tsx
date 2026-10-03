import { useEffect, useMemo, useState } from 'react'

interface GameCoverProps {
  src: string
  name: string
  className?: string
  rounded?: string
}

/**
 * CDN URL → 本地缓存协议 URL（V4/F6）。
 *
 * 只认 Steam 封面的 `steam/apps/<id>/` 形态（header.jpg / capsule_616x353.jpg 都满足），
 * appid 是磁盘缓存的唯一键。必须带 `steam/` 前缀：成就图标的
 * `steamcommunity/public/images/apps/<id>/` 里也有裸的 `/apps/<id>/`，
 * 只匹配后者会把图标也错误地送进封面缓存（探针 M14 抓过这个缺陷）。
 * 其余 URL 原样放行，不给主进程缓存添乱。
 */
export function toCoverCacheUrl(src: string): string {
  const m = src.match(/\/steam\/apps\/(\d{2,10})\//)
  if (!m) return src
  return `si-cover://cover/${m[1]}.jpg?u=${encodeURIComponent(src)}`
}

/**
 * 同一 appid 的候选封面地址，按可用性递减排列。
 *
 * 为什么需要候选链：Steam CDN 的 `steam/apps/<id>/` 目录下**并非每款游戏都有 header.jpg**
 * （实测「渔力全开」这类就缺），早前只有「缓存 → 直连」两级降级，两次都 404 就直接落到
 * 字母占位，一眼看过去像坏图。同目录下的其它尺寸几乎总能命中，宽高比也接近：
 *   header.jpg 460×215（2.14:1）→ capsule_616x353.jpg（1.75:1）→ capsule_sm_120.jpg（1:1）
 * 卡片按 object-cover 裁切，比例差异在视觉上可接受。
 */
export function coverCandidates(src: string): string[] {
  // 兼容两种真实形态（都实测过）：
  //   cdn.cloudflare.steamstatic.com/steam/apps/<id>/header.jpg
  //   shared.akamai.steamstatic.com/store_item_assets/steam/apps/<id>/<hash>/capsule_616x353_alt.jpg
  // 第二种带一层 hash 目录，漏掉它会让 featuredcategories / 搜索结果里的封面完全走不到候选链。
  const m = src.match(/^(https?:\/\/[^/]+)\/(?:store_item_assets\/)?steam\/apps\/(\d{2,10})\/(?:[a-z0-9_-]+\/)?[a-z0-9_-]+\.(?:jpg|png)$/i)
  if (!m) return src ? [src] : []
  const [, host, appId] = m
  const out = [src]
  for (const file of ['header.jpg', 'capsule_616x353.jpg', 'capsule_sm_120.jpg', 'capsule_184x184.jpg']) {
    const cand = `${host}/steam/apps/${appId}/${file}`
    if (!out.includes(cand)) out.push(cand)
  }
  return out
}

/**
 * 封面加载的降级链（F6 + 加厚）：
 *   1. `cache` —— 走 si-cover:// 自定义协议（主进程查本地缓存 / 下载并落盘）；
 *   2. `direct` —— 协议层失败（未注册 / 缓存损坏 / 离线且未命中）时退回直连 CDN；
 *   3. 换下一张候选图（见 coverCandidates）—— 解决「这款游戏 CDN 上没有 header.jpg」；
 *   4. 全部候选都失败，才回落字母占位。
 * 这样缓存层永远是「锦上添花」：它坏了最多退化为旧体验，绝不会比以前更差。
 */
export function GameCover({ src, name, className = '', rounded }: GameCoverProps) {
  const candidates = useMemo(() => coverCandidates(src), [src])
  const [idx, setIdx] = useState(0)
  const [viaCache, setViaCache] = useState(true)
  const radius = rounded ?? 'rounded-card'

  // 换游戏（同组件实例复用、src 变化）时重置降级链
  useEffect(() => {
    setIdx(0)
    setViaCache(true)
  }, [src])

  if (!src || idx >= candidates.length) {
    const initial = (name.trim()[0] ?? '?').toUpperCase()
    return (
      <div
        className={`accent-gradient flex items-center justify-center text-white font-semibold ${radius} ${className}`}
      >
        <span className="text-shadow-soft text-2xl">{initial}</span>
      </div>
    )
  }

  const base = candidates[idx]
  const display = viaCache ? toCoverCacheUrl(base) : base
  return (
    <img
      src={display}
      alt={name}
      onError={() => {
        // 缓存层失败先退回直连；直连也失败就换下一张候选图，并重新走一遍缓存层
        // （缓存键是 appid，换图之后仍可能命中或重新落盘）。
        if (viaCache) setViaCache(false)
        else { setIdx((i) => i + 1); setViaCache(true) }
      }}
      className={`object-cover ${radius} ${className}`}
      loading="lazy"
      draggable={false}
    />
  )
}
