import { useEffect, useState } from 'react'

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
 * 封面加载的三段降级链（F6）：
 *   1. `cache` —— 走 si-cover:// 自定义协议（主进程查本地缓存 / 下载并落盘）；
 *   2. `direct` —— 协议层失败（未注册 / 缓存损坏 / 离线且未命中）时退回直连 CDN，
 *      与 F6 之前的行为完全一致；
 *   3. `err` —— CDN 也失败，回落字母占位。
 * 这样缓存层永远是「锦上添花」：它坏了最多退化为旧体验，绝不会比以前更差。
 */
export function GameCover({ src, name, className = '', rounded }: GameCoverProps) {
  const [stage, setStage] = useState<'cache' | 'direct' | 'err'>('cache')
  const radius = rounded ?? 'rounded-card'

  // 换游戏（同组件实例复用、src 变化）时重置降级链
  useEffect(() => {
    setStage('cache')
  }, [src])

  if (stage === 'err' || !src) {
    const initial = (name.trim()[0] ?? '?').toUpperCase()
    return (
      <div
        className={`accent-gradient flex items-center justify-center text-white font-semibold ${radius} ${className}`}
      >
        <span className="text-shadow-soft text-2xl">{initial}</span>
      </div>
    )
  }

  const display = stage === 'cache' ? toCoverCacheUrl(src) : src
  return (
    <img
      src={display}
      alt={name}
      onError={() => setStage((s) => (s === 'cache' ? 'direct' : 'err'))}
      className={`object-cover ${radius} ${className}`}
      loading="lazy"
      draggable={false}
    />
  )
}
