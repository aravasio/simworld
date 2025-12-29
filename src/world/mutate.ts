import { WorldState, TerrainTypeId, inBounds, indexOf } from './state';

export function withTile(
  state: WorldState,
  x: number,
  y: number,
  patch: { terrainTypeId?: TerrainTypeId; setFlags?: number; clearFlags?: number }
): WorldState {
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
