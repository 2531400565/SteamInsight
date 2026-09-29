import { useCallback, useEffect, useState } from 'react'
import { Activity, HardDrive, Sparkles } from 'lucide-react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { bridge } from '@/services/bridge'
import { formatCount, formatDateTime } from '@/utils/format'
import type { DatabaseHealth } from '@/types/ipc'

const MB = 1024 * 1024

function humanBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / MB).toFixed(2)} MB`
}

/**
 * 数据库健康面板（V3 / F-3 + O-1）。
 *
 * 它回答三个之前完全黑箱的问题：
 *  1. **现在多大** —— `sqlite` 文件在磁盘上的真实字节数，以及每张表各占多少行；
 *  2. **长得多快** —— 近 7 天新增行数、日均、按此线性外推一年后的体积；
 *  3. **能不能更小** —— 「整理并压缩」按钮跑一次 `VACUUM`，当面给出压缩前后的差值。
 *
 * 第 3 条是 O-1 的直接产物：项目此前从未执行过 VACUUM，而 sql.js 落盘是整库导出，
 * 删出来的行只变成空闲页 —— 用户点了「清缓存」看着文件大小纹丝不动，会以为没删掉。
 *
 * 年度外推是**线性估算**不是预测：采样频率会随库规模与同步习惯变化，
 * 所以 `hasEnoughHistory` 为假时会明确提示「数据不足两天，估算仅供参考」。
 */
export function DatabaseHealthPanel({ setMessage }: { setMessage: (message: string | null) => void }) {
  const [health, setHealth] = useState<DatabaseHealth | null>(null)
  const [busy, setBusy] = useState(false)
  const [vacuumed, setVacuumed] = useState<{ before: number; after: number } | null>(null)

  const refresh = useCallback(async () => {
    try {
      setHealth(await bridge.db.health())
    } catch {
      setHealth(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const doVacuum = async (): Promise<void> => {
    setBusy(true)
    setVacuumed(null)
    try {
      const r = await bridge.db.vacuum()
      if (!r.ok) {
        setMessage(r.error ?? '整理失败')
        return
      }
      setVacuumed({ before: r.before, after: r.after })
      const saved = r.before - r.after
      setMessage(saved > 0 ? `已整理数据库：${humanBytes(r.before)} → ${humanBytes(r.after)}（省出 ${humanBytes(saved)}）` : `已整理数据库（${humanBytes(r.after)}，本次无空闲页可回收）`)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!health) return null

  const maxRows = Math.max(1, ...health.tables.map((t) => t.rows))
  const saved = vacuumed ? vacuumed.before - vacuumed.after : 0

  return (
    <Card padding="md">
      <SectionHeader
        title="数据库健康"
        subtitle="体积、增速与回收；数据全部来自本机 SQLite 的真实统计"
        icon={<Activity size={15} />}
        action={
          <Badge tone={health.fileBytes > 20 * MB ? 'warn' : 'neutral'} size="xs">
            {humanBytes(health.fileBytes)}
          </Badge>
        }
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cell label="文件体积" value={humanBytes(health.fileBytes)} hint={`${formatCount(health.totalRows)} 行 · 平均 ${health.growth.bytesPerRow} B/行`} icon={<HardDrive size={12} />} />
        <Cell label="近 7 天新增" value={`${formatCount(health.growth.last7Rows)} 行`} hint={`观测跨度 ${health.growth.observedDays} 天`} />
        <Cell label="平均每天" value={`${health.growth.perDay} 行`} hint={health.hasEnoughHistory ? '按当前速度线性估算' : '样本不足两天，仅供参考'} />
        <Cell
          label="一年后预估"
          value={humanBytes(health.fileBytes + health.growth.projectedYearBytes)}
          hint={`约 +${formatCount(health.growth.projectedYearRows)} 行`}
          tone={health.fileBytes + health.growth.projectedYearBytes > 100 * MB ? 'warn' : undefined}
        />
      </div>

      {/* 每表行数：一张横向条形图就够看出「到底是涨哪张表」 */}
      <div className="mt-4 space-y-1.5 border-t border-line pt-3">
        {health.tables.map((t) => (
          <div key={t.table} className="flex items-center gap-2">
            <span className="w-[86px] shrink-0 truncate text-[11.5px] text-t3" title={t.table}>
              {t.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg1">
              <div className="h-full rounded-full bg-accent/70" style={{ width: `${(t.rows / maxRows) * 100}%` }} />
            </div>
            <span className="w-[92px] shrink-0 text-right text-[11.5px] text-t2">
              {formatCount(t.rows)}
              {t.last7 > 0 ? <span className="text-accent"> +{t.last7}</span> : null}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <Button size="sm" variant="secondary" icon={<Sparkles size={14} />} loading={busy} onClick={() => void doVacuum()}>
          {busy ? '整理中…' : '整理并压缩数据库'}
        </Button>
        <p className="min-w-[280px] flex-1 text-[11.5px] leading-relaxed text-t3">
          {saved > 0 ? (
            <>上次整理：{humanBytes(vacuumed!.before)} → {humanBytes(vacuumed!.after)}（省出 {humanBytes(saved)}）。</>
          ) : (
            <>删除数据只会留下空闲页，文件不会自己变小；「整理」会重建库文件把这部分真正还给磁盘。</>
          )}
          {' '}降采样会定期清理过期的价格采样与快照，这里看到的就是它的实际效果。
        </p>
      </div>

      <p className="mt-2 text-[11px] text-t3">
        统计时间 {formatDateTime(Math.floor(Date.now() / 1000))}
      </p>
    </Card>
  )
}

function Cell({
  label,
  value,
  hint,
  icon,
  tone
}: {
  label: string
  value: string
  hint?: string
  icon?: React.ReactNode
  tone?: 'warn'
}) {
  return (
    <div className="rounded-xl border border-line bg-bg1/45 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[11px] text-t3">
        {icon}
        {label}
      </p>
      <p className={`mt-0.5 text-[17px] font-semibold ${tone === 'warn' ? 'text-warn' : 'text-t1'}`}>{value}</p>
      {hint ? <p className="truncate text-[10.5px] text-t3">{hint}</p> : null}
    </div>
  )
}
