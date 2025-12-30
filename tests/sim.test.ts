import { createActors, createActor, ActorComponents, getContents, getPath, getPosition, getRenderable } from '../src/actors';
import { step, GameState } from '../src/sim';
import { buildWorld, assert, assertEqual, assertPosition, hasActor, snapshotPositions, test } from './harness';

test('move command moves one tile and updates diff', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 10 };
  const result = step(state, [{ kind: 'move', actorId: 1, dir: 'E' }], 1);

  assertEqual(result.diff.actorMoves.length, 1, 'move diff length');
  assertPosition(getPosition(result.nextState.actors, 1), 2, 1, 'actor moved east');
  assertPosition(result.diff.actorMoves[0].from, 1, 1, 'diff from');
  assertPosition(result.diff.actorMoves[0].to, 2, 1, 'diff to');
});

test('move is blocked by solid actors but allows pass-through', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.position({ x: 2, y: 1 }),
    ActorComponents.passability({ allowsPassThrough: false }),
  ]);

  const blockedState: GameState = { world, actors, tick: 0, nextActorId: 10 };
  const blockedResult = step(blockedState, [{ kind: 'move', actorId: 1, dir: 'E' }], 1);
  assertEqual(blockedResult.diff.actorMoves.length, 0, 'blocked move should not produce diff');
  assertPosition(getPosition(blockedResult.nextState.actors, 1), 1, 1, 'blocked move should not change position');

  let passableActors = createActors();
  passableActors = createActor(passableActors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  passableActors = createActor(passableActors, { id: 2 }, [
    ActorComponents.position({ x: 2, y: 1 }),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);
  const passableState: GameState = { world, actors: passableActors, tick: 0, nextActorId: 10 };
  const passableResult = step(passableState, [{ kind: 'move', actorId: 1, dir: 'E' }], 1);
  assertEqual(passableResult.diff.actorMoves.length, 1, 'pass-through should allow move');
  assertPosition(getPosition(passableResult.nextState.actors, 1), 2, 1, 'pass-through actor does not block');
});

test('moveTo sets a path and consumes one step per tick', () => {
  const world = buildWorld(7, 7);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 0, y: 4 })]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 100 };
  const seed = 123;

  let result = step(state, [{ kind: 'moveTo', actorId: 1, x: 6, y: 4 }], seed);
  let nextState = result.nextState;
  assertEqual(result.diff.actorMoves.length, 0, 'moveTo should not move on the same tick');
  assertPosition(getPosition(nextState.actors, 1), 0, 4, 'after moveTo, actor should not move yet');
  const path = getPath(nextState.actors, 1);
  assert(!!path, 'path should be stored after moveTo');
  assertEqual(path.length, 6, 'path length should be 6');

  let currState = nextState;
  let currSeed = result.nextSeed;
  for (let stepIndex = 1; stepIndex <= 6; stepIndex += 1) {
    result = step(currState, [], currSeed);
    currState = result.nextState;
    currSeed = result.nextSeed;
    assertEqual(result.diff.actorMoves.length, 1, `move diff length on tick ${stepIndex}`);
    assertPosition(getPosition(currState.actors, 1), stepIndex, 4, `after tick ${stepIndex}, actor should advance`);
  }
  const finalPath = getPath(currState.actors, 1);
  assert(!finalPath || finalPath.length === 0, 'path should be consumed after final step');
});

test('deterministic steps produce identical diffs and positions', () => {
  const world = buildWorld(4, 4);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  actors = createActor(actors, { id: 2 }, [ActorComponents.position({ x: 2, y: 2 })]);
  const state: GameState = { world, actors, tick: 0, nextActorId: 10 };
  const commands = [{ kind: 'move', actorId: 1, dir: 'E' }] as const;
  const seed = 999;

  const resultA = step(state, commands, seed);
  const resultB = step(state, commands, seed);
  assertEqual(JSON.stringify(resultA.diff), JSON.stringify(resultB.diff), 'diff should match');
  assertEqual(resultA.nextSeed, resultB.nextSeed, 'next seed should match');
  assertEqual(JSON.stringify(snapshotPositions(resultA.nextState)), JSON.stringify(snapshotPositions(resultB.nextState)), 'positions should match');
});

test('mine works for adjacent (including diagonal) target and updates state', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.position({ x: 2, y: 2 }),
    ActorComponents.kind('rock'),
    ActorComponents.targetable(true),
  ]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 10 };
  const seed = 4242;
  const result = step(state, [{ kind: 'mine', actorId: 1 }], seed);

  assert(result.diff.actorsRemoved.includes(2), 'rock should be removed');
  assert(result.diff.actorsAdded.length >= 1 && result.diff.actorsAdded.length <= 5, 'drop count should be 1-5');
  assert(!hasActor(result.nextState, 2), 'removed rock should not exist in next state');
  for (const drop of result.diff.actorsAdded) {
    const dropPos = getPosition(result.nextState.actors, drop.actorId);
    assertPosition(dropPos, 2, 2, 'drop position should match rock tile');
  }

  const rerun = step(state, [{ kind: 'mine', actorId: 1 }], seed);
  assertEqual(JSON.stringify(result.diff), JSON.stringify(rerun.diff), 'same seed should reproduce mining diff');
});

test('mine does nothing when no adjacent target exists', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 0, y: 0 })]);
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.position({ x: 2, y: 2 }),
    ActorComponents.kind('rock'),
    ActorComponents.targetable(true),
  ]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 10 };
  const result = step(state, [{ kind: 'mine', actorId: 1 }], 1);
  assertEqual(result.diff.actorsRemoved.length, 0, 'no rock should be removed');
  assertEqual(result.diff.actorsAdded.length, 0, 'no drops should be added');
});

