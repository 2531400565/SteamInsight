import { useEffect, useState } from 'react'

/**
 * 读取并订阅 CSS 变量（设计令牌）。recharts 的 stroke/fill 以属性形式写入 SVG，
 * var() 在属性中不可靠，因此这里解析为具体色值再传入，并随 data-theme 切换更新。
 */
function read(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const warned = new Set<string>()

/**
 * 读取并订阅 CSS 变量（设计令牌）。
 * 取不到值时不再静默返回空串 —— 空串会让 SVG 的 fill/stroke 退化成黑色，
 * 那种 bug 在深色主题下不显眼但确确实实是错的，所以这里显式回退并告警一次。
 */
export function useCssVar(name: string, fallback = 'currentColor'): string {
  const [val, setVal] = useState<string>(() => read(name) || fallback)
  useEffect(() => {
    const update = () => {
      const next = read(name)
      if (!next && !warned.has(name)) {
        warned.add(name)
        console.warn(`[charts] CSS 变量 ${name} 未定义，已回退为 "${fallback}"。请核对 src/styles/global.css 的令牌名。`)
      }
      setVal(next || fallback)
    }
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [name, fallback])
  return val
}

/** 图表 tooltip 暗/亮统一外壳样式（内联 var() 可用）。 */
export function tooltipStyle() {
  return {
    background: 'var(--si-bg-2)',
    border: '1px solid var(--si-line-2)',
    borderRadius: 12,
    color: 'var(--si-t1)',
    fontSize: 12,
    boxShadow: 'var(--si-shadow-card)',
    padding: '6px 8px'
  } as const
}
