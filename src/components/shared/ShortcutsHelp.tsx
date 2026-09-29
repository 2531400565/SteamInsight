import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Keyboard } from 'lucide-react'
import { Badge } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'

/** 一条快捷键说明。keys 用 <kbd> 展示，description 说清什么时候有用。 */
const SHORTCUTS: Array<{ keys: string[]; description: string }> = [
  { keys: ['Ctrl', 'K'], description: '打开 / 关闭全局命令面板：搜游戏、跳页面、进设置某一节' },
  { keys: ['?'], description: '打开这份快捷键清单（再按一次或 Esc 关闭）' },
  { keys: ['Esc'], description: '返回上一页；焦点在输入框里时是取消编辑；有浮层打开时先关浮层' },
  { keys: ['↑', '↓'], description: '命令面板里移动选择' },
  { keys: ['Enter'], description: '命令面板里打开选中项' }
]

/**
 * 快捷键清单（V4 / F-7）。
 *
 * CommandPalette 早已覆盖「键盘直达」，但没有一个地方告诉用户按键有哪些 ——
 * `?` 是各桌面应用的通用手势。清单是只读的：当前快捷键总共 5 条，
 * 做自定义绑定的维护成本（冲突检测、持久化、误触恢复）远大于收益，故不提供。
 *
 * 必须走 createPortal 挂到 body：`.page-enter` 的 transform 会成为
 * `position:fixed` 的包含块，直接渲染会被压进内容区。
 */
export function ShortcutsHelp() {
  const open = useAppStore((s) => s.shortcutsOpen)
  const setOpen = useAppStore((s) => s.setShortcutsOpen)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      // 面板已打开时再按 ? 也关掉（shift+/ 产生 ?）
      if (e.key === '?') {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  // ? 键全局打开。焦点在输入框 / 文本域时不触发（那里 ? 是正常字符）。
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== '?') return
      const target = e.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return
      }
      if (document.querySelector('[data-esc-layer]')) return
      e.preventDefault()
      setOpen(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setOpen])

  if (!open) return null

  return createPortal(
    <div
      data-esc-layer="shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="键盘快捷键"
        className="pop-enter w-full max-w-[520px] overflow-hidden rounded-2xl border border-line2 bg-bg2/97 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Keyboard size={16} className="shrink-0 text-accent" />
          <p className="text-[14px] font-semibold text-t1">键盘快捷键</p>
          <Badge tone="neutral" size="xs" className="ml-auto">
            Esc 关闭
          </Badge>
        </div>
        <div className="space-y-1 p-3">
          {SHORTCUTS.map((s) => (
            <div key={s.keys.join('+')} className="flex items-start gap-3 rounded-xl px-2.5 py-2 hover:bg-bg3">
              <span className="flex shrink-0 items-center gap-1 pt-0.5">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-md border border-line bg-bg1 px-1.5 py-0.5 text-[11px] font-medium text-t1 shadow-[0_1px_0_var(--si-line-2)]"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
              <span className="min-w-0 text-[12.5px] leading-relaxed text-t2">{s.description}</span>
            </div>
          ))}
        </div>
        <p className="border-t border-line px-4 py-2 text-[11px] leading-relaxed text-t3">
          快捷键为固定绑定。全部功能也都可以只用鼠标完成 —— 顶部搜索按钮等价于 Ctrl+K。
        </p>
      </div>
    </div>,
    document.body
  )
}
