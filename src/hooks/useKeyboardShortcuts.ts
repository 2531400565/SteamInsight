import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

/** 正在编辑文本 / 数值时不要触发全局快捷键（Esc 在输入框里应该是「取消编辑」）。 */
function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/**
 * 键盘快捷键（N2-3）。
 *
 * 目前只做一件有明确语义的事：**Esc 返回上一页**。
 *
 * 为什么不做「列表 ↑↓ 选择、Enter 打开」：本项目的列表几乎都是网格卡片 / 表格，
 * 没有统一的「当前选中行」概念，硬加一套方向键焦点管理要改掉每个列表页，
 * 收益（桌面应用里鼠标本来就够用）远小于复杂度。命令面板里的 ↑↓/Enter 已经覆盖了
 * 「键盘直达」这个真实需求（Ctrl+K 之后全键盘可达）。
 *
 * 两个必须的例外（否则会抢别人的按键）：
 *  1) 焦点在输入框 / 文本域里 —— 例如愿望单的「设个心理价」，Esc 该是取消编辑；
 *  2) 页面上有打开的浮层（带 `data-esc-layer`）—— 例如命令面板 / 账号菜单，
 *     Esc 该先关它，而不是同时把页面也退掉。
 */
export function useKeyboardShortcuts(): void {
  const goBack = useAppStore((s) => s.goBack)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isEditingTarget(e.target)) return
      if (document.querySelector('[data-esc-layer]')) return
      goBack()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [goBack])
}
