import { useState } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'
import { useDataStore } from '@/store/useDataStore'

/**
 * 「库里的数据换人了」提示条。
 *
 * 为什么必须有：本程序是**单人单账号**模型，`games` 表按 `app_id` 单键存，不带账号维度。
 * 换一个 Steam 账号同步下来，新账号的库会整体替换旧的 —— 这是对的（否则两个账号的游戏会混在一起），
 * 但如果不告知，用户的观感是「昨天还在的 69 款游戏今天没了」，完全无从解释。
 *
 * 只在同步检测到真的换了账号时出现（主进程 `detectAccountSwitch()` 判定），
 * 关掉后本次运行不再打扰；下一次真换账号会再弹一次。
 */
export function AccountSwitchBanner() {
  const accountSwitch = useDataStore((s) => s.snapshot?.accountSwitch ?? null)
  const [dismissed, setDismissed] = useState(false)

  if (!accountSwitch || dismissed) return null

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-warn/45 bg-warn/10 px-4 py-3">
      <ArrowLeftRight size={16} className="mt-0.5 shrink-0 text-warn" />
      <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed">
        <p className="font-medium text-t1">本次同步用的是另一个 Steam 账号，库已整体替换</p>
        <p className="mt-1 text-t3">
          上一个账号（<span className="text-t2">{accountSwitch.previousSteamId}</span>，{accountSwitch.previousGames} 款游戏）
          的数据已被当前账号（<span className="text-t2">{accountSwitch.currentSteamId}</span>）替换。
          这是单人单账号模型的既定行为 —— 你写的<span className="text-t2">评分、笔记与追猎清单会保留</span>，
          被替换的只是 Steam 那边拉下来的游戏、时长与成就。想换回去，重新登录那个账号再同步一次即可。
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="关闭换账号提示"
        className="shrink-0 text-t3 transition-colors hover:text-t1"
      >
        <X size={14} />
      </button>
    </div>
  )
}
