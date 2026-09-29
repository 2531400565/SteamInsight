/**
 * SQLite 表结构（DDL）。纯 SQL 字符串，主进程与渲染层都引用，不依赖 electron。
 * 约定：金额 INTEGER（分，-1 未定价）、时长 INTEGER（分钟）、时间戳 INTEGER（unix 秒）、
 * 日期 TEXT（YYYY-MM-DD）、数组字段用 JSON 字符串存。所有建表用 IF NOT EXISTS 保证幂等。
 * 注意：snapshots 是内部差分采样表，不计入 PRD 的 8 张核心表。
 */

// 行 ↔ 领域对象映射所需的列名常量集中在 repository.ts，这里只写 DDL。
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  steam_id          TEXT PRIMARY KEY,
  persona_name      TEXT NOT NULL,
  avatar_url        TEXT NOT NULL,
  profile_url       TEXT NOT NULL,
  country_code      TEXT NOT NULL,
  account_created_at INTEGER,
  last_logoff_at    INTEGER,
  persona_state     INTEGER NOT NULL DEFAULT 0,
  source            TEXT NOT NULL,
  synced_at         INTEGER,
  -- F-6：Steam 等级与徽章（v5 迁移补的列；取值每次同步覆盖）
  level             INTEGER NOT NULL DEFAULT 0,
  badge_count       INTEGER NOT NULL DEFAULT 0,
  badge_xp          INTEGER NOT NULL DEFAULT 0,
  player_xp         INTEGER NOT NULL DEFAULT 0,
  xp_to_next        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS games (
  app_id                INTEGER PRIMARY KEY,
  /**
   * 这一行属于哪个 Steam 账号。**不参与主键**（改主键需要重建整表 + 改动所有查询，
   * 见 docs/ROADMAP-V2.md 的说明），只用于「换账号」检测：
   * 库里的 steam_id 与当前设置不一致时，界面明确告知「整库将被新账号替换」，
   * 而不是让用户发现 69 款游戏无声消失。
   * 空串 = 本次迁移前写入的历史行（来源未知）。
   */
  steam_id              TEXT NOT NULL DEFAULT '',
  name                  TEXT NOT NULL,
  header_image          TEXT NOT NULL,
  capsule_image         TEXT NOT NULL,
  genres                TEXT NOT NULL,
  tags                  TEXT NOT NULL,
  release_date          TEXT NOT NULL,
  developer             TEXT NOT NULL,
  publisher             TEXT NOT NULL,
  price_cents           INTEGER NOT NULL DEFAULT -1,
  original_price_cents  INTEGER NOT NULL DEFAULT -1,
  price_checked_at      INTEGER,
  is_historical_low      INTEGER NOT NULL DEFAULT 0,
  review_percent        INTEGER NOT NULL DEFAULT 0,
  review_count          INTEGER NOT NULL DEFAULT 0,
  playtime_forever_min   INTEGER NOT NULL DEFAULT 0,
  playtime_two_weeks_min INTEGER NOT NULL DEFAULT 0,
  first_played_at       INTEGER,
  last_played_at        INTEGER,
  achievements_total    INTEGER NOT NULL DEFAULT 0,
  achievements_unlocked INTEGER NOT NULL DEFAULT 0,
  rare_achievements     INTEGER NOT NULL DEFAULT 0,
  first_played_estimated INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS play_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_id    TEXT NOT NULL,
  app_id      INTEGER NOT NULL,
  play_date   TEXT NOT NULL,
  minutes     INTEGER NOT NULL,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER NOT NULL,
  source      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON play_sessions (play_date);
CREATE INDEX IF NOT EXISTS idx_sessions_app ON play_sessions (app_id);

CREATE TABLE IF NOT EXISTS achievements (
  app_id       INTEGER NOT NULL,
  api_name     TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description  TEXT NOT NULL,
  icon_url     TEXT NOT NULL,
  icon_gray_url TEXT NOT NULL,
  unlocked     INTEGER NOT NULL DEFAULT 0,
  unlocked_at  INTEGER,
  global_percent REAL NOT NULL DEFAULT 0,
  is_rare      INTEGER NOT NULL DEFAULT 0,
  hidden       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (app_id, api_name)
);

CREATE TABLE IF NOT EXISTS wishlist (
  app_id             INTEGER NOT NULL,
  steam_id           TEXT NOT NULL,
  name               TEXT NOT NULL,
  header_image       TEXT NOT NULL,
  added_at           INTEGER NOT NULL,
  priority           INTEGER NOT NULL DEFAULT 1,
  tags               TEXT NOT NULL,
  original_price_cents INTEGER NOT NULL DEFAULT -1,
  final_price_cents  INTEGER NOT NULL DEFAULT -1,
  discount_percent   INTEGER NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'CNY',
  is_historical_low   INTEGER NOT NULL DEFAULT 0,
  historical_low_cents INTEGER NOT NULL DEFAULT -1,
  historical_low_at  INTEGER,
  review_percent     INTEGER NOT NULL DEFAULT 0,
  review_count       INTEGER NOT NULL DEFAULT 0,
  release_date       TEXT NOT NULL,
  notified_at        INTEGER,
  PRIMARY KEY (app_id, steam_id)
);

CREATE TABLE IF NOT EXISTS discounts (
  app_id              INTEGER NOT NULL,
  category            TEXT NOT NULL,
  name                TEXT NOT NULL,
  header_image        TEXT NOT NULL,
  original_price_cents INTEGER NOT NULL DEFAULT -1,
  final_price_cents   INTEGER NOT NULL DEFAULT -1,
  discount_percent    INTEGER NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'CNY',
  is_historical_low    INTEGER NOT NULL DEFAULT 0,
  historical_low_cents INTEGER NOT NULL DEFAULT -1,
  review_percent      INTEGER NOT NULL DEFAULT 0,
  review_count       INTEGER NOT NULL DEFAULT 0,
  tags                TEXT NOT NULL,
  release_date        TEXT NOT NULL,
  store_url           TEXT NOT NULL,
  ends_at             INTEGER,
  fetched_at          INTEGER NOT NULL,
  notified_at         INTEGER,
  PRIMARY KEY (app_id, category)
);

CREATE TABLE IF NOT EXISTS price_history (
  app_id               INTEGER NOT NULL,
  captured_at          INTEGER NOT NULL,
  price_cents          INTEGER NOT NULL DEFAULT -1,
  original_price_cents INTEGER NOT NULL DEFAULT -1,
  discount_percent     INTEGER NOT NULL DEFAULT 0,
  is_historical_low     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (app_id, captured_at)
);

-- 注：这里没有 reports 表。它自建成起从无人写入，v4 迁移已把它 DROP 掉（见 MIGRATIONS[4]）。
CREATE TABLE IF NOT EXISTS snapshots (
  app_id           INTEGER NOT NULL,
  captured_at      INTEGER NOT NULL,
  playtime_minutes INTEGER NOT NULL,
  -- v7（V5/O-1）：这行快照属于哪个账号。与 games.steam_id 同策略：不参与主键（改主键要重建整表），
  -- 空串 = v7 之前写入的历史行。有了它，换账号清理从「整表 DELETE」变成按账号精确删，
  -- 差分基准也只读当前账号的行 —— 旧账号的 playtime 不再可能被当成新账号的差分基准生成幽灵会话。
  steam_id         TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (app_id, captured_at)
);

-- 主进程自己要用的小状态（键值对）。与业务数据分开存，清缓存 / 全量重算时**不**被清掉。
-- 当前用途：记录「稀有成就追猎提醒上次弹出的日期」，实现「每天最多一次」。
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 「我的评分与笔记」：用户自己给游戏打分、写备注。纯本地，不进数据包之外的任何网络。
-- 为什么单独建表而不是塞进 games：这些是**用户产生的**内容，与 Steam 同步下来的数据生命周期不同 ——
-- 出库 / 换账号 / 清缓存重新同步都不应该把它们洗掉（games 行会被 purgeStale 删除）。
CREATE TABLE IF NOT EXISTS game_notes (
  app_id     INTEGER PRIMARY KEY,
  rating     INTEGER NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);

-- 「我的追猎清单」：手动挑几个稀有成就盯着。默认清单是全自动算的（isRare && !unlocked），
-- 这张表记录用户额外手动勾选的那些；主键与 achievements 对齐，避免指向不存在的成就。
CREATE TABLE IF NOT EXISTS hunt_picks (
  app_id    INTEGER NOT NULL,
  api_name  TEXT NOT NULL,
  added_at  INTEGER NOT NULL,
  PRIMARY KEY (app_id, api_name)
);
`

/**
 * 当前 schema 版本。**改 DDL 必须同时 +1 并补一条 MIGRATIONS**，
 * 否则已装机的老库会停在「新代码 + 旧表」，查询直接报 `no such column`。
 *
 * 为什么必须有：`database.ts` 原先只有 `CREATE TABLE IF NOT EXISTS`，
 * 而它对**已存在的表不会加列** —— 升级路径等于不存在。
 */
export const SCHEMA_VERSION = 7

/**
 * 老库升级路径：键 = 要升到的版本号，值 = 该版本的 DDL 语句。
 * `database.ts` 读 `PRAGMA user_version` 后，按序执行 (当前版本, SCHEMA_VERSION] 区间的语句。
 * 只放纯 SQL：整段在一个事务里跑，失败会整体回滚，不会留下半升级的库。
 */
export const MIGRATIONS: Record<number, string> = {
  1: `ALTER TABLE discounts ADD COLUMN notified_at INTEGER;`,
  // CREATE TABLE IF NOT EXISTS 天然幂等：重复执行不会报错（迁移号没写进去时也能自愈）
  2: `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
  /**
   * v3 = 「采样保留策略 + 笔记/追猎表」。
   *
   * 这里**必须有一条语句**（哪怕没有 DDL 变更）：`migrate()` 对缺失的版本号是 `continue`，
   * 留空会让老库永远停在 user_version=2，每次启动都重跑一遍。
   *
   * games.steam_id 用 ADD COLUMN 而不是重建主键：SQLite 改不了主键，
   * 真要 (steam_id, app_id) 联合主键就得「建新表 → 拷数据 → 删旧表 → 改名」，
   * 那会牵动所有查询、数据包与导出。取舍见 docs/ROADMAP-V2.md。
   */
  3: `CREATE TABLE IF NOT EXISTS game_notes (app_id INTEGER PRIMARY KEY, rating INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS hunt_picks (app_id INTEGER NOT NULL, api_name TEXT NOT NULL, added_at INTEGER NOT NULL, PRIMARY KEY (app_id, api_name));
      ALTER TABLE games ADD COLUMN steam_id TEXT NOT NULL DEFAULT '';`,
  /**
   * v4 = 删掉 `reports` 表（BUG-9）。
   *
   * 这张表从建库起就没人写入：`saveReport()` 与 `lastSnapshotTime()` 全仓库零调用，
   * 但 `loadSnapshot` 每次冷启动都要 `SELECT * FROM reports` 并跨 IPC 传一份恒为空的结果。
   * 年度报告是**由会话与成就现算**的（见 `buildWrapped`），留一张永远空的表只会误导后来的人
   * 以为「这里应该有个归档逻辑」。
   *
   * 这里用 DROP 而不是放任不管：空表现在无害，但下一次有人看到它就会去接一段不需要的写入逻辑。
   * 该表从未被写入任何数据，DROP 不损失任何东西。
   */
  4: `DROP TABLE IF EXISTS reports;`,
  /**
   * v5 = `users` 补「Steam 等级 / 徽章」四列（F-6）。
   *
   * 用 ADD COLUMN + 默认值 0：等级是**每次同步覆盖**的派生数据，
   * 老行取不到时读到 0 就等于「没拉到」，界面按未显示处理即可，不需要重建表。
   */
  5: `ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN badge_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN badge_xp INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN player_xp INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN xp_to_next INTEGER NOT NULL DEFAULT 0;`,
  /**
   * v6 = `game_notes` 补「状态 / 标签」（V4 / F-4）。
   *
   * 让笔记从「纯文本 + 评分」升级成结构化：status（想玩 / 在玩 / 弃坑）和 tags。
   * 两个新列都用带默认值的 ADD COLUMN，老行读到空串 / 空数组即「未设置」，界面按未填写处理。
   * `tags` 用 JSON 字符串存（与 games.tags 同约定）。
   */
  6: `ALTER TABLE game_notes ADD COLUMN status TEXT NOT NULL DEFAULT '';
      ALTER TABLE game_notes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';`,
  /**
   * v7 = `snapshots` 补「账号」列（V5 优化 1）。
   *
   * 与 games.steam_id（v3）同款做法：ADD COLUMN + 默认空串，不重建主键。
   * 老行（steam_id=''）是升级前写入的，属于升级前的那个账号 —— 差分基准读取时
   * 用 `steam_id = 当前 OR steam_id = ''` 兼容它们（与 loadSnapshot 读 play_sessions 的口径一致），
   * 新写入的行都带真实 steam_id；而换账号清理会把空串行一并删掉
   * （空串行必然属于「换出去的那个账号」，留着就可能给新账号当差分基准生成幽灵会话）。
   */
  7: `ALTER TABLE snapshots ADD COLUMN steam_id TEXT NOT NULL DEFAULT '';`
}
