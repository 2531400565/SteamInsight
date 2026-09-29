import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
  /** 右侧补充信息区（例如数据口径说明） */
  aside?: ReactNode
}

/** 所有内页统一的页头：标题 + 说明 + 右侧操作区。 */
export function PageHeader({ title, subtitle, icon, action, aside }: PageHeaderProps) {
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
          {aside}
        </div>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}
