/**
 * 主进程 ↔ 渲染进程 IPC 通道常量。
 * 单一事实来源：main / preload / renderer 三方都引用本文件，避免通道名漂移。
 */
export const CH = {
  // ---- 应用信息 ----
  appInfo: 'app:info',
  openExternal: 'app:open-external',

  // ---- Steam 智能检测 ----
  steamDetect: 'steam:detect',
  steamLaunch: 'steam:launch',

  // ---- 登录 ----
  authOpenIdStart: 'auth:openid-start',
  authOpenIdStatus: 'auth:openid-status',
  authLogout: 'auth:logout',
  authRestore: 'auth:restore',

  // ---- 数据库 / 同步 ----
  dbQuery: 'db:query',
  dbExport: 'db:export',
  dbClearCache: 'db:clear-cache',
  dbLoadSnapshot: 'db:load-snapshot',
  dbHealth: 'db:health',
  dbVacuum: 'db:vacuum',
  syncRun: 'sync:run',
  syncStatus: 'sync:status',
  syncMessage: 'sync:message',

  // ---- 设置 ----
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',

  // ---- 用户自己的内容（评分 / 笔记 / 追猎清单）----
  notesSet: 'notes:set',
  notesClear: 'notes:clear',
  huntToggle: 'hunt:toggle',

  // ---- 手动补录游玩会话（F-1）----
  sessionsAdd: 'sessions:add',
  sessionsRemove: 'sessions:remove',
  sessionsListApp: 'sessions:list-app',

  // ---- 通知 ----
  notify: 'notify:notify',
  notifyClicked: 'notify:clicked',

  // ---- 导出 ----
  exportWrapped: 'export:wrapped',
  exportTable: 'export:table',

  // ---- 成就（按需取数 + 补全）----
  achQuery: 'ach:query',
  priceHistoryQuery: 'price:history',
  apiHealth: 'net:api-health',
  secretStatus: 'app:secret-status',
  storeSearch: 'store:search',
  achBackfill: 'ach:backfill',
  achBackfillProgress: 'ach:backfill-progress',

  // ---- 诊断与数据包 ----
  netDiagnose: 'net:diagnose',
  /** hosts 劫持状态（只读诊断） */
  hostsStatus: 'net:hosts-status',
  /** hosts 外科手术式还原的执行计划（只算不写，供界面预览） */
  hostsPlan: 'net:hosts-plan',
  /** 执行还原（内部先备份再提权写入） */
  hostsApply: 'net:hosts-apply',
  hostsBackups: 'net:hosts-backups',
  hostsRestore: 'net:hosts-restore',
  /** 应用级自定义代理（只影响本应用，不动系统） */
  proxyApply: 'net:proxy-apply',
  proxyTest: 'net:proxy-test',
  diagExport: 'diag:export',
  packExport: 'pack:export',
  packImport: 'pack:import',

  // ---- 定期自动备份（F-2）----
  backupStatus: 'backup:status',
  backupRun: 'backup:run',
  backupOpenDir: 'backup:open-dir',

  // ---- 封面缓存（V5 优化 2：设置页清理入口）----
  coverCacheStats: 'cover-cache:stats',
  coverCacheClear: 'cover-cache:clear',

  // ---- 窗口 ----
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowClose: 'window:close',
  windowIsMaximized: 'window:is-maximized',
  windowMaximizedChanged: 'window:maximized-changed',

  // ---- 导航（通知点击后跳转）----
  navigate: 'nav:navigate'
} as const

export type ChannelName = (typeof CH)[keyof typeof CH]
