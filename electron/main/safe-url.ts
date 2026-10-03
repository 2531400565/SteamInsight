/**
 * 外部链接放行规则（唯一真相源）。
 *
 * 为什么需要它：`shell.openExternal` 会把地址交给**系统 shell** 处理，它不知道什么叫「安全」。
 * 放行 `file://` 等价于允许「打开任意本地文件/程序」；放行 `ms-msdt:`、`search-ms:` 这类
 * 协议在部分 Windows 环境下可以直接触发系统组件执行。Electron 官方也明确建议
 * 对所有外部跳转做协议白名单。
 *
 * 渲染层有三处会跳转外部：窗口的 window.open/target=_blank、命令面板里的外链、卡片上的商店链接。
 * 三条路径必须同一把尺子 —— 早前只有 IPC 那条有校验，window.open 这条没有，就是典型的「防护做了一半」。
 */
export const SAFE_EXTERNAL_PROTOCOLS = ['http:', 'https:', 'mailto:'] as const

/** 判断一个 URL 是否可以交给系统 shell 打开。 */
export function isSafeExternalUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return false
  try {
    const parsed = new URL(url)
    return (SAFE_EXTERNAL_PROTOCOLS as readonly string[]).includes(parsed.protocol)
  } catch {
    return false
  }
}
