import type { ActorsState, ActorId, ContentsEntry, HitPoints, Renderable } from '../actors';
import type { WorldState } from '../world';
import type { RngSeed } from '../rng';
import type { PathfindingFn } from '../pathfinding';

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
  | { kind: 'open'; actorId: ActorId }
  | { kind: 'attack'; actorId: ActorId }
  | { kind: 'pickup'; actorId: ActorId }
  | { kind: 'wait'; actorId: ActorId };

export type Mutation =
  | { kind: 'actorMoved'; actorId: ActorId; from: { x: number; y: number }; to: { x: number; y: number } }
  | { kind: 'actorPositionSet'; actorId: ActorId; position: { x: number; y: number } }
  | { kind: 'actorPositionCleared'; actorId: ActorId }
  | { kind: 'actorRemoved'; actorId: ActorId }
  | { kind: 'actorAdded'; actorId: ActorId; x: number; y: number; glyphId: number }
  | { kind: 'actorRenderableSet'; actorId: ActorId; renderable: Renderable }
  | { kind: 'actorContentsSet'; actorId: ActorId; contents: ContentsEntry[] }
  | { kind: 'actorHitPointsSet'; actorId: ActorId; hitPoints: HitPoints }
  | { kind: 'pathSet'; actorId: ActorId; path: { x: number; y: number }[] };

export interface SimDiff {
  tick: number;
  actorMoves: Array<{ actorId: ActorId; from: { x: number; y: number }; to: { x: number; y: number } }>;
  actorsAdded: Array<{ actorId: ActorId; x: number; y: number; glyphId: number }>;
  actorsRemoved: ActorId[];
  commandResults: CommandResult[];
  tileChanges: Array<{ x: number; y: number; terrainTypeId?: number; flagsMask?: number; flagsOp?: 'set' | 'clear' }>;
}

export type CommandResult =
  | { kind: 'move'; actorId: ActorId; status: 'ok' | 'error'; reason?: string }
  | { kind: 'moveTo'; actorId: ActorId; status: 'ok' | 'error'; reason?: string }
  | { kind: 'mine'; actorId: ActorId; status: 'ok' | 'error'; reason?: string }
  | { kind: 'open'; actorId: ActorId; status: 'ok' | 'error'; reason?: string }
  | { kind: 'attack'; actorId: ActorId; status: 'ok' | 'error'; reason?: string }
  | { kind: 'pickup'; actorId: ActorId; status: 'ok' | 'error'; reason?: string }
  | { kind: 'wait'; actorId: ActorId; status: 'ok' };

export interface StepResult {
  nextState: GameState;
  nextSeed: RngSeed;
  diff: SimDiff;
}

export interface SimConfig {
  randomWalkOnIdle?: boolean;
  pathfinder?: PathfindingFn;
}
