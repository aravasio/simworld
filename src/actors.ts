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
  | { kind: 'kind'; value: string }
  | { kind: 'selectable'; value: boolean }
  | { kind: 'targetable'; value: boolean }
  | { kind: 'passability'; value: { allowsPassThrough: boolean } }
  | { kind: 'path'; value: { x: number; y: number }[] };

export interface ActorsState {
  actors: Actor[];
  indexById: Map<ActorId, number>;
  positions: Map<ActorId, Position>;
  renderables: Map<ActorId, Renderable>;
  tags: Map<ActorId, Set<string>>;
  vitals: Map<ActorId, Vitals>;
  kinds: Map<ActorId, string>;
  selectables: Map<ActorId, boolean>;
  targetables: Map<ActorId, boolean>;
  passability: Map<ActorId, { allowsPassThrough: boolean }>;
  paths: Map<ActorId, { x: number; y: number }[]>;
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
    selectables: new Map(),
    targetables: new Map(),
    passability: new Map(),
    paths: new Map(),
  };
}

export const ActorComponents = {
  kind: (value: string): ActorComponent => ({ kind: 'kind', value }),
  position: (value: Position): ActorComponent => ({ kind: 'position', value }),
  renderable: (value: Renderable): ActorComponent => ({ kind: 'renderable', value }),
  vitals: (value: Vitals): ActorComponent => ({ kind: 'vitals', value }),
  tags: (value: Iterable<string>): ActorComponent => ({ kind: 'tags', value }),
  selectable: (value: boolean = true): ActorComponent => ({ kind: 'selectable', value }),
  targetable: (value: boolean = true): ActorComponent => ({ kind: 'targetable', value }),
  passability: (value: { allowsPassThrough: boolean }): ActorComponent => ({ kind: 'passability', value }),
  path: (value: { x: number; y: number }[]): ActorComponent => ({ kind: 'path', value }),
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
    selectables: state.selectables,
    targetables: state.targetables,
    passability: state.passability,
    paths: state.paths,
  };
}

export function createActor(state: ActorsState, actor: Actor, components: ActorComponent[]): ActorsState {
  const withActor = addActorInternal(state, actor);
  let nextPositions = withActor.positions;
  let nextRenderables = withActor.renderables;
  let nextTags = withActor.tags;
  let nextVitals = withActor.vitals;
  let nextKinds = withActor.kinds;
  let nextSelectables = withActor.selectables;
  let nextTargetables = withActor.targetables;
  let nextPassability = withActor.passability;
  let nextPaths = withActor.paths;
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
      case 'selectable':
        nextSelectables = nextSelectables === withActor.selectables ? new Map(nextSelectables) : nextSelectables;
        nextSelectables.set(actor.id, component.value);
        break;
      case 'targetable':
        nextTargetables = nextTargetables === withActor.targetables ? new Map(nextTargetables) : nextTargetables;
        nextTargetables.set(actor.id, component.value);
        break;
      case 'passability':
        nextPassability = nextPassability === withActor.passability ? new Map(nextPassability) : nextPassability;
        nextPassability.set(actor.id, component.value);
        break;
      case 'path':
        nextPaths = nextPaths === withActor.paths ? new Map(nextPaths) : nextPaths;
        nextPaths.set(actor.id, component.value);
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
    selectables: nextSelectables,
    targetables: nextTargetables,
    passability: nextPassability,
    paths: nextPaths,
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
  const nextSelectables = new Map(state.selectables);
  nextSelectables.delete(id);
  const nextTargetables = new Map(state.targetables);
  nextTargetables.delete(id);
  const nextPassability = new Map(state.passability);
  nextPassability.delete(id);
  const nextPaths = new Map(state.paths);
  nextPaths.delete(id);
  return {
    actors: nextActors,
    indexById: nextIndex,
    positions: nextPositions,
    renderables: nextRenderables,
    tags: nextTags,
    vitals: nextVitals,
    kinds: nextKinds,
    selectables: nextSelectables,
    targetables: nextTargetables,
    passability: nextPassability,
    paths: nextPaths,
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

export function setPath(state: ActorsState, id: ActorId, path: { x: number; y: number }[]): ActorsState {
  const nextPaths = new Map(state.paths);
  nextPaths.set(id, path);
  return { ...state, paths: nextPaths };
}
