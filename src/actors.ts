// Actor model and component maps (pure, copy-on-write).
// Purpose: unify all in-world entities under a single actor id with composable components.
// Interacts with: main (spawns), sim (movement), renderer (visuals), inspector (lookup).

export type ActorId = number;

export interface Actor {
  id: ActorId;
}

export interface Position {
  x: number;
  y: number;
}

export interface Renderable {
  glyphId: number;
}

export interface Vitals {
  maxHp: number;
  maxMp: number;
  maxStamina: number;
  hp: number;
  mp: number;
  stamina: number;
}

export type ActorComponent =
  | { kind: 'position'; value: Position }
  | { kind: 'renderable'; value: Renderable }
  | { kind: 'vitals'; value: Vitals }
  | { kind: 'tags'; value: Iterable<string> }
  | { kind: 'kind'; value: string };

export interface ActorsState {
  actors: Actor[];
  indexById: Map<ActorId, number>;
  positions: Map<ActorId, Position>;
  renderables: Map<ActorId, Renderable>;
  tags: Map<ActorId, Set<string>>;
  vitals: Map<ActorId, Vitals>;
  kinds: Map<ActorId, string>;
}

export function createActors(): ActorsState {
  return {
    actors: [],
    indexById: new Map(),
    positions: new Map(),
    renderables: new Map(),
    tags: new Map(),
    vitals: new Map(),
    kinds: new Map(),
  };
}

export const ActorComponents = {
  kind: (value: string): ActorComponent => ({ kind: 'kind', value }),
  position: (value: Position): ActorComponent => ({ kind: 'position', value }),
  renderable: (value: Renderable): ActorComponent => ({ kind: 'renderable', value }),
  vitals: (value: Vitals): ActorComponent => ({ kind: 'vitals', value }),
  tags: (value: Iterable<string>): ActorComponent => ({ kind: 'tags', value }),
} as const;

function addActorInternal(state: ActorsState, actor: Actor): ActorsState {
  if (state.indexById.has(actor.id)) return state;
  const nextActors = state.actors.slice();
  nextActors.push(actor);
  const nextIndex = new Map(state.indexById);
  nextIndex.set(actor.id, nextActors.length - 1);
  return {
    actors: nextActors,
    indexById: nextIndex,
    positions: state.positions,
    renderables: state.renderables,
    tags: state.tags,
    vitals: state.vitals,
    kinds: state.kinds,
  };
}

export function createActor(state: ActorsState, actor: Actor, components: ActorComponent[]): ActorsState {
  const withActor = addActorInternal(state, actor);
  let nextPositions = withActor.positions;
  let nextRenderables = withActor.renderables;
  let nextTags = withActor.tags;
  let nextVitals = withActor.vitals;
  let nextKinds = withActor.kinds;
  let kindValue: string | undefined;
  let hasVitals = false;

  for (const component of components) {
    switch (component.kind) {
      case 'position':
        nextPositions = nextPositions === withActor.positions ? new Map(nextPositions) : nextPositions;
        nextPositions.set(actor.id, component.value);
        break;
      case 'renderable':
        nextRenderables = nextRenderables === withActor.renderables ? new Map(nextRenderables) : nextRenderables;
        nextRenderables.set(actor.id, component.value);
        break;
      case 'tags':
        nextTags = nextTags === withActor.tags ? new Map(nextTags) : nextTags;
        nextTags.set(actor.id, new Set(component.value));
        break;
      case 'vitals':
        nextVitals = nextVitals === withActor.vitals ? new Map(nextVitals) : nextVitals;
        nextVitals.set(actor.id, component.value);
        hasVitals = true;
        break;
      case 'kind':
        nextKinds = nextKinds === withActor.kinds ? new Map(nextKinds) : nextKinds;
        nextKinds.set(actor.id, component.value);
        kindValue = component.value;
        break;
    }
  }

  if (kindValue === 'creature' && !hasVitals) {
    throw new Error('Creature actors must include Vitals component.');
  }

  return {
    actors: withActor.actors,
    indexById: withActor.indexById,
    positions: nextPositions,
    renderables: nextRenderables,
    tags: nextTags,
    vitals: nextVitals,
    kinds: nextKinds,
  };
}

export function removeActor(state: ActorsState, id: ActorId): ActorsState {
  const idx = state.indexById.get(id);
  if (idx === undefined) return state;
  const nextActors = state.actors.slice();
  nextActors.splice(idx, 1);
  const nextIndex = new Map<ActorId, number>();
  nextActors.forEach((a, i) => nextIndex.set(a.id, i));
  const nextPositions = new Map(state.positions);
  nextPositions.delete(id);
  const nextRenderables = new Map(state.renderables);
  nextRenderables.delete(id);
  const nextTags = new Map(state.tags);
  nextTags.delete(id);
  const nextVitals = new Map(state.vitals);
  nextVitals.delete(id);
  const nextKinds = new Map(state.kinds);
  nextKinds.delete(id);
  return {
    actors: nextActors,
    indexById: nextIndex,
    positions: nextPositions,
    renderables: nextRenderables,
    tags: nextTags,
    vitals: nextVitals,
    kinds: nextKinds,
  };
}

export function updatePosition(state: ActorsState, id: ActorId, position: Position): ActorsState {
  if (!state.positions.has(id)) return state;
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

export function getTags(state: ActorsState, id: ActorId): Set<string> | undefined {
  return state.tags.get(id);
}

export function getKind(state: ActorsState, id: ActorId): string | undefined {
  return state.kinds.get(id);
}
