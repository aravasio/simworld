import { ActorComponents, createActor, removeActor, setPath, updatePosition } from '../actors';
import { nextInt, RngSeed } from '../rng';
import { Pathfinding } from '../pathfinding';
import type { Command, GameState, Mutation, SimConfig, SimDiff, StepResult } from './types';
import { maybeQueueMove, maybeQueueMoveTo } from './movement';
import { maybeQueueMine } from './mining';
import { queuePathSteps } from './pathing';

export function step(state: GameState, commands: Command[], rngSeed: RngSeed, config: SimConfig = {}): StepResult {
  const mutations: Mutation[] = [];
  let seed = rngSeed;
  let nextActorId = state.nextActorId;
  const pathfinder = config.pathfinder ?? Pathfinding.bfs;

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
