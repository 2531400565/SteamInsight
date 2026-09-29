/** 探针入口：把数据库与清理逻辑打包出来，供 purge-probe.cjs 在 Electron 里验证。 */
export { initDatabase, closeDatabase, all } from '../../electron/main/database'
export { purgeGames, purgeAchievements, purgeWishlist, purgeDiscounts } from '../../electron/main/repository'
