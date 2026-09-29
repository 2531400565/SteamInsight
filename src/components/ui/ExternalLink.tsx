import type { ReactNode } from 'react'
import { bridge } from '@/services/bridge'

interface ExternalLinkProps {
  /** 目标绝对地址（http / https）。 */
  href: string
  children: ReactNode
  /** 追加的样式类，用于覆盖默认链接样式。 */
  className?: string
  /** 悬停提示，默认直接显示地址。 */
  title?: string
}

/**
 * 外部链接：点击后交给系统默认浏览器打开。
 *
 * 保留真实 `href` 便于右键「复制链接地址」与悬停预览，但点击一律 `preventDefault`
 * 后走 `bridge.app.openExternal` —— Electron 下由主进程 `shell.openExternal` 拉起系统
 * 浏览器，浏览器预览模式退化为 `window.open`。**单一链路**，不会出现
 * 「href 自己导航一次 + IPC 再打开一次」的双开。
 */
export function ExternalLink({ href, children, className = '', title }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={title ?? href}
      onClick={(e) => {
        e.preventDefault()
        void bridge.app.openExternal(href)
      }}
      className={`cursor-pointer text-accent underline decoration-dotted underline-offset-2 transition-colors hover:text-t1 focus-visible:outline-none focus-visible:underline ${className}`}
    >
      {children}
    </a>
  )
}
