import { getKind, getPosition, isTargetable } from '../actors';
import { nextInt, RngSeed } from '../rng';
import type { ActorId } from '../actors';
import type { GameState, Mutation } from './types';

export function maybeQueueMine(
  mutations: Mutation[],
  state: GameState,
  actorId: ActorId,
  nextActorId: number,
  seed: RngSeed
): { nextActorId: number; nextSeed: RngSeed } {
  const pos = getPosition(state.actors, actorId);
  if (!pos) return { nextActorId, nextSeed: seed };
  const target = findAdjacentTargetable(state, pos.x, pos.y);
  if (!target) return { nextActorId, nextSeed: seed };
  const kind = getKind(state.actors, target.id);
  if (kind !== 'rock') return { nextActorId, nextSeed: seed };
  mutations.push({ kind: 'actorRemoved', actorId: target.id });
  const roll = nextInt(seed, 5);
  const count = roll.value + 1;
  let idCounter = nextActorId;
  for (let i = 0; i < count; i++) {
    mutations.push({ kind: 'actorAdded', actorId: idCounter++, x: target.x, y: target.y, glyphId: 4 });
  }
  return { nextActorId: idCounter, nextSeed: roll.nextSeed };
}

export function findAdjacentTargetable(state: GameState, x: number, y: number): { id: ActorId; x: number; y: number } | null {
  for (const actor of state.actors.actors) {
    const pos = getPosition(state.actors, actor.id);
    if (!pos) continue;
    const dx = Math.abs(pos.x - x);
    const dy = Math.abs(pos.y - y);
    if (dx === 0 && dy === 0) continue;
    if (dx <= 1 && dy <= 1 && isTargetable(state.actors, actor.id)) {
      return { id: actor.id, x: pos.x, y: pos.y };
    }
  }
  return null;
}
