// Deterministic RNG utilities (pure, explicit seed threading).
// Purpose: supply reproducible randomness without globals; thread seed through sim steps.
// Interacts with: sim (derives random choices), any system needing deterministic randomness.

export type RngSeed = number;

export interface RngResult {
  value: number;
  nextSeed: RngSeed;
}

// Mulberry32: small, fast, deterministic
export function nextSeed(seed: RngSeed): RngSeed {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function nextFloat(seed: RngSeed): RngResult {
  const s = nextSeed(seed);
  const value = (s >>> 0) / 0xffffffff;
  return { value, nextSeed: s };
}

export function nextInt(seed: RngSeed, maxExclusive: number): RngResult {
  const { value, nextSeed: s } = nextFloat(seed);
  return { value: Math.floor(value * maxExclusive), nextSeed: s };
}
