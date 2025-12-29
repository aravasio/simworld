// Agents state and helpers (pure, copy-on-write).
// Purpose: keep all movers in one collection with deterministic updates.
// Interacts with: sim (moves/updates agents), renderer (reads positions/glyphs).

export type AgentId = number;

export interface Agent {
  id: AgentId;
  x: number;
  y: number;
  glyphId: number;
  facing?: 'N' | 'S' | 'E' | 'W';
  hp?: number;
  aiState?: unknown;
}

export interface AgentsState {
  agents: Agent[];
  indexById: Map<AgentId, number>;
}

export function createAgents(): AgentsState {
  return {
    agents: [],
    indexById: new Map(),
  };
}

export function addAgent(state: AgentsState, agent: Agent): AgentsState {
  if (state.indexById.has(agent.id)) return state;
  const nextAgents = state.agents.slice();
  nextAgents.push(agent);
  const nextIndex = new Map(state.indexById);
  nextIndex.set(agent.id, nextAgents.length - 1);
  return { agents: nextAgents, indexById: nextIndex };
}

export function removeAgent(state: AgentsState, id: AgentId): AgentsState {
  const idx = state.indexById.get(id);
  if (idx === undefined) return state;
  const nextAgents = state.agents.slice();
  nextAgents.splice(idx, 1);
  const nextIndex = new Map<AgentId, number>();
  nextAgents.forEach((a, i) => nextIndex.set(a.id, i));
  return { agents: nextAgents, indexById: nextIndex };
}

export function updateAgent(state: AgentsState, id: AgentId, mutate: (agent: Agent) => Agent): AgentsState {
  const idx = state.indexById.get(id);
  if (idx === undefined) return state;
  const nextAgents = state.agents.slice();
  nextAgents[idx] = mutate(nextAgents[idx]);
  // Index map stays valid because order unchanged.
  return { agents: nextAgents, indexById: state.indexById };
}

export function moveAgent(state: AgentsState, id: AgentId, dx: number, dy: number): AgentsState {
  return updateAgent(state, id, (agent) => ({ ...agent, x: agent.x + dx, y: agent.y + dy }));
}
