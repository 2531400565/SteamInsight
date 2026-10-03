import { useEffect, useState, type ReactNode } from 'react'
import {
  Bell,
  Database,
  Info,
  Monitor,
  Moon,
  Palette,
  Power,
  Settings,
  Sun,
  User,
  Wifi
} from 'lucide-react'
import { Badge, Button, Card, SectionHeader, Segmented, Switch } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardLayoutEditor } from '@/components/shared/DashboardLayoutEditor'
import { useAppStore } from '@/store/useAppStore'
import { bridge } from '@/services/bridge'
import { useDensity } from '@/hooks/useDensity'
import type { ThemeMode } from '@/types/steam'
import { AccountSection } from './settings/AccountSection'
import { DataSection } from './settings/DataSection'
import { NetworkSection } from './settings/NetworkSection'
import { NetworkAccessPanel } from '@/components/shared/NetworkAccessPanel'
import { DataTrustPanel } from '@/components/shared/DataTrustPanel'
import { AboutSection } from './settings/AboutSection'

type SectionKey = 'general' | 'notify' | 'appearance' | 'account' | 'network' | 'data' | 'about'

const TABS: Array<{ key: SectionKey; label: string; icon: ReactNode }> = [
  { key: 'general', label: '通用', icon: <Power size={13} /> },
  { key: 'notify', label: '通知', icon: <Bell size={13} /> },
  { key: 'appearance', label: '外观', icon: <Palette size={13} /> },
  { key: 'account', label: '账号', icon: <User size={13} /> },
  { key: 'network', label: '网络', icon: <Wifi size={13} /> },
  { key: 'data', label: '数据', icon: <Database size={13} /> },
  { key: 'about', label: '关于', icon: <Info size={13} /> }
]

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings)
  const theme = useAppStore((s) => s.theme)
  const patchSettings = useAppStore((s) => s.patchSettings)
  const detection = useAppStore((s) => s.detection)
  const [density, setDensity] = useDensity()

  const tab = useAppStore((s) => s.params.tab)

  const [activeTab, setActiveTab] = useState<SectionKey>(
    tab && TABS.some((t) => t.key === tab) ? (tab as SectionKey) : 'general'
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  /**
   * 命令面板可以带 `tab` 参数跳进某一节（例如「设置 → 连通性自检」）。
   * V4/O2：设置页改为分区标签页后，「跳到某一节」= 直接切到对应 tab（不再依赖锚点滚动）。
   */
  useEffect(() => {
    if (tab && TABS.some((t) => t.key === tab)) setActiveTab(tab as SectionKey)
  }, [tab])

  const run = async (key: string, task: () => Promise<void>): Promise<void> => {
    setBusy(key)
    setMessage(null)
    try {
      await task()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Settings size={19} />}
        title="设置"
        subtitle="所有设置只写入本机配置文件（userData/settings.json），不会同步到云端。左侧导航的其余页面无需重新同步即可生效。"
        action={
          <Badge tone={detection?.apiReachable ? 'ok' : 'warn'} size="sm">
            {detection?.apiReachable ? 'Steam 网络正常' : 'Steam 网络受限'}
          </Badge>
        }
      />

      {message ? (
        <div className="rounded-xl border border-line2 bg-accent3/12 px-3 py-2 text-[12px] text-accent">{message}</div>
      ) : null}

      {/* V4/O2：分区导航 —— 把原先堆在一个长滚动页里的 7 段改为顶部 Segmented 切换，找项不再滚来滚去 */}
      <Segmented
        value={activeTab}
        options={TABS.map((t) => ({ value: t.key, label: t.label, icon: t.icon }))}
        onChange={(v) => setActiveTab(v as SectionKey)}
        className="w-full"
      />

      {/* 通用 */}
      {activeTab === 'general' ? (
        <Card padding="md">
          <SectionHeader title="通用" subtitle="启动行为与同步策略" icon={<Power size={15} />} />
          <div className="mt-3 space-y-3">
            <Switch
              checked={settings.autoLaunch}
              onChange={(v) => void patchSettings({ autoLaunch: v })}
              label="开机自动启动"
              description="写入系统登录项，开机后自动在托盘运行"
            />
            <Switch
              checked={settings.minimizeToTray}
              onChange={(v) => void patchSettings({ minimizeToTray: v })}
              label="最小化到系统托盘"
              description="关闭窗口时只隐藏到托盘，不退出进程"
            />
            <Switch
              checked={settings.autoSync}
              onChange={(v) => void patchSettings({ autoSync: v })}
              label="自动同步"
              description="按下方间隔在后台静默拉取最新数据"
            />
            <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
              <div>
                <p className="text-[13px] text-t1">同步间隔</p>
                <p className="text-[11.5px] text-t3">间隔越短，游玩记录采样越细，但对 Steam 的请求也越频繁</p>
              </div>
              <div className="shrink-0">
                <Segmented
                  size="sm"
                  value={String(settings.syncIntervalMin)}
                  options={[
                    { value: '15', label: '15 分钟' },
                    { value: '30', label: '30 分钟' },
                    { value: '60', label: '60 分钟' }
                  ]}
                  onChange={(v) => void patchSettings({ syncIntervalMin: Number(v) as 15 | 30 | 60 })}
                />
              </div>
            </div>

            {/* F-2：自动备份。保护的是「Steam 再也拿不回来」的那批数据，默认开着。 */}
            <div className="space-y-3 border-t border-line pt-3">
              <Switch
                checked={settings.autoBackup}
                onChange={(v) => void patchSettings({ autoBackup: v })}
                label="每天自动备份数据"
                description="把价格采样、游玩记录、笔记与追猎清单存到本地备份目录 —— 这些数据一旦丢失无法从 Steam 重新拉取"
              />
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11.5px] text-t3">保留份数（滚动删除更早的备份，至少保留 1 份）</p>
                <div className="shrink-0">
                  <Segmented
                    size="sm"
                    value={String(settings.autoBackupKeep)}
                    options={[
                      { value: '3', label: '3 份' },
                      { value: '7', label: '7 份' },
                      { value: '14', label: '14 份' }
                    ]}
                    onChange={(v) => void patchSettings({ autoBackupKeep: Number(v) })}
                  />
                </div>
              </div>
            </div>

            {/* F-4：换账号策略。默认值必须显式选中，不能靠「什么都不做」来兜底。 */}
            <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
              <div>
                <p className="text-[13px] text-t1">检出换账号时</p>
                <p className="text-[11.5px] text-t3">
                  清理 = 删掉旧账号的游玩记录与差分快照，从干净基准重新开始；
                  保留 = 只更新游戏库，旧会话会混在新数据里（可能凭空多出几百小时）
                </p>
              </div>
              <div className="shrink-0">
                <Segmented
                  size="sm"
                  value={settings.accountSwitchPolicy}
                  options={[
                    { value: 'clear', label: '清理旧数据' },
                    { value: 'keep', label: '保留旧数据' }
                  ]}
                  onChange={(v) => void patchSettings({ accountSwitchPolicy: v as 'clear' | 'keep' })}
                />
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* 通知 */}
      {activeTab === 'notify' ? (
        <Card padding="md">
          <SectionHeader title="通知" subtitle="通过 Windows 原生通知推送，点击可跳转到对应页面" icon={<Bell size={15} />} />
          <div className="mt-3 space-y-3">
            <Switch
              checked={settings.notifyWishlistDrop}
              onChange={(v) => void patchSettings({ notifyWishlistDrop: v })}
              label="愿望单降价"
              description="愿望单中任意游戏出现折扣时提醒"
            />
            <Switch
              checked={settings.notifyHistoricalLow}
              onChange={(v) => void patchSettings({ notifyHistoricalLow: v })}
              label="今日史低"
              description="现价低于本机历史采样最低价时提醒"
            />
            <Switch
              checked={settings.notifyFreeGame}
              onChange={(v) => void patchSettings({ notifyFreeGame: v })}
              label="免费游戏提醒"
              description="折扣列表中出现价格为 0 的条目时提醒"
            />
            <Switch
              checked={settings.notifyAchievementHunt}
              onChange={(v) => void patchSettings({ notifyAchievementHunt: v })}
              label="稀有成就追猎"
              description="每天最多一次，提示还剩多少稀有成就未解锁"
            />
            <div className="border-t border-line pt-3">
              <Button
                size="sm"
                variant="secondary"
                icon={<Bell size={14} />}
                onClick={() =>
                  void run('test-notify', async () => {
                    await bridge.notify({ title: 'Steam Insight', body: '这是一条测试通知，点击可跳转到折扣商城。', route: 'store' })
                    setMessage('已发送测试通知（若系统通知被关闭，可能不会弹出）。')
                  })
                }
              >
                发送测试通知
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* 外观 */}
      {activeTab === 'appearance' ? (
        <Card padding="md">
          <SectionHeader title="外观" subtitle={`当前生效：${theme === 'dark' ? '深色' : '浅色'}`} icon={<Palette size={15} />} />
          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[11.5px] text-t3">
              {settings.theme === 'system' ? <Monitor size={14} /> : theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              <span>主题会立即应用于整个界面，图表配色同步切换</span>
            </div>
            <Segmented
              value={settings.theme}
              options={[
                { value: 'dark', label: '深色', icon: <Moon size={13} /> },
                { value: 'light', label: '浅色', icon: <Sun size={13} /> },
                { value: 'system', label: '跟随系统', icon: <Monitor size={13} /> }
              ]}
              onChange={(v) => void patchSettings({ theme: v as ThemeMode })}
            />
          </div>
          {/* V4 / O-7：密度切换（舒适 / 紧凑） */}
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3">
            <div className="flex items-center gap-2 text-[11.5px] text-t3">
              <span>紧凑模式会收窄页面间距与卡片内边距，一屏多看</span>
            </div>
            <Segmented
              size="sm"
              value={density}
              options={[
                { value: 'comfortable', label: '舒适' },
                { value: 'compact', label: '紧凑' }
              ]}
              onChange={(v) => setDensity(v as 'comfortable' | 'compact')}
            />
          </div>
          {/* V4 / O-6：仪表盘区块显隐 + 排序 */}
          <DashboardLayoutEditor />
          {/* V4/UI3：主题预览 —— 比纯文字「当前生效：深色」更直观 */}
          <div className="mt-3 flex gap-2">
            <div className="flex-1 overflow-hidden rounded-xl border border-line">
              <div className="h-9 bg-[#15161c]" />
              <div className="flex items-center gap-1.5 bg-[#0f1014] px-2 py-1.5">
                <span className="size-2 rounded-full bg-[#6ea8fe]" />
                <span className="h-1.5 w-12 rounded-full bg-white/80" />
              </div>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl border border-line">
              <div className="h-9 bg-[#e8eaf0]" />
              <div className="flex items-center gap-1.5 bg-[#f4f5f8] px-2 py-1.5">
                <span className="size-2 rounded-full bg-[#2f6fed]" />
                <span className="h-1.5 w-12 rounded-full bg-black/70" />
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* 账号 */}
      {activeTab === 'account' ? <AccountSection busy={busy} run={run} setMessage={setMessage} /> : null}

      {/* 网络 */}
      {activeTab === 'network' ? (
        <>
          <NetworkAccessPanel />
          <NetworkSection />
        </>
      ) : null}

      {/* 数据可信度：接口结构指纹 + 成就新鲜度 */}
      {activeTab === 'data' ? <DataTrustPanel /> : null}

      {/* 数据 */}
      {activeTab === 'data' ? <DataSection busy={busy} run={run} setMessage={setMessage} /> : null}

      {/* 关于 */}
      {activeTab === 'about' ? <AboutSection /> : null}
    </div>
  )
}
