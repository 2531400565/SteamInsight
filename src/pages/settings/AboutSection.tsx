import { useEffect, useState } from 'react'
import { HardDrive, Info, RefreshCw } from 'lucide-react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { bridge } from '@/services/bridge'
import type { AppInfo } from '@/types/ipc'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-bg1/40 px-3 py-2">
      <span className="shrink-0 text-t3">{label}</span>
      <span className="min-w-0 break-all text-right text-t1">{value}</span>
    </div>
  )
}

/** 设置页「关于」区块：运行环境、本地路径、Steam 检测入口。 */
export function AboutSection() {
  const snapshot = useDataStore((s) => s.snapshot)
  const detection = useAppStore((s) => s.detection)
  const detect = useAppStore((s) => s.detect)
  const navigate = useAppStore((s) => s.navigate)

  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void bridge.app.info().then(setInfo).catch(() => setInfo(null))
  }, [])

  const sourceText =
    snapshot?.user?.source === 'api' ? 'Steam API 实时数据' : snapshot?.user?.source === 'local' ? '本地导入' : '内置演示数据'

  return (
    <Card padding="md">
      <SectionHeader title="关于" subtitle="运行环境与本地路径" icon={<Info size={15} />} />
      <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2">
        <Row label="软件版本" value={`v${info?.version ?? '1.0.0'}`} />
        <Row label="Electron" value={info?.electron ?? '—'} />
        <Row label="Node" value={info?.node ?? '—'} />
        <Row label="Chromium" value={(info?.chrome ?? '—').slice(0, 60)} />
        <Row label="当前数据源" value={sourceText} />
        <Row label="Steam 安装路径" value={detection?.installPath ?? '未检测到'} />
      </div>
      <div className="mt-3 space-y-2 border-t border-line pt-3 text-[11.5px] text-t3">
        <p className="flex items-start gap-2">
          <HardDrive size={13} className="mt-0.5 shrink-0" />
          <span className="break-all">数据库：{info?.dbPath ?? '（未知）'}</span>
        </p>
        <p className="flex items-start gap-2">
          <HardDrive size={13} className="mt-0.5 shrink-0" />
          <span className="break-all">配置目录：{info?.userDataPath ?? '（未知）'}</span>
        </p>
        <p className="flex items-start gap-2">
          <HardDrive size={13} className="mt-0.5 shrink-0" />
          <span className="break-all">
            日志目录：{info?.logsPath ?? '（未知）'}（按天切分，保留 7 天）
          </span>
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => void detect()}>
          重新检测 Steam
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate('wrapped')}>
          查看年度报告
        </Button>
        <Badge tone="neutral" size="sm">
          本软件不修改 Steam 客户端，不读写游戏数据
        </Badge>
      </div>
    </Card>
  )
}
