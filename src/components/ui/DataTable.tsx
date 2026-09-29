import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render: (row: T, index: number) => ReactNode
}

interface DataTableProps<T> {
  columns: Array<Column<T>>
  rows: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  empty?: ReactNode
  maxHeight?: number
  className?: string
}

const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  maxHeight,
  className = ''
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className={className}>{empty ?? <EmptyState title="暂无数据" />}</div>
  }
  return (
    <div
      className={`overflow-auto rounded-card border border-line ${className}`}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-bg2">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={`px-3 py-2.5 text-t3 font-medium text-xs uppercase tracking-wide border-b border-line ${ALIGN[c.align ?? 'left']}`}
              >
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-line/60 ${onRowClick ? 'cursor-pointer hover:bg-bg3' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2.5 text-t2 ${ALIGN[c.align ?? 'left']}`}>
                  {c.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
