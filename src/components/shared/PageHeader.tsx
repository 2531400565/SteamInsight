import type { ReactNode } from 'react'
import { Clock } from 'lucide-react'
import { useDataStore } from '@/store/useDataStore'
import { formatRelative } from '@/utils/format'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
  /** 右侧补充信息区（例如数据口径说明） */
  aside?: ReactNode
  /** 关掉数据新鲜度标注（极少数纯静态页面用） */
  hideFreshness?: boolean
}

/**
 * 所有内页统一的页头：标题 + 说明 + 右侧操作区。
 *
 * 顺带在这里统一标注**数据新鲜度**（更新时间 + 数据来源）。这不是装饰：
 * 之前用户看到「顶栏说网络受限、但列表数据在更新」时完全无从判断哪个可信 ——
 * 每个页面都写清「这份数据是什么时候、从哪来的」，很多疑问会自己消失。
 * 放在这里而不是每个页面各写一遍，是为了保证 12 个页面口径完全一致。
 */
export function PageHeader({ title, subtitle, icon, action, aside, hideFreshness }: PageHeaderProps) {
  const user = useDataStore((s) => s.snapshot?.user)
  const syncedAt = user?.syncedAt ?? null
  const source = user?.source

  const sourceLabel = source === 'api' ? 'Steam API' : source === 'demo' ? '演示数据' : '本地缓存'
  const sourceTone = source === 'api' ? 'text-t3' : 'text-warn'

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex size-10 items-center justify-center rounded-xl border border-line bg-bg2 text-accent">
            {icon}
          </div>
        ) : null}
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-t1">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-[720px] text-[13px] leading-relaxed text-t3">{subtitle}</p> : null}
          {hideFreshness ? null : (
            <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-t3" title="页面上的所有数字都来自这次同步的结果；数据不会自动实时刷新">
              <Clock size={11} />
              {syncedAt ? `数据更新于 ${formatRelative(syncedAt)}` : '尚未同步'}
              <span className={sourceTone}>· 来源 {sourceLabel}</span>
            </p>
          )}
          {aside}
        </div>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}
