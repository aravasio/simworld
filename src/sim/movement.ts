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

export type MoveFailureReason = 'out_of_bounds' | 'not_walkable' | 'blocked' | 'no_path' | 'missing_position';

export function getDirOffset(dir: 'N' | 'S' | 'E' | 'W') {
  return DIRS[dir];
}

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

export function planMoveTo(
  state: GameState,
  actorId: ActorId,
  x: number,
  y: number,
  pathfinder: PathfindingFn
): { status: 'ok'; path: { x: number; y: number }[] } | { status: 'error'; reason: MoveFailureReason } {
  const pos = getPosition(state.actors, actorId);
  if (!pos) return { status: 'error', reason: 'missing_position' };
  const failure = getMoveFailureReason(state, actorId, x, y);
  if (failure) return { status: 'error', reason: failure };
  const path = pathfinder(
    { x: pos.x, y: pos.y },
    { x, y },
    {
      inBounds: (qx, qy) => inBounds(state.world, qx, qy),
      isWalkable: (qx, qy) => isWalkable(state.world, qx, qy),
      isBlocked: (qx, qy) => isBlockedAt(state, actorId, qx, qy),
    }
  );
  if (!path || path.length <= 1) return { status: 'error', reason: 'no_path' };
  return { status: 'ok', path };
}

export function canMoveTo(state: GameState, actorId: ActorId, x: number, y: number): boolean {
  if (!inBounds(state.world, x, y)) return false;
  if (!isWalkable(state.world, x, y)) return false;
  return !isBlockedAt(state, actorId, x, y);
}

export function getMoveFailureReason(state: GameState, actorId: ActorId, x: number, y: number): MoveFailureReason | undefined {
  if (!inBounds(state.world, x, y)) return 'out_of_bounds';
  if (!isWalkable(state.world, x, y)) return 'not_walkable';
  if (isBlockedAt(state, actorId, x, y)) return 'blocked';
  return undefined;
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
