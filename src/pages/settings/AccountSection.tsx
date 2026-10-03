import { bridge } from '@/services/bridge'
import { useEffect, useState } from 'react'
import { ArrowRightLeft, Eye, EyeOff, LogOut, Save, ShieldCheck, Lock, TriangleAlert} from 'lucide-react'
import { Button, Card, ExternalLink, SectionHeader, Select } from '@/components/ui'
import { SteamProfileBadge } from '@/components/shared/SteamProfileBadge'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { useRecentAccounts } from '@/hooks/useRecentAccounts'

interface AccountSectionProps {
  busy: string | null
  run: (key: string, task: () => Promise<void>) => Promise<void>
  setMessage: (message: string | null) => void
}

/** 设置页「Steam 账号与 API」区块：OpenID 身份 + Web API Key + SteamID64。 */
export function AccountSection({ busy, run, setMessage }: AccountSectionProps) {
  const settings = useAppStore((s) => s.settings)
  const patchSettings = useAppStore((s) => s.patchSettings)
  const user = useDataStore((s) => s.snapshot?.user)

  // 「是否已有身份」不能只看 settings.steamId：演示/离线模式下数据库里有身份，
  // 但 settings.steamId 是空的，只看它会导致退出按钮不渲染、用户无从切换账号。
  const hasIdentity = Boolean(settings.steamId || user?.personaName)

  const [apiKey, setApiKey] = useState(settings.steamApiKey)
  // 落盘是否加密：如实展示，不做「假装安全」
  const [keyEncrypted, setKeyEncrypted] = useState(false)
  const [steamId, setSteamId] = useState(settings.steamId)
  const [showKey, setShowKey] = useState(false)
  // V4/F2：最近账号下拉里当前选中的候选（'' = 未选择）
  const [pick, setPick] = useState('')

  // V4/F2 轻量版：记住最近 5 个 steam_id（localStorage），切换入口就在本区块。
  // 每次打开设置页 / steamId 变化（含登录、手动改 ID、切换回来）都会把当前账号置顶一次。
  const { recent, remember } = useRecentAccounts()
  useEffect(() => {
    if (settings.steamId) remember(settings.steamId, user?.personaName)
  }, [settings.steamId, user?.personaName, remember])

  /** 切换到下拉里选中的账号：改 settings.steamId → 立即重同步。
   *  数据面（清旧会话 / 清采样差分基准）完全交给 sync 里已有的 F-4 策略，这里不碰库。 */
  const switchAccount = () =>
    void run('switch-account', async () => {
      const target = recent.find((r) => r.steamId === pick)
      if (!target || target.steamId === settings.steamId) return
      const label = target.personaName || target.steamId
      await patchSettings({ steamId: target.steamId })
      setMessage(`已切换到 ${label}，正在用该账号重新同步…`)
      await useAppStore.getState().runSync('api')
      setPick('')
      setMessage(`已切换到 ${label} 并完成同步。`)
    })

  /** 下拉选项：昵称（若知道）+ ID 尾号便于区分；当前账号标「当前」。 */
  const recentOptions = recent.map((r) => ({
    value: r.steamId,
    label:
      (r.steamId === settings.steamId ? '当前 · ' : '') +
      (r.personaName ? `${r.personaName}（…${r.steamId.slice(-4)}）` : `SteamID64 …${r.steamId.slice(-4)}`)
  }))

  useEffect(() => {
    setApiKey(settings.steamApiKey)
    void bridge.app.secretStatus().then((s2) => setKeyEncrypted(s2.encrypted)).catch(() => setKeyEncrypted(false))
    setSteamId(settings.steamId)
  }, [settings.steamApiKey, settings.steamId])

  return (
    <Card padding="md">
      <SectionHeader
        title="Steam 账号与 API"
        subtitle="OpenID 用于确认身份，Web API Key 用于读取公开数据"
        icon={<ShieldCheck size={15} />}
        action={
          hasIdentity ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<LogOut size={13} />}
              onClick={() =>
                void run('logout', async () => {
                  await useAppStore.getState().logout()
                  setMessage('已退出当前账号并返回登录页，本地数据仍然保留。')
                })
              }
            >
              退出登录
            </Button>
          ) : null
        }
      />
      {/* V3/F-6：Steam 等级与徽章。值由每次同步时的 GetBadges 带回，老账号要再同步一次才有。 */}
      <div className="mt-3">
        <SteamProfileBadge user={user} />
      </div>
      {/* V4/F2：最近账号主动切换（轻量版）。演示模式 settings.steamId 为空 → 列表为空 → 整块不渲染。 */}
      {recent.length > 0 ? (
        <div className="mt-3 rounded-xl border border-line bg-bg1/50 p-3">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[12px] font-medium text-t1">最近账号</p>
            <p className="text-[11px] text-t3">本机记住的最近 {recent.length} 个账号（自动淘汰最旧）</p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              className="flex-1"
              value={pick}
              options={recentOptions}
              onChange={setPick}
              disabled={busy === 'switch-account'}
            />
            <Button
              size="sm"
              variant="secondary"
              icon={<ArrowRightLeft size={13} />}
              loading={busy === 'switch-account'}
              disabled={!pick || pick === settings.steamId}
              onClick={switchAccount}
            >
              切换并同步
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-t3">
            切换会用所选账号重新同步整份游戏库。若库中已有数据属于其他账号，将按「通用」里的换账号策略处理
            （清理或保留旧会话），完成后会明确提示。
          </p>
        </div>
      ) : null}
      <div className="mt-3 space-y-3">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label className="block text-[11.5px] text-t3" htmlFor="set-apikey">
              Steam Web API Key
            </label>
            <ExternalLink
              href="https://steamcommunity.com/dev/apikey"
              className="text-[11.5px]"
              title="在浏览器中打开 Steam 官方申请页"
            >
              去官方申请
            </ExternalLink>
          </div>
          <div className="relative">
            <input
              id="set-apikey"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value.trim())}
              placeholder="32 位十六进制字符串"
              className="w-full rounded-xl border border-line bg-bg1/70 py-2 pl-3 pr-10 text-[13px] text-t1 outline-none transition-colors placeholder:text-t3 focus:border-line3"
            />
            <button
              type="button"
              aria-label={showKey ? '隐藏' : '显示'}
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-pill text-t3 hover:text-t1"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-t3">
            {keyEncrypted ? (
              <>
                <Lock size={11} className="text-ok" />
                <span className="text-ok">已用 Windows 系统加密（DPAPI）保存</span>
                <span>· 换机器或换账户后需要重新填写</span>
              </>
            ) : (
              <>
                <TriangleAlert size={11} className="text-warn" />
                <span className="text-warn">本机不支持系统加密，Key 以明文保存在本机配置里</span>
              </>
            )}
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-[11.5px] text-t3" htmlFor="set-steamid">
            SteamID64
          </label>
          <input
            id="set-steamid"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value.trim())}
            placeholder="登录后自动写入，也可手动填写"
            className="w-full rounded-xl border border-line bg-bg1/70 px-3 py-2 text-[13px] text-t1 outline-none transition-colors placeholder:text-t3 focus:border-line3"
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-[11.5px] leading-relaxed text-t3">
            Key 仅存本机。Steam 隐私设置里的「游戏详情」需要设为公开，否则游戏库与成就无法读取。
            <br />
            <span className="text-t2">数据按单账号存储</span>
            （游戏库以 app_id 为键，不区分账号）。可以在上方「最近账号」之间切换 —— 每次切换都会
            用所选账号重新同步；想保留两套完整数据，请用「设置 → 数据 → 导出数据包」备份后再切换。
          </p>
          <Button
            size="sm"
            icon={<Save size={14} />}
            loading={busy === 'save-account'}
            onClick={() =>
              void run('save-account', async () => {
                await patchSettings({ steamApiKey: apiKey, steamId })
                setMessage('账号信息已保存到本机。')
              })
            }
          >
            保存
          </Button>
        </div>
      </div>
    </Card>
  )
}
