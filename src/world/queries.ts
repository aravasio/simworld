import { WorldState, TerrainTypeId, TileFlag, inBounds, indexOf } from './state';

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
