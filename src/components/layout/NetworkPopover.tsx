import { useEffect, useRef, useState } from 'react'
import { Network, RefreshCw, Settings2, ShieldCheck, Wifi } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useAppStore } from '@/store/useAppStore'
import { hostsVerdict, useHostsGuard } from '@/hooks/useHostsGuard'

/**
 * 顶栏网络弹层：把「今天要不要先开加速器」这个每天都要做的决策，变成点一下。
 *
 * 为什么放在顶栏而不是只放设置页：设置页要主动去找，而「同步失败」发生的那一刻
 * 用户看的就是顶栏这个指示器 —— 处置入口必须在视线里。
 *
 * 只做三件事，都是只读或可逆：
 *   · 告诉你现在的真实状态（劫持残留 / 加速器接管 / hosts 干净）
 *   · 一键停用 Steam 劫持（内部先备份 + UAC + 复核）
 *   · 跳到设置页网络分区去配应用级代理 / 从备份恢复
 */
export function NetworkPopover() {
  const navigate = useAppStore((s) => s.navigate)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { status, plan, busy, message, refresh, apply } = useHostsGuard()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const verdict = hostsVerdict(status)
  const canApply = Boolean(plan && plan.disable.length > 0)

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="网络接入：查看 hosts 劫持状态、停用劫持、配置本应用代理"
        className="no-drag flex size-8 items-center justify-center rounded-pill border border-line bg-bg2/70 text-t3 transition-colors hover:border-line3 hover:text-accent"
      >
        {busy === 'diag' || busy === 'apply' ? <RefreshCw size={14} className="spin" /> : <Network size={14} />}
      </button>

      {open
        ? createPortal(
          <div
            role="dialog"
            aria-label="网络接入"
            className="fixed left-1/2 top-[76px] z-[70] w-[344px] -translate-x-1/2 rounded-2xl border border-line bg-bg2/96 p-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 shrink-0 ${verdict.tone === 'ok' ? 'text-ok' : verdict.tone === 'warn' ? 'text-warn' : 'text-t3'}`}>
                {verdict.tone === 'warn' ? <Wifi size={16} /> : <Wifi size={16} />}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-t1">{verdict.short}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-t3">{verdict.detail}</p>
              </div>
            </div>

            {message ? (
              <p className="mt-2 rounded-lg border border-line bg-bg1/60 px-2.5 py-2 text-[11px] leading-relaxed text-t2">{message}</p>
            ) : null}

            <div className="mt-3 space-y-1.5">
              <button
                type="button"
                disabled={!canApply || busy !== null}
                onClick={() => void apply()}
                className="flex w-full items-center gap-2 rounded-lg border border-line bg-bg1/50 px-2.5 py-2 text-left text-[12px] text-t1 transition-colors hover:border-accent disabled:opacity-45"
              >
                <ShieldCheck size={14} className="shrink-0 text-accent" />
                <span className="flex-1">
                  {canApply ? `停用 ${plan?.disable.length} 条 Steam 劫持` : '没有需要停用的 Steam 条目'}
                  <span className="mt-0.5 block text-[10.5px] text-t3">只注释 Steam 域名，GitHub / Docker Hub 等原样保留；执行前自动备份</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setOpen(false); navigate('settings', { tab: 'network' }) }}
                className="flex w-full items-center gap-2 rounded-lg border border-line bg-bg1/50 px-2.5 py-2 text-left text-[12px] text-t1 transition-colors hover:border-accent"
              >
                <Settings2 size={14} className="shrink-0 text-t3" />
                <span className="flex-1">
                  网络设置
                  <span className="mt-0.5 block text-[10.5px] text-t3">配置本应用专用代理、从备份恢复 hosts、查看完整检测报告</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => void refresh()}
                disabled={busy !== null}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11.5px] text-t3 transition-colors hover:text-t1 disabled:opacity-45"
              >
                <RefreshCw size={13} className={busy === 'diag' ? 'spin' : ''} />
                重新检测
              </button>
            </div>
          </div>,
          document.body
        )
        : null}
    </div>
  )
}
