// World state definitions and helpers (pure, narrow access).
// Purpose: hold terrain data in dense arrays with minimal, deterministic accessors;
// provides copy-on-write updates so sim can mutate logically while staying functional.
// Interacts with: sim (reads walkability, tiles), renderer (builds tile visuals).

export type TerrainTypeId = number;

export interface WorldSize {
  width: number;
  height: number;
}

export interface WorldState {
  size: WorldSize;
  terrainTypeId: Uint16Array; // index per tile
  flags: Uint16Array; // bitmask per tile
}

export enum TileFlag {
  Walkable = 1 << 0,
  Opaque = 1 << 1,
  // Extend with more as needed (e.g., Burning = 1 << 2)
}

export function createWorld(size: WorldSize, initialTerrain: TerrainTypeId = 0, initialFlags: number = 0): WorldState {
  const count = size.width * size.height;
  return {
    size,
    terrainTypeId: new Uint16Array(count).fill(initialTerrain),
    flags: new Uint16Array(count).fill(initialFlags),
  };
}

export function indexOf(state: WorldState, x: number, y: number): number {
  return y * state.size.width + x;
}

export function inBounds(state: WorldState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < state.size.width && y < state.size.height;
}

export function getTile(state: WorldState, x: number, y: number): { terrainTypeId: TerrainTypeId; flags: number } | null {
  if (!inBounds(state, x, y)) return null;
  const idx = indexOf(state, x, y);
  return {
    terrainTypeId: state.terrainTypeId[idx],
    flags: state.flags[idx],
  };
}

export function hasFlag(state: WorldState, x: number, y: number, flag: TileFlag): boolean {
  const tile = getTile(state, x, y);
  return tile ? (tile.flags & flag) !== 0 : false;
}

export function isWalkable(state: WorldState, x: number, y: number): boolean {
  return hasFlag(state, x, y, TileFlag.Walkable);
}

export function withTile(state: WorldState, x: number, y: number, patch: { terrainTypeId?: TerrainTypeId; setFlags?: number; clearFlags?: number }): WorldState {
  if (!inBounds(state, x, y)) return state;
  const idx = indexOf(state, x, y);

  const nextTerrain = state.terrainTypeId;
  const nextFlags = state.flags;

  // Copy-on-write only the arrays we mutate.
  let terrainArray = nextTerrain;
  let flagsArray = nextFlags;

  if (patch.terrainTypeId !== undefined) {
    terrainArray = new Uint16Array(nextTerrain);
    terrainArray[idx] = patch.terrainTypeId;
  }

  if (patch.setFlags !== undefined || patch.clearFlags !== undefined) {
    flagsArray = terrainArray === nextTerrain ? new Uint16Array(nextFlags) : new Uint16Array(flagsArray);
    const current = flagsArray[idx];
    const withSet = patch.setFlags !== undefined ? current | patch.setFlags : current;
    const withClear = patch.clearFlags !== undefined ? withSet & ~patch.clearFlags : withSet;
    flagsArray[idx] = withClear;
  }

  return terrainArray === nextTerrain && flagsArray === nextFlags
    ? state
    : {
        size: state.size,
        terrainTypeId: terrainArray,
        flags: flagsArray,
      };
}
