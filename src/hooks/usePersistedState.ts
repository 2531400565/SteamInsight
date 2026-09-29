import { useEffect, useState } from 'react'

/**
 * 界面状态持久化（V3 / O-5）。
 *
 * 为什么需要：搜索词、筛选条件、排序方式原本全都只活在 `useState` 里，
 * 关掉再打开就归零。对游戏库这种动辄几十上百款的应用来说，
 * 「每次进来都要重新选一遍类型 / 标签 / 排序」是每天都要付一次的税。
 *
 * 为什么用 localStorage 而不是 settings.json：
 *  - 这是**视觉偏好**，不是配置：它不需要被别的进程读，也不需要跨机器同步；
 *  - 走 settings.json 就要过 IPC + 落盘 + normalizeSettings 白名单，为了一个下拉框不值得；
 *  - 更重要的是它**不该进导出的数据包**，放在 settings 里迟早会被一起带走。
 *
 * 为什么写成单独的 key 而不是「整个页面一个大对象」：
 * 多个筛选条件是**分别**被改的，一个大对象会让每次改动都重写整份 JSON，
 * 且某一个字段格式变了会连累其他字段一起失效。逐键存，坏一个只丢一个。
 */
const NS = 'si-ui'

/** 同页广播：同一 key 的其它实例要跟着刷新（见 usePersistedState 内说明）。 */
const EVT = 'si-persist-changed'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(`${NS}:${key}`)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    // 隐私模式 / 禁用存储 / 旧格式残留：一律退回默认值，不阻塞渲染
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(`${NS}:${key}`, JSON.stringify(value))
  } catch {
    /* 存不下就算了，视觉偏好丢了不影响功能 */
  }
}

/**
 * 像 useState 一样用，但初值来自 localStorage，改动同步写回。
 *
 * 同一 key 被多个组件实例化时（V4 实例：useDensity 同时挂在常驻的 AppLayout 和设置页上），
 * 各实例是独立的 useState —— 设置页写回 localStorage，AppLayout 不会知道，
 * `data-density` 就永远停在旧值（V4 自检抓到的真 bug）。
 * 因此写入后广播 `si-persist-changed`，其它实例收到后重读同一 key：
 * - 自己收到自己的广播时读回的值与 state 相同，React 直接 bail out，不会多渲染；
 * - 跨标签页由原生 storage 事件负责，这里只补「同一页内」的缺口。
 *
 * 注意：只把「体积确定很小、且用户希望下次打开还在」的那几个字段交给它 ——
 * 不要塞搜索结果这类派生数据，那等于把整份列表往 localStorage 里写一遍。
 */
export function usePersistedState<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback))

  useEffect(() => {
    write(key, value)
    try {
      window.dispatchEvent(new CustomEvent(EVT, { detail: { key } }))
    } catch {
      /* 广播失败只影响其它实例的实时性，不影响本实例 */
    }
  }, [key, value])

  useEffect(() => {
    const on = (e: Event): void => {
      if ((e as CustomEvent).detail?.key !== key) return
      setValue(read(key, fallback))
    }
    window.addEventListener(EVT, on)
    return () => window.removeEventListener(EVT, on)
  }, [key, fallback])

  return [value, setValue]
}
