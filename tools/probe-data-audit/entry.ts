/** 探针入口：把 repository 与 database 一起打包出来，供 upsert 空值保护的验证脚本调用。 */
export * as repository from '../../electron/main/repository'
export * as database from '../../electron/main/database'
