import { useEffect, useState } from 'react'

/**
 * 一个会自己走动的「当前时间戳（毫秒）」。
 * 折扣倒计时、相对时间文案需要它定期重渲染；默认 30 秒一跳，避免无谓渲染。
 * 组件卸载时清除定时器，不会泄漏。
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
