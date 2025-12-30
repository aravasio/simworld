import { createInitialWorld } from './world';
import { createInitialActors } from './actors';

export function createInitialState() {
  const { world, worldSize, center, bottomY } = createInitialWorld();
  const { actors, nextActorId } = createInitialActors(worldSize, center, bottomY);
  const cursorStart = { x: center.x - 1, y: bottomY };
  return { world, actors, nextActorId, worldSize, cursorStart, center, bottomY };
}
