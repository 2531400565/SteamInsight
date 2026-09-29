import { useState } from 'react'
import { BadgeCheck, CircleAlert, Lightbulb, RefreshCw, TriangleAlert, Wifi, WifiOff } from 'lucide-react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { bridge } from '@/services/bridge'
import type { NetworkDiagnosis } from '@/types/ipc'
import { formatDateTime } from '@/utils/format'

/** 结论等级 → 配色与图标。三种故障在界面上长得一样，这里必须让它一眼能分辨。 */
const LEVEL_STYLE = {
  ok: { wrap: 'border-ok/45 bg-ok/12', text: 'text-ok', icon: <BadgeCheck size={16} /> },
  warn: { wrap: 'border-warn/45 bg-warn/12', text: 'text-warn', icon: <TriangleAlert size={16} /> },
  error: { wrap: 'border-danger/45 bg-danger/12', text: 'text-danger', icon: <CircleAlert size={16} /> }
} as const

/**
 * 设置页「网络连通性」区块。
 *
 * 为什么值得单独做：应用完全依赖 5 个外部域名，而三类故障（加速器没开 / 代理端口已死 / 没填 API Key）
 * 在界面上表现完全一致，处置方式却完全不同。这个面板把「判定 + 处置」直接写在界面上，
 * 用户不用再自己猜「是接口坏了还是软件有 bug」。
 */
export function NetworkSection() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<NetworkDiagnosis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const diagnose = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      setResult(await bridge.net.diagnose())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const style = result ? LEVEL_STYLE[result.level] : null

  return (
    <Card padding="md">
      <SectionHeader
        title="网络连通性"
        subtitle="逐个请求应用真实用到的 5 个域名，给出结论与处置建议"
        icon={<Wifi size={15} />}
        action={
          <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} loading={busy} onClick={() => void diagnose()}>
            {result ? '重新自检' : '开始自检'}
          </Button>
        }
      />

      {error ? (
        <div className="mt-3 rounded-xl border border-danger/45 bg-danger/12 px-3 py-2 text-[12px] text-danger">{error}</div>
      ) : null}

      {!result && !busy && !error ? (
        <p className="mt-3 text-[11.5px] leading-relaxed text-t3">
          同步失败时先点一次自检：它会告诉你到底是<span className="text-t2">加速器没开</span>、
          <span className="text-t2">代理端口已经没人监听</span>，还是<span className="text-t2">网络本身不通</span>。
          自检只发 5 个只读请求，不改动任何设置。
        </p>
      ) : null}

      {result && style ? (
        <div className="mt-3 space-y-3">
          {/* 结论 */}
          <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${style.wrap}`}>
            <span className={`mt-0.5 shrink-0 ${style.text}`}>{style.icon}</span>
            <div className="min-w-0">
              <p className={`text-[13px] font-medium ${style.text}`}>{result.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-t2">{result.detail}</p>
            </div>
            <Badge tone={result.level === 'ok' ? 'ok' : result.level === 'warn' ? 'warn' : 'danger'} size="xs" className="ml-auto shrink-0">
              {result.okCount}/{result.total}
            </Badge>
          </div>

          {/* 处置建议 */}
          {result.actions.length > 0 ? (
            <div className="rounded-xl border border-line bg-bg1/45 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[11.5px] text-t2">
                <Lightbulb size={13} className="text-warn" />
                建议这样处理
              </p>
              <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-t3">
                {result.actions.map((a) => (
                  <li key={a}>· {a}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* 逐域名明细 */}
          <div className="overflow-hidden rounded-xl border border-line">
            {result.checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 border-b border-line bg-bg1/35 px-3 py-2 last:border-b-0">
                <span className={`shrink-0 ${c.ok ? 'text-ok' : 'text-danger'}`}>
                  {c.ok ? <Wifi size={13} /> : <WifiOff size={13} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-t1" title={c.label}>
                  {c.label}
                </span>
                <span className="shrink-0 text-[11px] text-t3">{c.kind === 'cdn' ? '图片 CDN' : '业务接口'}</span>
                <span className="w-[46px] shrink-0 text-right text-[11px] text-t3">{c.ms}ms</span>
                <span className="w-[86px] shrink-0 text-right text-[11px] text-t3">
                  {c.ok ? `${c.via ?? '—'} · ${c.status ?? '—'}` : '不可达'}
                </span>
              </div>
            ))}
          </div>

          {/* 失败原因原文（诊断用） */}
          {result.checks.some((c) => !c.ok) ? (
            <div className="rounded-xl border border-line bg-bg1/45 px-3 py-2.5">
              <p className="text-[11.5px] text-t2">失败原因（原文，便于排查）</p>
              <ul className="mt-1.5 space-y-1 break-all text-[11px] leading-relaxed text-t3">
                {result.checks
                  .filter((c) => !c.ok)
                  .map((c) => (
                    <li key={c.label}>
                      · {c.label}：{c.error ?? `HTTP ${c.status ?? '—'}`}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {/* 代理与配置 */}
          <div className="grid gap-2 text-[11.5px] sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg1/40 px-3 py-2">
              <span className="shrink-0 text-t3">当前代理</span>
              <span className="min-w-0 truncate text-right text-t1">
                {result.proxy}
                {result.proxyReachable === false ? '（端口无监听）' : result.proxyReachable === true ? '（端口正常）' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg1/40 px-3 py-2">
              <span className="shrink-0 text-t3">API Key</span>
              <span className={`text-right ${result.config.apiKeySet ? 'text-t1' : 'text-warn'}`}>
                {result.config.apiKeySet ? '已配置' : '未配置'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg1/40 px-3 py-2">
              <span className="shrink-0 text-t3">当前数据源</span>
              <span className="text-right text-t1">
                {result.config.activeSource === 'api' ? 'Steam API 实时数据' : result.config.activeSource === 'demo' ? '内置演示数据' : '本地导入'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg1/40 px-3 py-2">
              <span className="shrink-0 text-t3">自动同步</span>
              <span className="text-right text-t1">
                {result.config.autoSync ? `已开启 · 每 ${result.config.syncIntervalMin} 分钟` : '已关闭'}
              </span>
            </div>
          </div>

          {result.configWarning ? (
            <div className="flex items-start gap-2 rounded-xl border border-warn/45 bg-warn/12 px-3 py-2.5">
              <CircleAlert size={14} className="mt-0.5 shrink-0 text-warn" />
              <p className="text-[11.5px] leading-relaxed text-t2">{result.configWarning}</p>
            </div>
          ) : null}

          <p className="text-[11px] text-t3">检测时间：{formatDateTime(result.checkedAt, '—')}（每次自检都是实时请求，不会用缓存结果）</p>
        </div>
      ) : null}
    </Card>
  )
}
