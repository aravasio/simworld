// Core deterministic simulation step: commands + state + rngSeed -> nextState + nextSeed + diff.
// Purpose: define sim data (GameState, commands, mutations, diff) and the pure step function.
// Interacts with: world/agents (reads and mutates via helpers), rng (advances seed), renderer (consumes diff).

import { AgentsState, AgentId, moveAgent } from './agents';
import { WorldState, inBounds, isWalkable } from './world';
import { RngSeed, nextInt } from './rng';

export interface GameState {
  world: WorldState;
  agents: AgentsState;
  tick: number;
}

export type Command =
  | { kind: 'move'; agentId: AgentId; dir: 'N' | 'S' | 'E' | 'W' }
  | { kind: 'wait'; agentId: AgentId };

export type Mutation =
  | { kind: 'agentMoved'; agentId: AgentId; from: { x: number; y: number }; to: { x: number; y: number } };

export interface SimDiff {
  tick: number;
  agentMoves: Array<{ agentId: AgentId; from: { x: number; y: number }; to: { x: number; y: number } }>;
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
    const idleAgents = state.agents.agents.filter((a) => !commands.some((c) => c.kind !== 'wait' && c.agentId === a.id));
    for (const agent of idleAgents) {
      const dirIndex = nextInt(seed, 4);
      seed = dirIndex.nextSeed;
      const dir = (['N', 'S', 'E', 'W'] as const)[dirIndex.value];
      maybeQueueMove(mutations, state, agent.id, dir);
    }
  }

  // Apply mutations
  let nextAgents = state.agents;
  const agentMoves: SimDiff['agentMoves'] = [];
  for (const m of mutations) {
    if (m.kind === 'agentMoved') {
      nextAgents = moveAgent(nextAgents, m.agentId, m.to.x - m.from.x, m.to.y - m.from.y);
      agentMoves.push({ agentId: m.agentId, from: m.from, to: m.to });
    }
  }

  const nextState: GameState = {
    world: state.world,
    agents: nextAgents,
    tick: state.tick + 1,
  };

  const diff: SimDiff = {
    tick: nextState.tick,
    agentMoves,
    tileChanges: [],
  };

  return { nextState, nextSeed: seed, diff };
}

function maybeQueueMove(mutations: Mutation[], state: GameState, agentId: AgentId, dir: 'N' | 'S' | 'E' | 'W') {
  const agent = state.agents.agents.find((a) => a.id === agentId);
  if (!agent) return;
  const { dx, dy } = DIRS[dir];
  const nx = agent.x + dx;
  const ny = agent.y + dy;
  if (!inBounds(state.world, nx, ny)) return;
  if (!isWalkable(state.world, nx, ny)) return;
  mutations.push({
    kind: 'agentMoved',
    agentId,
    from: { x: agent.x, y: agent.y },
    to: { x: nx, y: ny },
  });
}
