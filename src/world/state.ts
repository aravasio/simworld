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
