import { createWorld, TileFlag } from '../world';

export function createInitialWorld() {
  const WIDTH = 7;
  const HEIGHT = 7;
  const worldSize = { width: WIDTH, height: HEIGHT };
  const world = createWorld(worldSize, 0, TileFlag.Walkable);
  const center = { x: Math.floor(worldSize.width / 2), y: Math.floor(worldSize.height / 2) };
  const bottomY = worldSize.height - 1;
  return { world, worldSize, center, bottomY };
}
