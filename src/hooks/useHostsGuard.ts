import { useCallback, useEffect, useState } from 'react'
import { bridge } from '@/services/bridge'
import type { HostsBackupInfo, HostsPlanView, HostsStatus } from '@/types/ipc'

/**
 * hosts 守卫的共享逻辑：设置页的「网络接入」面板与顶栏的网络弹层都走这里。
 *
 * 抽 hook 而不是各写一套，是因为这两处的语义必须完全一致 —— 顶栏说「已停用」而设置页显示
 * 「还有 15 条」是最难排查的一类不一致。
 */
export function useHostsGuard(): {
  status: HostsStatus | null
  plan: HostsPlanView | null
  backups: HostsBackupInfo[]
  busy: string | null
  message: string | null
  clearMessage: () => void
  refresh: () => Promise<void>
  apply: () => Promise<boolean>
  restore: (file: string) => Promise<void>
} {
  const [status, setStatus] = useState<HostsStatus | null>(null)
  const [plan, setPlan] = useState<HostsPlanView | null>(null)
  const [backups, setBackups] = useState<HostsBackupInfo[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setBusy('diag')
    try {
      const [s, p, b] = await Promise.all([bridge.net.hostsStatus(), bridge.net.hostsPlan(), bridge.net.hostsBackups()])
      setStatus(s)
      setPlan(p)
      setBackups(b)
    } catch (e) {
      setMessage(`检测失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const apply = useCallback(async (): Promise<boolean> => {
    if (!plan || plan.disable.length === 0) return false
    const ok = window.confirm(
      `即将注释 hosts 里这 ${plan.disable.length} 条 Steam 劫持条目（只动 Steam 域名，其余 ${plan.kept.length} 条原样保留）。\n\n` +
      '系统会弹出管理员权限确认。执行前会自动备份 hosts。\n\n继续？'
    )
    if (!ok) return false
    setBusy('apply')
    setMessage('等待管理员授权…（在弹出的窗口里点「是」）')
    try {
      const r = await bridge.net.hostsApply()
      if (r.ok) {
        setMessage(`已停用 ${r.disabledCount} 条 Steam 劫持条目。现在不开加速器也能同步了；若 Steam 客户端仍连不上，重启一次 Steam 即可。`)
      } else {
        setMessage(`未完成：${r.error ?? '未知原因'}`)
      }
      await refresh()
      return r.ok
    } catch (e) {
      setMessage(`执行失败：${e instanceof Error ? e.message : String(e)}`)
      return false
    } finally {
      setBusy(null)
    }
  }, [plan, refresh])

  const restore = useCallback(async (file: string): Promise<void> => {
    if (!window.confirm('这会用备份文件整份覆盖 hosts，回到备份时的样子。继续？')) return
    setBusy(`restore:${file}`)
    try {
      const r = await bridge.net.hostsRestore(file)
      setMessage(r.ok ? '已从备份恢复（加速器接管已还原）。' : `恢复未完成：${r.error ?? '未知原因'}`)
      await refresh()
    } catch (e) {
      setMessage(`恢复失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
    }
  }, [refresh])

  return { status, plan, backups, busy, message, clearMessage: () => setMessage(null), refresh, apply, restore }
}

/** 状态 → 一句话结论。顶栏与设置页共用，避免同一个状态出现两种说法。 */
export function hostsVerdict(status: HostsStatus | null): {
  tone: 'ok' | 'warn' | 'neutral'
  short: string
  detail: string
} {
  // path 为空 = 浏览器预览模式（拿不到系统 hosts）。此时必须说「无法检测」，
  // 绝不能顺着空数组说成「hosts 干净」—— 那等于凭空给出一个安全结论。
  if (!status || !status.path) {
    return { tone: 'neutral', short: '无法检测', detail: '浏览器预览模式读不到系统 hosts，请从桌面应用查看' }
  }
  const n = status.hijacked.length
  if (n === 0) {
    return {
      tone: 'ok',
      short: 'hosts 干净',
      detail: status.disabled.length > 0
        ? `之前停用的 ${status.disabled.length} 条 Steam 条目仍处于注释状态，Steam 走直连`
        : 'hosts 里没有 Steam 劫持条目，Steam 走直连'
    }
  }
  if (status.localProxyListening) {
    return {
      tone: 'ok',
      short: '加速器接管中',
      detail: `${n} 条 Steam 域名指向本机，且加速器正在应答 —— 现在一切正常，关闭加速器就会同步失败`
    }
  }
  return {
    tone: 'warn',
    short: '劫持残留',
    detail: `${n} 条 Steam 域名仍指向 127.0.0.1，但本机 80/443 无人应答 —— 这就是不开加速器就同步失败的原因`
  }
}