test('open drops chest contents and marks it open', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  actors = createActor(actors, { id: 10 }, [
    ActorComponents.kind('gold-coin'),
    ActorComponents.renderable({ glyphId: 6 }),
    ActorComponents.stackable({ count: 5 }),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.kind('chest'),
    ActorComponents.position({ x: 1, y: 2 }),
    ActorComponents.renderable({ glyphId: 5 }),
    ActorComponents.hp({ hp: 3, maxHp: 3 }),
    ActorComponents.lock({ isLocked: false }),
    ActorComponents.contents([{ kind: 'stack', itemId: 10 }]),
    ActorComponents.targetable(true),
    ActorComponents.passability({ allowsPassThrough: false }),
  ]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 20 };
  const result = step(state, [{ kind: 'open', actorId: 1 }], 1);

  const chestContents = getContents(result.nextState.actors, 2);
  assertEqual(result.diff.commandResults[0].status, 'ok', 'open should succeed');
  assertEqual(chestContents?.length ?? 0, 0, 'chest should be emptied');
  assertPosition(getPosition(result.nextState.actors, 10), 1, 2, 'contents dropped at chest position');
  assertEqual(getRenderable(result.nextState.actors, 2)?.glyphId, 7, 'chest should switch to open glyph');
});

test('attack destroys chest at zero hp and drops contents', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  actors = createActor(actors, { id: 10 }, [
    ActorComponents.kind('gold-coin'),
    ActorComponents.renderable({ glyphId: 6 }),
    ActorComponents.stackable({ count: 1 }),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.kind('chest'),
    ActorComponents.position({ x: 1, y: 2 }),
    ActorComponents.renderable({ glyphId: 5 }),
    ActorComponents.hp({ hp: 1, maxHp: 1 }),
    ActorComponents.lock({ isLocked: false }),
    ActorComponents.contents([{ kind: 'stack', itemId: 10 }]),
    ActorComponents.targetable(true),
    ActorComponents.passability({ allowsPassThrough: false }),
  ]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 20 };
  const result = step(state, [{ kind: 'attack', actorId: 1 }], 1);

  assert(result.diff.actorsRemoved.includes(2), 'chest should be removed');
  assert(!hasActor(result.nextState, 2), 'removed chest should not exist in next state');
  assertPosition(getPosition(result.nextState.actors, 10), 1, 2, 'contents dropped at chest position');
});

test('attack reduces creature vitals hit points', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.kind('creature'),
    ActorComponents.position({ x: 1, y: 2 }),
    ActorComponents.vitals({
      hitPoints: { hp: 3, maxHp: 3 },
      manaPoints: { mp: 0, maxMp: 0 },
      staminaPoints: { stamina: 0, maxStamina: 0 },
    }),
  ]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 20 };
  const result = step(state, [{ kind: 'attack', actorId: 1 }], 1);

  assertEqual(result.diff.commandResults[0].status, 'ok', 'attack should succeed');
  const vitals = getVitals(result.nextState.actors, 2);
  assertEqual(vitals?.hitPoints.hp, 2, 'attack should reduce vitals hp');
});

test('pickup moves item into actor contents and clears position', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  actors = createActor(actors, { id: 10 }, [
    ActorComponents.kind('gold-coin'),
    ActorComponents.position({ x: 1, y: 2 }),
    ActorComponents.renderable({ glyphId: 6 }),
    ActorComponents.stackable({ count: 2 }),
    ActorComponents.tags(['item']),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 20 };
  const result = step(state, [{ kind: 'pickup', actorId: 1 }], 1);

  const contents = getContents(result.nextState.actors, 1);
  assertEqual(result.diff.commandResults[0].status, 'ok', 'pickup should succeed');
  assertEqual(contents?.length ?? 0, 1, 'pickup should add one contents entry');
  assertEqual(contents?.[0]?.itemId, 10, 'contents entry should reference item actor');
  assertEqual(contents?.[0]?.kind, 'stack', 'stackable item should use stack entry');
  assert(!getPosition(result.nextState.actors, 10), 'picked item should have no position');
});

test('pickup works when item is on the same tile', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  actors = createActor(actors, { id: 10 }, [
    ActorComponents.kind('gold-coin'),
    ActorComponents.position({ x: 1, y: 1 }),
    ActorComponents.renderable({ glyphId: 6 }),
    ActorComponents.stackable({ count: 1 }),
    ActorComponents.tags(['item']),
    ActorComponents.passability({ allowsPassThrough: true }),
  ]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 20 };
  const result = step(state, [{ kind: 'pickup', actorId: 1 }], 1);

  assertEqual(result.diff.commandResults[0].status, 'ok', 'pickup should succeed');
  assert(!getPosition(result.nextState.actors, 10), 'picked item should have no position');
});

test('moveTo reports error and does not change state when blocked', () => {
  const world = buildWorld(3, 3);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);
  actors = createActor(actors, { id: 2 }, [
    ActorComponents.position({ x: 2, y: 1 }),
    ActorComponents.passability({ allowsPassThrough: false }),
  ]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 10 };
  const result = step(state, [{ kind: 'moveTo', actorId: 1, x: 2, y: 1 }], 1);

  assertEqual(result.diff.commandResults.length, 1, 'command result should be reported');
  const cmd = result.diff.commandResults[0];
  assertEqual(cmd.kind, 'moveTo', 'command kind');
  assertEqual(cmd.status, 'error', 'command status');
  assertEqual(cmd.reason, 'blocked', 'blocked reason');
  assertPosition(getPosition(result.nextState.actors, 1), 1, 1, 'blocked moveTo should not move actor');
  const path = getPath(result.nextState.actors, 1);
  assert(!path || path.length === 0, 'blocked moveTo should not store a path');
});
