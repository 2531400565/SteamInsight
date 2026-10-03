import { useState } from 'react'
import { FileWarning, Network, RefreshCw, RotateCcw, ShieldCheck, Trash2, Wifi } from 'lucide-react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { bridge } from '@/services/bridge'
import { useAppStore } from '@/store/useAppStore'
import { hostsVerdict, useHostsGuard } from '@/hooks/useHostsGuard'
import type { ProxyTestResult } from '@/types/ipc'
import { formatDateTime } from '@/utils/format'

/**
 * 网络接入面板：解决「每次都得先开 Watt / VPN」。
 *
 * 故障链其实是这样的：加速器开启时往 hosts 写 `127.0.0.1 store.steampowered.com` 并接管本机
 * 80/443；**它一关，这些条目还留着** → Steam 域名指向一个没人应答的本机端口 → 同步必失败。
 * （Steam 客户端同样受影响，所以这不只是本软件的问题。）
 *
 * 三件事，各自有明确的安全边界：
 *  1. **诊断**：只读 hosts + 探本机端口，先把「谁在接管、哪些条目被劫持」摊开；
 *  2. **还原**：**只注释 Steam 白名单域名的行**，同区块里的 GitHub / Docker Hub / HF 一律不碰；
 *     执行前自动备份，弹 UAC，执行后重新读 hosts 复核，不靠脚本自称成功；
 *  3. **自定义代理**：`session.setProxy` 只作用于本应用，绝不影响同机其它软件。
 */
