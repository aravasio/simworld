import type { ActorsState, ActorId } from './state';
import type { ContentsEntry, HitPoints, Position, Renderable } from './components';

export function updatePosition(state: ActorsState, id: ActorId, position: Position): ActorsState {
  if (!state.positions.has(id)) return state;
  const nextPositions = new Map(state.positions);
  nextPositions.set(id, position);
  return { ...state, positions: nextPositions };
}

export function setPosition(state: ActorsState, id: ActorId, position: Position): ActorsState {
  const nextPositions = new Map(state.positions);
  nextPositions.set(id, position);
  return { ...state, positions: nextPositions };
}

export function updateRenderable(state: ActorsState, id: ActorId, renderable: Renderable): ActorsState {
  if (!state.renderables.has(id)) return state;
  const nextRenderables = new Map(state.renderables);
  nextRenderables.set(id, renderable);
  return { ...state, renderables: nextRenderables };
}

export function setContents(state: ActorsState, id: ActorId, contents: ContentsEntry[]): ActorsState {
  const nextContents = new Map(state.contents);
  nextContents.set(id, contents);
  return { ...state, contents: nextContents };
}

export function setHitPoints(state: ActorsState, id: ActorId, hitPoints: HitPoints): ActorsState {
  if (!state.hitPoints.has(id)) return state;
  const nextHitPoints = new Map(state.hitPoints);
  nextHitPoints.set(id, hitPoints);
  return { ...state, hitPoints: nextHitPoints };
}

export function setPath(state: ActorsState, id: ActorId, path: { x: number; y: number }[]): ActorsState {
  const nextPaths = new Map(state.paths);
  nextPaths.set(id, path);
  return { ...state, paths: nextPaths };
}
