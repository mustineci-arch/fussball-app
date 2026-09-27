/** Deterministischer Zufallsgenerator – gleiche Seeds liefern immer dieselben Demo-Daten. */

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface Rng {
  next(): number
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  chance(probability: number): boolean
}

export function createRng(seed: string): Rng {
  let state = hashString(seed)
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      const item = items[Math.floor(next() * items.length)]
      if (item === undefined) throw new Error('pick() auf leerer Liste')
      return item
    },
    chance: (p) => next() < p,
  }
}
