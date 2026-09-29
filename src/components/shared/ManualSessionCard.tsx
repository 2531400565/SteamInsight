import { useCallback, useEffect, useState } from 'react'
import { Info, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { bridge } from '@/services/bridge'
import { useDataStore } from '@/store/useDataStore'
import { formatMinutes, toYMD } from '@/utils/format'

/** 会话来源 → 中文名。'manual' 是用户自己补的，必须和自动采样区分开，不能冒充采样数据。 */
const SOURCE_LABEL: Record<string, string> = {
  manual: '手动补录',
  api: 'API 采样',
  local: '本地导入',
  snapshot: '快照差分',
  demo: '内置演示'
}

function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? (source || '未知来源')
}

function todayYMD(): string {
  return toYMD(new Date())
}

/** 'HH:MM' → 当日分钟数；解析不出来就退回默认的 20:00。 */
function parseClock(v: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim())
  if (!m) return 20 * 60
  const h = Math.min(23, Math.max(0, Number(m[1])))
  const mi = Math.min(59, Math.max(0, Number(m[2])))
  return h * 60 + mi
}

interface SessionRow {
  id: number
  playDate: string
  minutes: number
  source: string
}

/**
 * 「补录游玩时长」卡片（V3 / F-1）。
 *
 * Steam **没有任何官方接口**给出「每天玩了多少分钟」。本应用唯一的自动来源是
 * 快照差分采样，而它只看得到「App 正在运行时」的增量 —— 真实用户库实测
 * 138 条快照全部落在 2 个时刻、两次之间没有任何游戏时长变化，`play_sessions` 恒为 0，
 * 于是趋势图 / 热力图 / 常玩时段 / 年报这条占一半价值的产品线完全空转。
 *
 * 这张卡片把主动权交还给用户：填「哪天 + 玩了多少分钟」，立刻参与所有时间维度统计。
 * 口径必须诚实 —— 落库时 `source='manual'`，这里逐条打「手动补录」标记，
 * 并且在下方的说明里写清楚它跟自动采样不是一回事。
 */
export function ManualSessionCard({ appId, gameName }: { appId: number; gameName: string }) {
  const load = useDataStore((s) => s.load)

  const [date, setDate] = useState(todayYMD)
  const [minutes, setMinutes] = useState('60')
  const [clock, setClock] = useState('20:00')
  const [rows, setRows] = useState<SessionRow[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const refresh = useCallback(async () => {
    const list = await bridge.sessions.listApp(appId)
    setRows(list.map((r) => ({ id: r.id, playDate: r.playDate, minutes: r.minutes, source: r.source })))
  }, [appId])

  // 切换游戏时重置表单并重拉列表（组件实例被复用，草稿必须跟着换）
  useEffect(() => {
    setDate(todayYMD())
    setMinutes('60')
    setClock('20:00')
    setMessage(null)
    void refresh()
  }, [appId, refresh])

  const submit = async (): Promise<void> => {
    const value = Number(minutes)
    if (!Number.isFinite(value) || value < 1 || value > 1440) {
      setMessage({ tone: 'error', text: '时长需填 1–1440 之间的分钟数' })
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setMessage({ tone: 'error', text: '日期格式应为 YYYY-MM-DD' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const res = await bridge.sessions.add({ appId, playDate: date, minutes: value, startMinuteOfDay: parseClock(clock) })
      if (!res.ok) {
        setMessage({ tone: 'error', text: res.error })
        return
      }
      setMessage({ tone: 'ok', text: `已补录 ${date} · ${formatMinutes(value)}` })
      // 让趋势图 / 年度累计立刻重算：这些图表全部从快照的 sessions 派生
      await load()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await bridge.sessions.remove(id)
      if (!res.ok) {
        setMessage({ tone: 'error', text: '这条记录不是手动补录的，删除被拒绝' })
        return
      }
      await load()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const manualCount = rows.reduce((n, r) => (r.source === 'manual' ? n + 1 : n), 0)
  const manualMinutes = rows.reduce((n, r) => (r.source === 'manual' ? n + r.minutes : n), 0)

  return (
    <Card padding="md">
      <SectionHeader
        title="会话记录与手动补录"
        subtitle={rows.length > 0 ? `共 ${rows.length} 段记录` : '还没有任何会话记录'}
        icon={<Plus size={15} />}
        action={
          manualCount > 0 ? (
            <Badge tone="accent" size="xs">
              手动 {manualCount} 段 · {formatMinutes(manualMinutes)}
            </Badge>
          ) : null
        }
      />

      {/* 补录表单：三项够用，再多项就是负担 —— 开始时间只影响「常玩时段」那张图 */}
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-[1fr_84px_84px] gap-2">
          <label className="min-w-0">
            <span className="mb-1 block text-[11px] text-t3">游玩日期</span>
            <input
              type="date"
              value={date}
              max={todayYMD()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg1/70 px-2 py-1.5 text-[12px] text-t1 outline-none transition-colors focus:border-line3"
            />
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-[11px] text-t3">时长/分钟</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg1/70 px-2 py-1.5 text-[12px] text-t1 outline-none transition-colors focus:border-line3"
            />
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-[11px] text-t3">开始于</span>
            <input
              type="time"
              value={clock}
              onChange={(e) => setClock(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg1/70 px-2 py-1.5 text-[12px] text-t1 outline-none transition-colors focus:border-line3"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => void submit()} disabled={busy} icon={<Plus size={14} />}>
            {busy ? '处理中…' : `给《${gameName}》补录一条`}
          </Button>
          {message ? <span className={`text-[11.5px] ${message.tone === 'ok' ? 'text-ok' : 'text-danger'}`}>{message.text}</span> : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-[12px] text-t3">这款游戏还没有会话记录，可以在上面补录第一条。</p>
        ) : (
          rows.slice(0, 8).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-bg1/45 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[12px] text-t2">{s.playDate}</p>
                <p className="text-[11px] text-t3">来源 {sourceLabel(s.source)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[12.5px] text-accent">{formatMinutes(s.minutes)}</span>
                {s.source === 'manual' ? (
                  <button
                    type="button"
                    aria-label={`删除 ${s.playDate} 的手动补录记录`}
                    title="删除这条手动补录"
                    onClick={() => void remove(s.id)}
                    disabled={busy}
                    className="rounded-md p-1 text-t3 transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="mt-3 flex items-start gap-1.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-t3">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          自动采样只在<span className="text-t2"> App 运行时</span>记录时长增量，安装之前的历史抓不到；
          手动补录填补的正是这段空白。两者都参与统计，但来源分别标记为「手动补录」与「API 采样」，
          不会互相冒充。删除只对手工补录生效 —— 删掉自动采样的会话会让下次差分把同一段时间重复计算。
        </span>
      </p>
    </Card>
  )
}
