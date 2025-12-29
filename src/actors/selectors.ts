import type { Actor, ActorId, ActorsState } from './state';
import type { ContentsEntry, HitPoints, LockState, Position, Renderable, Stackable, Vitals } from './components';

export function findActorAt(state: ActorsState, x: number, y: number): Actor | undefined {
  for (const actor of state.actors) {
    const pos = state.positions.get(actor.id);
    if (pos && pos.x === x && pos.y === y) return actor;
  }
  return undefined;
}

export function getPosition(state: ActorsState, id: ActorId): Position | undefined {
  return state.positions.get(id);
}

export function getRenderable(state: ActorsState, id: ActorId): Renderable | undefined {
  return state.renderables.get(id);
}

export function getVitals(state: ActorsState, id: ActorId): Vitals | undefined {
  return state.vitals.get(id);
}

export function getHitPoints(state: ActorsState, id: ActorId): HitPoints | undefined {
  return state.hitPoints.get(id);
}

export function getLockState(state: ActorsState, id: ActorId): LockState | undefined {
  return state.locks.get(id);
}

export function getContents(state: ActorsState, id: ActorId): ContentsEntry[] | undefined {
  return state.contents.get(id);
}

export function getStackable(state: ActorsState, id: ActorId): Stackable | undefined {
  return state.stackables.get(id);
}

export function getTags(state: ActorsState, id: ActorId): Set<string> | undefined {
  return state.tags.get(id);
}

export function getKind(state: ActorsState, id: ActorId): string | undefined {
  return state.kinds.get(id);
}

export function isSelectable(state: ActorsState, id: ActorId): boolean {
  return state.selectables.get(id) === true;
}

export function isTargetable(state: ActorsState, id: ActorId): boolean {
  return state.targetables.get(id) === true;
}

export function getPassability(state: ActorsState, id: ActorId): { allowsPassThrough: boolean } | undefined {
  return state.passability.get(id);
}

export function getPath(state: ActorsState, id: ActorId): { x: number; y: number }[] | undefined {
  return state.paths.get(id);
}
