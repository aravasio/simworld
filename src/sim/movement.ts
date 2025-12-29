import { getPassability, getPosition } from '../actors';
import { inBounds, isWalkable } from '../world';
import type { ActorId } from '../actors';
import type { RngSeed } from '../rng';
import type { GameState, Mutation } from './types';
import type { PathfindingFn } from '../pathfinding';

const DIRS: Record<'N' | 'S' | 'E' | 'W', { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  W: { dx: -1, dy: 0 },
};

export function maybeQueueMove(mutations: Mutation[], state: GameState, actorId: ActorId, dir: 'N' | 'S' | 'E' | 'W') {
  const pos = getPosition(state.actors, actorId);
  if (!pos) return;
  const { dx, dy } = DIRS[dir];
  const nx = pos.x + dx;
  const ny = pos.y + dy;
  if (!canMoveTo(state, actorId, nx, ny)) return;
  mutations.push({
    kind: 'actorMoved',
    actorId,
    from: { x: pos.x, y: pos.y },
    to: { x: nx, y: ny },
  });
}

export function maybeQueueMoveTo(
  mutations: Mutation[],
  state: GameState,
  actorId: ActorId,
  x: number,
  y: number,
  pathfinder: PathfindingFn,
  nextActorId: number,
  seed: RngSeed
): { nextActorId: number; nextSeed: RngSeed } {
  const pos = getPosition(state.actors, actorId);
  if (!pos) return { nextActorId, nextSeed: seed };
  const path = pathfinder(
    { x: pos.x, y: pos.y },
    { x, y },
    {
      inBounds: (qx, qy) => inBounds(state.world, qx, qy),
      isWalkable: (qx, qy) => isWalkable(state.world, qx, qy),
      isBlocked: (qx, qy) => isBlockedAt(state, actorId, qx, qy),
    }
  );
  if (!path || path.length <= 1) return { nextActorId, nextSeed: seed };
  const steps = path.slice(1);
  mutations.push({ kind: 'pathSet', actorId, path: steps });
  return { nextActorId, nextSeed: seed };
}

export function canMoveTo(state: GameState, actorId: ActorId, x: number, y: number): boolean {
  if (!inBounds(state.world, x, y)) return false;
  if (!isWalkable(state.world, x, y)) return false;
  return !isBlockedAt(state, actorId, x, y);
}

export function isBlockedAt(state: GameState, actorId: ActorId, x: number, y: number): boolean {
  for (const actor of state.actors.actors) {
    if (actor.id === actorId) continue;
    const pos = getPosition(state.actors, actor.id);
    if (!pos || pos.x !== x || pos.y !== y) continue;
    const pass = getPassability(state.actors, actor.id);
    if (!pass || !pass.allowsPassThrough) return true;
  }
  return false;
}
