/**
 * 追猎清单的键。
 *
 * 单独成一个模块（而不是放在 store 里）的理由：`electron/main` 与渲染层都要用它 ——
 * 主键就是 `(app_id, api_name)`，两边必须用同一个拼法，否则「星标存进去了但读不出来」。
 * 放在 store 里会让主进程的探针 bundle 连带把 zustand / bridge 一起打进去。
 */
export const pickKey = (appId: number, apiName: string): string => `${appId}:${apiName}`
