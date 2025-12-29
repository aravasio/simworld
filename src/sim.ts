// Core deterministic simulation step: commands + state + rngSeed -> nextState + nextSeed + diff.
// Purpose: define sim data (GameState, commands, mutations, diff) and the pure step function.
// Interacts with: world/agents (reads and mutates via helpers), rng (advances seed), renderer (consumes diff).

import { ActorComponents, ActorsState, ActorId, createActor, getKind, getPassability, getPosition, isTargetable, removeActor, updatePosition } from './actors';
import { WorldState, inBounds, isWalkable } from './world';
import { RngSeed, nextInt } from './rng';

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
  | { kind: 'actorAdded'; actorId: ActorId; x: number; y: number; glyphId: number };

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

  // Handle explicit commands first
  for (const cmd of commands) {
    if (cmd.kind === 'move') {
      maybeQueueMove(mutations, state, cmd.actorId, cmd.dir);
    } else if (cmd.kind === 'moveTo') {
      maybeQueueMoveTo(mutations, state, cmd.actorId, cmd.x, cmd.y);
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

function maybeQueueMoveTo(mutations: Mutation[], state: GameState, actorId: ActorId, x: number, y: number) {
  const pos = getPosition(state.actors, actorId);
  if (!pos) return;
  if (!canMoveTo(state, actorId, x, y)) return;
  mutations.push({
    kind: 'actorMoved',
    actorId,
    from: { x: pos.x, y: pos.y },
    to: { x, y },
  });
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
  for (const actor of state.actors.actors) {
    if (actor.id === actorId) continue;
    const pos = getPosition(state.actors, actor.id);
    if (!pos || pos.x !== x || pos.y !== y) continue;
    const pass = getPassability(state.actors, actor.id);
    if (!pass || !pass.allowsPassThrough) return false;
  }
  return true;
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
