// Core deterministic simulation step: commands + state + rngSeed -> nextState + nextSeed + diff.
// Purpose: define sim data (GameState, commands, mutations, diff) and the pure step function.
// Interacts with: world/agents (reads and mutates via helpers), rng (advances seed), renderer (consumes diff).

import { ActorsState, ActorId, getPosition, updatePosition } from './actors';
import { WorldState, inBounds, isWalkable } from './world';
import { RngSeed, nextInt } from './rng';

export interface GameState {
  world: WorldState;
  actors: ActorsState;
  tick: number;
}

export type Command =
  | { kind: 'move'; actorId: ActorId; dir: 'N' | 'S' | 'E' | 'W' }
  | { kind: 'wait'; actorId: ActorId };

export type Mutation =
  | { kind: 'actorMoved'; actorId: ActorId; from: { x: number; y: number }; to: { x: number; y: number } };

export interface SimDiff {
  tick: number;
  actorMoves: Array<{ actorId: ActorId; from: { x: number; y: number }; to: { x: number; y: number } }>;
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

  // Handle explicit commands first
  for (const cmd of commands) {
    if (cmd.kind === 'move') {
      maybeQueueMove(mutations, state, cmd.agentId, cmd.dir);
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
  for (const m of mutations) {
    if (m.kind === 'actorMoved') {
      nextActors = updatePosition(nextActors, m.actorId, { x: m.to.x, y: m.to.y });
      actorMoves.push({ actorId: m.actorId, from: m.from, to: m.to });
    }
  }

  const nextState: GameState = {
    world: state.world,
    actors: nextActors,
    tick: state.tick + 1,
  };

  const diff: SimDiff = {
    tick: nextState.tick,
    actorMoves,
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
  if (!inBounds(state.world, nx, ny)) return;
  if (!isWalkable(state.world, nx, ny)) return;
  mutations.push({
    kind: 'actorMoved',
    actorId,
    from: { x: pos.x, y: pos.y },
    to: { x: nx, y: ny },
  });
}
