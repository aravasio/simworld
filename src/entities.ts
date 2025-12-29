// Entity state and helpers (pure, copy-on-write).
// Purpose: hold non-agent entities like rocks and item drops.
// Interacts with: main (spawns/mines), renderer (visuals), sim (future).

export type EntityId = number;
export type EntityKind = 'rock' | 'rock-material';

export interface Entity {
  id: EntityId;
  x: number;
  y: number;
  glyphId: number;
  kind: EntityKind;
  hp?: number;
}

export interface EntitiesState {
  entities: Entity[];
  indexById: Map<EntityId, number>;
}

export function createEntities(): EntitiesState {
  return {
    entities: [],
    indexById: new Map(),
  };
}

export function addEntity(state: EntitiesState, entity: Entity): EntitiesState {
  if (state.indexById.has(entity.id)) return state;
  const nextEntities = state.entities.slice();
  nextEntities.push(entity);
  const nextIndex = new Map(state.indexById);
  nextIndex.set(entity.id, nextEntities.length - 1);
  return { entities: nextEntities, indexById: nextIndex };
}

export function removeEntity(state: EntitiesState, id: EntityId): EntitiesState {
  const idx = state.indexById.get(id);
  if (idx === undefined) return state;
  const nextEntities = state.entities.slice();
  nextEntities.splice(idx, 1);
  const nextIndex = new Map<EntityId, number>();
  nextEntities.forEach((e, i) => nextIndex.set(e.id, i));
  return { entities: nextEntities, indexById: nextIndex };
}

export function updateEntity(state: EntitiesState, id: EntityId, mutate: (entity: Entity) => Entity): EntitiesState {
  const idx = state.indexById.get(id);
  if (idx === undefined) return state;
  const nextEntities = state.entities.slice();
  nextEntities[idx] = mutate(nextEntities[idx]);
  return { entities: nextEntities, indexById: state.indexById };
}
