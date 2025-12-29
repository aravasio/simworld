import { getPath, getPosition } from '../actors';
import type { GameState, Mutation } from './types';
import type { ActorId } from '../actors';
import { canMoveTo } from './movement';

export function queuePathSteps(mutations: Mutation[], state: GameState) {
  for (const actor of state.actors.actors) {
    const path = getPath(state.actors, actor.id);
    if (!path || !path.length) continue;
    const next = path[0];
    if (!canMoveTo(state, actor.id, next.x, next.y)) continue;
    const pos = getPosition(state.actors, actor.id);
    if (!pos) continue;
    mutations.push({
      kind: 'actorMoved',
      actorId: actor.id,
      from: { x: pos.x, y: pos.y },
      to: { x: next.x, y: next.y },
    });
    mutations.push({ kind: 'pathSet', actorId: actor.id, path: path.slice(1) });
  }
}
