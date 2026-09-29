import { useEffect, useState } from 'react'
import { Check, Info, NotebookPen, Star, Tag } from 'lucide-react'
import { Badge, Button, Card, SectionHeader, Select } from '@/components/ui'
import { StarRating } from '@/components/shared/StarRating'
import { bridge } from '@/services/bridge'
import { useDataStore } from '@/store/useDataStore'
import { formatDateTime } from '@/utils/format'

const NOTE_PLACEHOLDER = '写点只有你自己知道的东西：为什么买、卡在哪、值不值得推荐给朋友…'

/** 游玩状态选项（V4 / F-4）。空串 = 未设置。 */
const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '未设置' },
  { value: 'wish', label: '想玩' },
  { value: 'playing', label: '在玩' },
  { value: 'abandoned', label: '弃坑' }
]

/** 把用户输入的「空格 / 逗号 / 顿号」分隔文本解析成标签数组。 */
function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,，、]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
  ).slice(0, 12)
}

/**
 * 「我的评分与笔记」卡片（N2 / 新表项）。
 *
 * 为什么要单独存一张表：这些内容**不由任何接口重建**。
 * 游戏出库、换账号、清缓存重新同步都会删改 `games` 行，
 * 如果把笔记塞在 games 里，一次「清缓存重新同步」就全没了。
 *
 * 保存是显式的（不在输入时自动落库）：自动保存需要在每次按键都写一次 SQLite 并刷新整份快照，
 * 而这里的编辑频率是人写文章的量级，一个「保存」按钮反而更符合预期，也更容易讲清「存了没」。
 */
export function NotesCard({ appId }: { appId: number }) {
  const notes = useDataStore((s) => s.derived?.notes)
  const applyNote = useDataStore((s) => s.applyNote)
  const saved = notes?.get(appId) ?? null

  const [rating, setRating] = useState(saved?.rating ?? 0)
  const [note, setNote] = useState(saved?.note ?? '')
  const [status, setStatus] = useState(saved?.status ?? '')
  const [tags, setTags] = useState<string[]>(saved?.tags ?? [])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // 换游戏（同一个组件实例被复用）时把草稿重置成该游戏已存的内容
  useEffect(() => {
    setRating(saved?.rating ?? 0)
    setNote(saved?.note ?? '')
    setStatus(saved?.status ?? '')
    setTags(saved?.tags ?? [])
    setSavedAt(null)
    // 只在切换游戏时重置，不跟随 saved 变化 —— 否则用户正在打字时被同步覆盖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId])

  const dirty =
    rating !== (saved?.rating ?? 0) ||
    note !== (saved?.note ?? '') ||
    status !== (saved?.status ?? '') ||
    tags.length !== (saved?.tags ?? []).length ||
    tags.some((t, i) => t !== (saved?.tags ?? [])[i])

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      const result = await bridge.notes.set({ appId, rating, note, status, tags })
      // 主进程已落库，这里只对齐内存：避免为了一条笔记把整份快照（数 MB）重走一遍 IPC
      applyNote(result, appId)
      setSavedAt(Math.floor(Date.now() / 1000))
    } finally {
      setSaving(false)
    }
  }

  const clear = async (): Promise<void> => {
    setSaving(true)
    try {
      await bridge.notes.clear(appId)
      applyNote(null, appId)
      setRating(0)
      setNote('')
      setStatus('')
      setTags([])
      setSavedAt(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card padding="md">
      <SectionHeader
        title="我的评分与笔记"
        subtitle="只存在本机数据库，不随 Steam 数据一起被覆盖"
        icon={<NotebookPen size={15} />}
        action={
          saved ? (
            <Badge tone="neutral" size="xs">
              已记录
            </Badge>
          ) : null
        }
      />

      <div className="mt-3 space-y-3">
        <div className="flex items-center gap-2">
          <Star size={13} className="text-t3" />
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* V4 / F-4：结构化状态 + 标签 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11.5px] text-t3">游玩状态</p>
            <Select label="" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[11.5px] text-t3">
              <Tag size={12} />
              标签（空格 / 逗号分隔，最多 12 个）
            </p>
            <input
              value={tags.join(' ')}
              onChange={(e) => setTags(parseTags(e.target.value))}
              placeholder="例如：肉鸽 联机 打折必入"
              className="w-full rounded-xl border border-line bg-bg1/60 px-3 py-2 text-[12.5px] text-t1 outline-none transition-colors placeholder:text-t3 focus:border-line3"
            />
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-pill bg-accent3/18 px-2 py-0.5 text-[11.5px] text-accent">
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 2000))}
          rows={4}
          placeholder={NOTE_PLACEHOLDER}
          className="w-full resize-y rounded-xl border border-line bg-bg1/60 px-3 py-2 text-[12.5px] leading-relaxed text-t1 outline-none transition-colors placeholder:text-t3 focus:border-line3"
        />

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => void save()} disabled={saving || !dirty} icon={<Check size={14} />}>
            {saving ? '保存中…' : dirty ? '保存' : '已保存'}
          </Button>
          {saved || rating > 0 || note || status || tags.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => void clear()} disabled={saving}>
              清空
            </Button>
          ) : null}
          <span className="ml-auto text-[11px] text-t3">
            {note.length}/2000
            {savedAt ? ' · 刚刚保存' : saved ? ` · 上次更新 ${formatDateTime(saved.updatedAt)}` : ''}
          </span>
        </div>

        <p className="flex items-start gap-1.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-t3">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>
            这份笔记与评分<span className="text-t2">不会</span>被同步覆盖，也不会随「清缓存重新同步」丢失；导出数据包时一并带走。
          </span>
        </p>
      </div>
    </Card>
  )
}
