import { useState } from 'react'
import { ChevronDown, FolderOpen, Info, LogIn, ShieldCheck, TriangleAlert, Wifi, WifiOff } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Badge, Button, Card, ExternalLink } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { bridge } from '@/services/bridge'
import { NETWORK_HINT } from '@/utils/constants'
import { AccountQuickLogin } from './welcome/AccountQuickLogin'

interface CheckItemProps {
  label: string
  value: string
  ok: boolean
  warn?: boolean
}

function CheckItem({ label, value, ok, warn = false }: CheckItemProps) {
  const tone = ok ? 'text-ok' : warn ? 'text-warn' : 'text-t3'
  return (
    <div className="flex items-center gap-2.5">
      <span className={`size-1.5 shrink-0 rounded-pill ${ok ? 'bg-ok' : warn ? 'bg-warn' : 'bg-t3'}`} />
      <span className="text-[11.5px] text-t3">{label}</span>
      <span className={`ml-auto max-w-[190px] truncate text-right text-[11.5px] ${tone}`} title={value}>
        {value}
      </span>
    </div>
  )
}

export default function WelcomePage() {
  const settings = useAppStore((s) => s.settings)
  const detection = useAppStore((s) => s.detection)
  const detecting = useAppStore((s) => s.detecting)
  const navigate = useAppStore((s) => s.navigate)
  const runSync = useAppStore((s) => s.runSync)
  const patchSettings = useAppStore((s) => s.patchSettings)
  const previewMode = useAppStore((s) => s.previewMode)

  const [busy, setBusy] = useState<'login' | 'offline' | 'quick' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [apiKey, setApiKey] = useState(settings.steamApiKey)
  const [steamId, setSteamId] = useState(settings.steamId)

  const advance = async (): Promise<void> => {
    await useDataStore.getState().load()
    navigate('dashboard')
  }

  const handleLogin = async (): Promise<void> => {
    setBusy('login')
    setMessage(null)
    try {
      if (!apiKey && !settings.steamApiKey) {
        setMessage('请先展开下方「高级设置」填入 Steam Web API Key —— 官方 OpenID 只能帮你确认身份，读取游戏库还需要 Web API Key。')
        setBusy(null)
        return
      }
      const result = await bridge.auth.startOpenId()
      if (!result.ok || !result.steamId) {
        setMessage(result.error ?? 'Steam 登录未完成，请重试或改用离线模式。')
        setBusy(null)
        return
      }
      await patchSettings({ steamId: result.steamId, steamApiKey: apiKey })
      const ok = await runSync('api', true)
      if (!ok) {
        setMessage('登录成功，但数据同步失败。可稍后在「设置 → 数据」里重新同步，或先用离线模式浏览。')
        setBusy(null)
        return
      }
      await advance()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  /**
   * 快捷登录：直接用本机已登录的 Steam 账号（注册表 ActiveUser 推导而来，不需要 OpenID）。
   * 有 API Key 就直接拉真实数据；没有就把账号填好并展开高级设置，把缺的那一步讲清楚。
   */
  const handleQuick = async (): Promise<void> => {
    const det = detection
    if (!det?.lastLoginSteamId) return
    setBusy('quick')
    setMessage(null)
    try {
      await patchSettings({ steamId: det.lastLoginSteamId, personaName: det.lastLoginPersona ?? '' })
      setSteamId(det.lastLoginSteamId)
      const key = apiKey || settings.steamApiKey
      if (!key) {
        setAdvanced(true)
        setMessage(
          `已填入本机登录的账号 ${det.lastLoginAccount ?? det.lastLoginSteamId}。再补一个 Steam Web API Key 就能拉取你的真实游戏库、成就与愿望单。`
        )
        return
      }
      const ok = await runSync('api', true)
      if (!ok) {
        setMessage('账号已填入，但数据同步失败。可在「设置 → 数据」里重试；若提示「未获取到玩家资料」，请把个人资料的「游戏详情」设为公开。')
        return
      }
      await advance()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  const handleOffline = async (): Promise<void> => {
    setBusy('offline')
    setMessage(null)
    try {
      const ok = await runSync('local', true)
      if (!ok) {
        setMessage('离线导入失败。')
        return
      }
      await advance()
    } finally {
      setBusy(null)
    }
  }

  const d = detection

  return (
    <div className="app-aurora relative flex h-screen items-center justify-center overflow-y-auto bg-app px-8 py-10">
      <div className="relative z-10 grid w-full max-w-[1080px] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <Logo size={62} />
            <div>
              <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-t1">Steam Insight</h1>
              <p className="mt-1 text-sm text-t3">你的 Steam 游戏数据分析与折扣助手</p>
            </div>
          </div>

          <AccountQuickLogin
            detection={d}
            currentSteamId={settings.steamId}
            hasApiKey={Boolean(apiKey || settings.steamApiKey)}
            busy={busy === 'quick'}
            onUse={() => void handleQuick()}
          />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" icon={<LogIn size={17} />} loading={busy === 'login'} disabled={busy !== null} onClick={() => void handleLogin()}>
              使用 Steam 登录
            </Button>
            <Button
              size="lg"
              variant="secondary"
              icon={<FolderOpen size={17} />}
              loading={busy === 'offline'}
              disabled={busy !== null}
              onClick={() => void handleOffline()}
            >
              导入本地 Steam 数据（离线模式）
            </Button>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-t3">
            <ShieldCheck size={13} className="text-ok" />
            登录走 Steam 官方 OpenID 授权，本软件不会、也无法要求你输入 Steam 账号密码。
          </p>

          {message ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/35 bg-warn/10 px-3 py-2.5 text-[12.5px] text-warn">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            className="mt-5 flex items-center gap-1.5 self-start text-[12px] text-t3 transition-colors hover:text-accent"
          >
            <ChevronDown size={13} className={advanced ? 'rotate-180 transition-transform' : 'transition-transform'} />
            高级设置：Steam Web API Key
          </button>

          {advanced ? (
            <Card className="mt-3" padding="md">
              <p className="mb-3 text-[12px] leading-relaxed text-t3">
                到{' '}
                <ExternalLink href="https://steamcommunity.com/dev/apikey">
                  steamcommunity.com/dev/apikey
                </ExternalLink>{' '}
                免费申请一个 Key，填入后即可读取游戏库、成就与愿望单。
                Key 只保存在本机设置文件中，不会上传到任何第三方服务器。
              </p>
              <label className="mb-2 block text-[11.5px] text-t3" htmlFor="welcome-apikey">
                Steam Web API Key
              </label>
              <input
                id="welcome-apikey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value.trim())}
                placeholder="32 位十六进制字符串"
                className="mb-3 w-full rounded-xl border border-line bg-bg1/70 px-3 py-2 text-[13px] text-t1 outline-none transition-colors placeholder:text-t3 focus:border-line3"
              />
              <label className="mb-2 block text-[11.5px] text-t3" htmlFor="welcome-steamid">
                SteamID64（可选，登录后自动获取）
              </label>
              <input
                id="welcome-steamid"
                value={steamId}
                onChange={(e) => setSteamId(e.target.value.trim())}
                placeholder="7656119xxxxxxxxxx"
                className="mb-3 w-full rounded-xl border border-line bg-bg1/70 px-3 py-2 text-[13px] text-t1 outline-none transition-colors placeholder:text-t3 focus:border-line3"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void (async () => {
                    await patchSettings({ steamApiKey: apiKey, steamId })
                    setMessage('已保存。现在可以点击「使用 Steam 登录」。')
                  })()
                }}
              >
                保存到本机
              </Button>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit" padding="md">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-t1">Steam 环境检测</p>
            {detecting ? <Badge tone="warn" size="xs">检测中…</Badge> : <Badge tone="neutral" size="xs">启动时自动检测</Badge>}
          </div>

          {previewMode ? (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-warn/35 bg-warn/10 px-3 py-2 text-[11.5px] text-warn">
              <TriangleAlert size={13} className="mt-0.5 shrink-0" />
              <span>当前不是从桌面应用启动，无法执行本地检测。请用 Electron 主进程运行以获得完整能力。</span>
            </div>
          ) : null}

          <div className="space-y-2.5">
            <CheckItem label="Steam 是否安装" value={d?.installed ? '已安装' : '未检测到'} ok={Boolean(d?.installed)} />
            <CheckItem label="Steam 是否运行" value={d?.running ? `运行中 (PID ${d.steamPid ?? '—'})` : '未运行'} ok={Boolean(d?.running)} />
            <CheckItem
              label="客户端是否登录"
              value={d?.loggedIn ? (d.lastLoginPersona ?? d.lastLoginAccount ?? '已登录') : d?.running ? '未登录（停在登录界面）' : '未运行'}
              ok={Boolean(d?.loggedIn)}
            />
            <CheckItem
              label="Steam 网络连接"
              value={d ? (d.apiReachable ? `正常${d.apiLatencyMs ? ` · ${d.apiLatencyMs} ms` : ''}` : '不可达') : '待检测'}
              ok={Boolean(d?.apiReachable)}
              warn={d ? !d.apiReachable : true}
            />
          </div>

          <div className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-t3">
            <div className="flex items-start gap-2">
              {d?.apiReachable ? <Wifi size={13} className="mt-0.5 shrink-0 text-ok" /> : <WifiOff size={13} className="mt-0.5 shrink-0 text-warn" />}
              <span>{d?.apiReachable ? '可以访问 Steam API，登录后即可自动同步。' : NETWORK_HINT}</span>
            </div>
            {d?.networkDetail ? <p className="mt-2 break-all text-[10.5px] text-t3">{d.networkDetail}</p> : null}
          </div>

          {d?.notes?.length ? (
            <ul className="mt-3 space-y-1 border-t border-line pt-3">
              {d.notes.slice(0, 4).map((note) => (
                <li key={note} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-t3">
                  <Info size={11} className="mt-0.5 shrink-0" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
