/**
 * 演示数据集的共享底座：固定种子、时间基准与确定性随机源。
 *
 * 单独成文件是为了让 dataset.ts 与 pricing.ts 消费**同一条**随机序列。
 * 注意：拆模块时随机数的消费顺序不能变——`buildDemoXxx()` 的调用顺序决定了
 * 谁先取随机数，顺序一乱整个演示数据集（连同所有图表数值）都会整体变样。
 */

export const SEED = 20240926
export const DEMO_STEAM_ID: string = '76561198341973281'
export const MS_DAY = 86400000
export const START_UTC = Date.UTC(2024, 0, 1)
export const TODAY_UTC = Date.UTC(2026, 8, 26)
export const TODAY_SEC = TODAY_UTC / 1000
export const HOLIDAYS = new Set<string>(['2024-01-01', '2024-02-10', '2024-05-01', '2024-10-01', '2024-12-25', '2025-01-01', '2025-01-29', '2025-05-01', '2025-10-01', '2025-12-25', '2026-01-01', '2026-02-17', '2026-05-01', '2026-10-01', '2026-12-25'])

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const rng = mulberry32(SEED)
export const rnd = (): number => rng()
export const rint = (min: number, max: number): number => Math.floor(rnd() * (max - min + 1)) + min
export const rfloat = (min: number, max: number): number => min + rnd() * (max - min)
export const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
