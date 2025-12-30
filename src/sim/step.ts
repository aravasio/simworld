import {
  ActorComponents,
  createActor,
  removeActor,
  setPath,
  setContents,
  setHitPoints,
  setPosition,
  updatePosition,
  updateRenderable,
  getPosition,
} from '../actors';
import { nextInt, RngSeed } from '../rng';
import { Pathfinding } from '../pathfinding';
import type { Command, GameState, Mutation, SimConfig, SimDiff, StepResult, CommandResult } from './types';
import { maybeQueueMove, getMoveFailureReason, planMoveTo, getDirOffset } from './movement';
import { maybeQueueMine } from './mining';
import { maybeQueueAttack, maybeQueueOpen } from './interactions';
import { queuePathSteps } from './pathing';

export function step(state: GameState, commands: Command[], rngSeed: RngSeed, config: SimConfig = {}): StepResult {
  const mutations: Mutation[] = [];
  const commandResults: CommandResult[] = [];
  let seed = rngSeed;
  let nextActorId = state.nextActorId;
  const pathfinder = config.pathfinder ?? Pathfinding.bfs;

  for (const cmd of commands) {
    if (cmd.kind === 'move') {
      const pos = getPosition(state.actors, cmd.actorId);
      if (!pos) {
        commandResults.push({ kind: 'move', actorId: cmd.actorId, status: 'error', reason: 'missing_position' });
        continue;
      }
      const { dx, dy } = getDirOffset(cmd.dir);
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      const failure = getMoveFailureReason(state, cmd.actorId, nx, ny);
      if (failure) {
        commandResults.push({ kind: 'move', actorId: cmd.actorId, status: 'error', reason: failure });
      } else {
        maybeQueueMove(mutations, state, cmd.actorId, cmd.dir);
        commandResults.push({ kind: 'move', actorId: cmd.actorId, status: 'ok' });
      }
    } else if (cmd.kind === 'moveTo') {
      const plan = planMoveTo(state, cmd.actorId, cmd.x, cmd.y, pathfinder);
      if (plan.status === 'error') {
        commandResults.push({ kind: 'moveTo', actorId: cmd.actorId, status: 'error', reason: plan.reason });
      } else {
        const steps = plan.path.slice(1);
        mutations.push({ kind: 'pathSet', actorId: cmd.actorId, path: steps });
        commandResults.push({ kind: 'moveTo', actorId: cmd.actorId, status: 'ok' });
      }
    } else if (cmd.kind === 'mine') {
      const result = maybeQueueMine(mutations, state, cmd.actorId, nextActorId, seed);
      nextActorId = result.nextActorId;
      seed = result.nextSeed;
      commandResults.push({ kind: 'mine', actorId: cmd.actorId, status: result.status, reason: result.reason });
    } else if (cmd.kind === 'open') {
      const result = maybeQueueOpen(mutations, state, cmd.actorId);
      commandResults.push({ kind: 'open', actorId: cmd.actorId, status: result.status, reason: result.reason });
    } else if (cmd.kind === 'attack') {
      const result = maybeQueueAttack(mutations, state, cmd.actorId);
      commandResults.push({ kind: 'attack', actorId: cmd.actorId, status: result.status, reason: result.reason });
    } else if (cmd.kind === 'wait') {
      commandResults.push({ kind: 'wait', actorId: cmd.actorId, status: 'ok' });
    }
  }

  if (config.randomWalkOnIdle) {
    const idleActors = state.actors.actors.filter((a) => !commands.some((c) => c.kind !== 'wait' && c.actorId === a.id));
    for (const actor of idleActors) {
      const dirIndex = nextInt(seed, 4);
      seed = dirIndex.nextSeed;
      const dir = (['N', 'S', 'E', 'W'] as const)[dirIndex.value];
      maybeQueueMove(mutations, state, actor.id, dir);
    }
  }

  queuePathSteps(mutations, state);

  let nextActors = state.actors;
  const actorMoves: SimDiff['actorMoves'] = [];
  const actorsAdded: SimDiff['actorsAdded'] = [];
  const actorsRemoved: SimDiff['actorsRemoved'] = [];
  for (const m of mutations) {
    if (m.kind === 'actorMoved') {
      nextActors = updatePosition(nextActors, m.actorId, { x: m.to.x, y: m.to.y });
      actorMoves.push({ actorId: m.actorId, from: m.from, to: m.to });
    } else if (m.kind === 'actorPositionSet') {
      nextActors = setPosition(nextActors, m.actorId, m.position);
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
    } else if (m.kind === 'actorRenderableSet') {
      nextActors = updateRenderable(nextActors, m.actorId, m.renderable);
    } else if (m.kind === 'actorContentsSet') {
      nextActors = setContents(nextActors, m.actorId, m.contents);
    } else if (m.kind === 'actorHitPointsSet') {
      nextActors = setHitPoints(nextActors, m.actorId, m.hitPoints);
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
    commandResults,
    tileChanges: [],
  };

  return { nextState, nextSeed: seed, diff };
}
