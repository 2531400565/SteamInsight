import { Check, LogIn } from 'lucide-react'
import { Button } from '@/components/ui'
import type { SteamDetection } from '@/types/ipc'

interface AccountQuickLoginProps {
  detection: SteamDetection | null
  /** 设置里当前已配置的 SteamID64，用来判断是不是已经在用这个账号 */
  currentSteamId: string
  /** 是否已经填过 Web API Key（决定按钮是「一键登录」还是「填入该账号」） */
  hasApiKey: boolean
  busy: boolean
  onUse: () => void
}

/**
 * 「本机已登录账号」快捷入口。
 * 只在真的检测到在线账号时出现 —— loggedIn 由注册表 ActiveUser 推导，不做任何猜测，
 * 所以不会出现「明明没登录却让你一键登录」的情况。
 */
export function AccountQuickLogin({ detection, currentSteamId, hasApiKey, busy, onUse }: AccountQuickLoginProps) {
  if (!detection?.running || !detection.loggedIn || !detection.lastLoginSteamId) return null

  const persona = detection.lastLoginPersona || detection.lastLoginAccount || '未知账号'
  const inUse = currentSteamId === detection.lastLoginSteamId

  return (
    <div data-quick-login className="mt-7 flex items-center gap-3 rounded-2xl border border-accent/35 bg-accent3/10 p-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-pill accent-gradient text-sm font-semibold text-white">
        {persona.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[11px] text-ok">
          <Check size={12} className="shrink-0" />
          检测到本机已登录的 Steam 账号
        </p>
        <p className="truncate text-[13px] font-medium text-t1" title={persona}>
          {persona}
        </p>
        <p className="truncate text-[10.5px] text-t3">
          {detection.lastLoginAccount ? `${detection.lastLoginAccount} · ` : ''}SteamID64 {detection.lastLoginSteamId}
        </p>
      </div>
      {inUse ? (
        <span className="shrink-0 rounded-pill border border-line px-2.5 py-1 text-[11px] text-t3">当前账号</span>
      ) : (
        <Button size="sm" icon={<LogIn size={14} />} loading={busy} disabled={busy} onClick={onUse}>
          {hasApiKey ? '一键登录' : '填入该账号'}
        </Button>
      )}
    </div>
  )
}