export function NetworkAccessPanel() {
  const settings = useAppStore((s) => s.settings)
  const patchSettings = useAppStore((s) => s.patchSettings)

  const { status, plan, backups, busy, message, refresh, apply, restore } = useHostsGuard()

  const [proxyInput, setProxyInput] = useState(settings.customProxy ?? '')
  const [proxyTest, setProxyTest] = useState<ProxyTestResult | null>(null)
  // 代理相关的忙碌态与提示独立于 hosts 守卫：它们是两套互不相干的状态，
  // 硬塞进同一个 hook 只会让两个功能互相阻塞。
  const [proxyBusy, setProxyBusy] = useState<string | null>(null)
  const [proxyMsg, setProxyMsg] = useState<string | null>(null)

  const saveProxy = async (): Promise<void> => {
    setProxyBusy('save')
    setProxyTest(null)
    try {
      const r = await bridge.net.proxyApply(proxyInput)
      await patchSettings({ customProxy: proxyInput })
      setProxyMsg(r.applied
        ? (r.label === '跟随系统' ? '已切回跟随系统代理设置。' : `本应用已走代理 ${r.label}（其它程序不受影响）。`)
        : `代理未生效：${r.error ?? '未知原因'}`)
    } catch (e) {
      setProxyMsg(`设置代理失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setProxyBusy(null)
    }
  }

  const runProxyTest = async (): Promise<void> => {
    setProxyBusy('test')
    try {
      const r = await bridge.net.proxyTest()
      setProxyTest(r)
    } catch (e) {
      setProxyTest({ ok: false, via: null, ms: 0, error: e instanceof Error ? e.message : String(e) })
    } finally {
      setProxyBusy(null)
    }
  }

  const verdict = hostsVerdict(status)
  // path 为空 = 预览模式读不到系统 hosts，这时不要把「读不到」渲染成三个 0
  const readable = Boolean(status?.path)
  const hijacked = readable ? (status?.hijacked.length ?? 0) : 0
  const listening = readable ? Boolean(status?.localProxyListening) : false

  return (
    <Card padding="md">
      <SectionHeader
        title="网络接入"
        subtitle="不开加速器也能用：还原 hosts 劫持，或给本应用单独指定代理"
        icon={<Network size={15} />}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={verdict.tone} size="xs" title={verdict.detail}>{verdict.short}</Badge>
            <Button size="sm" variant="ghost" icon={<RefreshCw size={14} className={busy === 'diag' ? 'spin' : ''} />} onClick={() => void refresh()}>
              重新检测
            </Button>
          </div>
        }
      />

      {message ? (
        <div className="mt-3 rounded-xl border border-line bg-bg1/60 px-3 py-2 text-[12px] leading-relaxed text-t2">{message}</div>
      ) : null}

      <div className="mt-3 space-y-3">
        {/* 诊断结论 */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact label="Steam 劫持条目" value={readable ? `${hijacked} 条` : '—'} hint={readable ? '生效中：Steam 域名 → 127.0.0.1' : '预览模式读不到系统 hosts'} tone={hijacked > 0 ? 'warn' : 'ok'} />
          <Fact label="本机 80/443" value={readable ? (listening ? '有人应答' : '无人应答') : '—'} hint={!readable ? '预览模式无法探测' : listening ? '加速器正在接管，Steam 可用' : '加速器没开，劫持条目会把请求打进黑洞'} tone={listening ? 'ok' : 'warn'} />
          <Fact label="其它条目" value={readable ? `${status?.kept.length ?? 0} 条` : '—'} hint="GitHub / Docker Hub / HF 等，一律不动" tone="neutral" />
        </div>

        {/* 还原 */}
        <div className="rounded-xl border border-line bg-bg1/40 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <FileWarning size={14} className="text-t3" />
            <span className="text-[12.5px] text-t1">停用 Steam 劫持（可逆）</span>
            <span className="min-w-[220px] flex-1 text-[11.5px] leading-relaxed text-t3">
              {plan && plan.disable.length > 0
                ? `将注释 ${plan.disable.length} 条 Steam 条目，其余 ${plan.kept.length} 条原样保留；执行前自动备份 hosts，执行后重新读取复核。`
                : '当前没有生效的 Steam 劫持条目 —— 无需处理。'}
            </span>
            <Button
              size="sm"
              variant={plan && plan.disable.length > 0 ? 'primary' : 'secondary'}
              icon={<ShieldCheck size={14} />}
              disabled={!plan || plan.disable.length === 0 || busy !== null}
              loading={busy === 'apply'}
              onClick={() => void apply()}
            >
              一键停用
            </Button>
          </div>
          {plan && plan.disable.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11.5px] text-t3 hover:text-t2">查看将要修改的 {plan.disable.length} 条（点击展开）</summary>
              <ul className="mt-1.5 max-h-40 space-y-0.5 overflow-auto rounded-lg bg-bg2/60 p-2 text-[11px] leading-relaxed text-t3">
                {plan.disable.map((l) => <li key={l} className="font-mono"># {l}</li>)}
              </ul>
              <p className="mt-1.5 text-[11px] text-t3">保留不动的其它 {plan.kept.length} 条（示例）：{plan.kept.slice(0, 3).join(' / ') || '无'}</p>
            </details>
          ) : null}
        </div>

        {/* 恢复 */}
        {backups.length > 0 ? (
          <div className="rounded-xl border border-line bg-bg1/40 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <RotateCcw size={14} className="text-t3" />
              <span className="text-[12.5px] text-t1">从备份恢复 hosts</span>
              <span className="min-w-[200px] flex-1 text-[11.5px] text-t3">整份覆盖回备份时的样子（连带把加速器的接管一起还回去）。</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {backups.slice(0, 3).map((b) => (
                <Button key={b.file} size="sm" variant="secondary" icon={<Trash2 size={13} />}
                  loading={busy === `restore:${b.file}`} disabled={busy !== null && busy !== `restore:${b.file}`}
                  onClick={() => void restore(b.file)}>
                  {formatDateTime(b.createdAt, '未知')} · {(b.bytes / 1024).toFixed(1)} KB
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 自定义代理 */}
        <div className="rounded-xl border border-line bg-bg1/40 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Wifi size={14} className="text-t3" />
            <span className="text-[12.5px] text-t1">本应用专用代理</span>
            <input
              value={proxyInput}
              onChange={(e) => setProxyInput(e.target.value)}
              placeholder="留空 = 跟随系统，例如 127.0.0.1:7890"
              className="h-8 min-w-[240px] flex-1 rounded-lg border border-line bg-bg2/70 px-2.5 text-[12px] text-t1 outline-none focus:border-accent"
            />
            <Button size="sm" variant="secondary" disabled={proxyBusy !== null} loading={proxyBusy === 'save'} onClick={() => void saveProxy()}>
              应用
            </Button>
            <Button size="sm" variant="ghost" icon={<RefreshCw size={13} className={proxyBusy === 'test' ? 'spin' : ''} />}
              disabled={proxyBusy !== null} onClick={() => void runProxyTest()}>
              测试
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-t3">
            只改本应用自己的网络会话（<span className="text-t2">不写系统代理、不动注册表</span>），所以 Nacos、Docker、浏览器完全不受影响。
            适合「系统代理指向一个已经没人监听的端口」这种情况 —— 填一个真实在听的端口即可。
          </p>
          {proxyMsg ? <p className="mt-1.5 text-[11.5px] text-t2">{proxyMsg}</p> : null}
          {proxyTest ? (
            <p className={`mt-1.5 text-[11.5px] ${proxyTest.ok ? 'text-ok' : 'text-warn'}`}>
              {proxyTest.ok
                ? `连通正常 · ${proxyTest.via ?? '—'} · ${proxyTest.ms}ms`
                : `不通：${proxyTest.error ?? '未知原因'}`}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function Fact({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: 'ok' | 'warn' | 'neutral' }) {
  const toneCls = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-t1'
  return (
    <div className="rounded-xl border border-line bg-bg1/45 px-3 py-2.5">
      <p className="text-[11px] text-t3">{label}</p>
      <p className={`mt-0.5 text-[15px] font-semibold ${toneCls}`}>{value}</p>
      <p className="mt-0.5 text-[10.5px] leading-relaxed text-t3">{hint}</p>
    </div>
  )
}
