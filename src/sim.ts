// Core deterministic simulation step: commands + state + rngSeed -> nextState + nextSeed + diff.
// Purpose: define sim data (GameState, commands, mutations, diff) and the pure step function.
// Interacts with: world/agents (reads and mutates via helpers), rng (advances seed), renderer (consumes diff).

import { ActorComponents, ActorsState, ActorId, createActor, getKind, getPassability, getPath, getPosition, isTargetable, removeActor, setPath, updatePosition } from './actors';
import { WorldState, inBounds, isWalkable } from './world';
import { RngSeed, nextInt } from './rng';
import { Pathfinding, PathfindingFn } from './pathfinding';

export interface GameState {
  world: WorldState;
  actors: ActorsState;
  tick: number;
  nextActorId: number;
}

export type Command =
  | { kind: 'move'; actorId: ActorId; dir: 'N' | 'S' | 'E' | 'W' }
  | { kind: 'moveTo'; actorId: ActorId; x: number; y: number }
  | { kind: 'mine'; actorId: ActorId }
  | { kind: 'wait'; actorId: ActorId };

export type Mutation =
  | { kind: 'actorMoved'; actorId: ActorId; from: { x: number; y: number }; to: { x: number; y: number } }
  | { kind: 'actorRemoved'; actorId: ActorId }
  | { kind: 'actorAdded'; actorId: ActorId; x: number; y: number; glyphId: number }
  | { kind: 'pathSet'; actorId: ActorId; path: { x: number; y: number }[] };

export interface SimDiff {
  tick: number;
  actorMoves: Array<{ actorId: ActorId; from: { x: number; y: number }; to: { x: number; y: number } }>;
  actorsAdded: Array<{ actorId: ActorId; x: number; y: number; glyphId: number }>;
  actorsRemoved: ActorId[];
  tileChanges: Array<{ x: number; y: number; terrainTypeId?: number; flagsMask?: number; flagsOp?: 'set' | 'clear' }>;
}

export interface StepResult {
  nextState: GameState;
  nextSeed: RngSeed;
  diff: SimDiff;
}

export interface SimConfig {
  randomWalkOnIdle?: boolean;
  pathfinder?: PathfindingFn;
}

const DIRS: Record<'N' | 'S' | 'E' | 'W', { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  W: { dx: -1, dy: 0 },
};

export function step(state: GameState, commands: Command[], rngSeed: RngSeed, config: SimConfig = {}): StepResult {
  const mutations: Mutation[] = [];
  let seed = rngSeed;
  let nextActorId = state.nextActorId;
  const pathfinder = config.pathfinder ?? Pathfinding.bfs;

  // Handle explicit commands first
  for (const cmd of commands) {
    if (cmd.kind === 'move') {
      maybeQueueMove(mutations, state, cmd.actorId, cmd.dir);
    } else if (cmd.kind === 'moveTo') {
      const result = maybeQueueMoveTo(mutations, state, cmd.actorId, cmd.x, cmd.y, pathfinder, nextActorId, seed);
      nextActorId = result.nextActorId;
      seed = result.nextSeed;
    } else if (cmd.kind === 'mine') {
      const result = maybeQueueMine(mutations, state, cmd.actorId, nextActorId, seed);
      nextActorId = result.nextActorId;
      seed = result.nextSeed;
    }
    // wait has no effect now
  }

  // Optional random movement for idle agents
  if (config.randomWalkOnIdle) {
    const idleActors = state.actors.actors.filter((a) => !commands.some((c) => c.kind !== 'wait' && c.actorId === a.id));
    for (const actor of idleActors) {
      const dirIndex = nextInt(seed, 4);
      seed = dirIndex.nextSeed;
      const dir = (['N', 'S', 'E', 'W'] as const)[dirIndex.value];
      maybeQueueMove(mutations, state, actor.id, dir);
    }
  }

  // Consume one step of any stored path per tick.
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

  // Apply mutations
  let nextActors = state.actors;
  const actorMoves: SimDiff['actorMoves'] = [];
  const actorsAdded: SimDiff['actorsAdded'] = [];
  const actorsRemoved: SimDiff['actorsRemoved'] = [];
  for (const m of mutations) {
    if (m.kind === 'actorMoved') {
      nextActors = updatePosition(nextActors, m.actorId, { x: m.to.x, y: m.to.y });
      actorMoves.push({ actorId: m.actorId, from: m.from, to: m.to });
    } else if (m.kind === 'actorRemoved') {
      nextActors = removeActor(nextActors, m.actorId);
      actorsRemoved.push(m.actorId);
    } else if (m.kind === 'actorAdded') {
      nextActors = createActor(nextActors, { id: m.actorId }, [
        ActorComponents.kind('rock-material'),
        ActorComponents.position({ x: m.x, y: m.y }),
        ActorComponents.renderable({ glyphId: m.glyphId }),
        ActorComponents.tags(['item']),
        ActorComponents.passability({ allowsPassThrough: true }),
      ]);
      actorsAdded.push({ actorId: m.actorId, x: m.x, y: m.y, glyphId: m.glyphId });
    } else if (m.kind === 'pathSet') {
      nextActors = setPath(nextActors, m.actorId, m.path);
    }
  }

  const nextState: GameState = {
    world: state.world,
    actors: nextActors,
    tick: state.tick + 1,
    nextActorId,
  };

  const diff: SimDiff = {
    tick: nextState.tick,
    actorMoves,
    actorsAdded,
    actorsRemoved,
    tileChanges: [],
  };

  return { nextState, nextSeed: seed, diff };
}

function maybeQueueMove(mutations: Mutation[], state: GameState, actorId: ActorId, dir: 'N' | 'S' | 'E' | 'W') {
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

function maybeQueueMoveTo(
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

function maybeQueueMine(
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

function canMoveTo(state: GameState, actorId: ActorId, x: number, y: number): boolean {
  if (!inBounds(state.world, x, y)) return false;
  if (!isWalkable(state.world, x, y)) return false;
  return !isBlockedAt(state, actorId, x, y);
}

function findAdjacentTargetable(state: GameState, x: number, y: number): { id: ActorId; x: number; y: number } | null {
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

function isBlockedAt(state: GameState, actorId: ActorId, x: number, y: number): boolean {
  for (const actor of state.actors.actors) {
    if (actor.id === actorId) continue;
    const pos = getPosition(state.actors, actor.id);
    if (!pos || pos.x !== x || pos.y !== y) continue;
    const pass = getPassability(state.actors, actor.id);
    if (!pass || !pass.allowsPassThrough) return true;
  }
  return false;
}
