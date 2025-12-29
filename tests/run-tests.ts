import { createActors, createActor, getPath, getPosition, ActorComponents } from '../src/actors';
import { createWorld, TileFlag, withTile } from '../src/world';
import { step, GameState } from '../src/sim';
import { Pathfinding } from '../src/pathfinding';
import { interpretKeyInput } from '../src/input';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  assert(actual === expected, `${message}: expected ${String(expected)} got ${String(actual)}`);
}

function assertPosition(actual: { x: number; y: number } | undefined, x: number, y: number, message: string) {
  assert(!!actual, `${message}: missing position`);
  assert(actual?.x === x && actual?.y === y, `${message}: expected (${x},${y}) got (${actual?.x},${actual?.y})`);
}

function buildWorld(width: number, height: number) {
  return createWorld({ width, height }, 0, TileFlag.Walkable);
}

function setUnwalkable(world: ReturnType<typeof buildWorld>, x: number, y: number) {
  return withTile(world, x, y, { clearFlags: TileFlag.Walkable });
}

function hasActor(state: GameState, id: number) {
  return state.actors.actors.some((actor) => actor.id === id);
}

function snapshotPositions(state: GameState) {
  return state.actors.actors
    .map((actor) => {
      const pos = getPosition(state.actors, actor.id);
      return { id: actor.id, x: pos?.x ?? null, y: pos?.y ?? null };
    })
    .sort((a, b) => a.id - b.id);
}

function run() {
  let passed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed += 1;
      console.log(`✓ ${t.name}`);
    } catch (err) {
      console.error(`✗ ${t.name}`);
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }
  if (process.exitCode) {
    console.error(`Failed ${tests.length - passed} of ${tests.length} tests.`);
  } else {
    console.log(`All ${passed} tests passed.`);
  }
}

test('pathfinding bfs returns shortest path on open grid', () => {
  const path = Pathfinding.bfs(
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    {
      inBounds: (x, y) => x >= 0 && y >= 0 && x < 3 && y < 3,
      isWalkable: () => true,
    }
  );
  assert(!!path, 'expected a path');
  assertEqual(path.length, 3, 'shortest path length');
  assertEqual(path[0].x, 0, 'path start x');
  assertEqual(path[0].y, 0, 'path start y');
  assertEqual(path[path.length - 1].x, 2, 'path goal x');
  assertEqual(path[path.length - 1].y, 0, 'path goal y');
});

test('pathfinding bfs respects blockers and unreachable targets', () => {
  const detour = Pathfinding.bfs(
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    {
      inBounds: (x, y) => x >= 0 && y >= 0 && x < 3 && y < 3,
      isWalkable: () => true,
      isBlocked: (x, y) => x === 1 && y === 0,
    }
  );
  assert(!!detour, 'expected a detour path');
  assertEqual(detour.length, 5, 'detour path length');

  const unreachable = Pathfinding.bfs(
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    {
      inBounds: (x, y) => x >= 0 && y >= 0 && x < 2 && y < 1,
      isWalkable: () => false,
    }
  );
  assert(unreachable === null, 'unreachable target should return null');
});

test('pathfinding bfs returns empty path when start equals goal', () => {
  const path = Pathfinding.bfs(
    { x: 1, y: 1 },
    { x: 1, y: 1 },
    {
      inBounds: (x, y) => x >= 0 && y >= 0 && x < 3 && y < 3,
      isWalkable: () => true,
    }
  );
  assert(Array.isArray(path) && path.length === 0, 'expected empty path for start==goal');
});

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

test('input mapping handles pause, step, and cursor movement', () => {
  const pausedCtx = { mode: 'normal', isPaused: true, hasSelectableAtCursor: false, canMine: false };
  const runningCtx = { mode: 'normal', isPaused: false, hasSelectableAtCursor: false, canMine: false };

  assertEqual(interpretKeyInput({ key: ' ', ctrlKey: true }, pausedCtx).kind, 'stepOnce', 'ctrl+space step');
  assertEqual(interpretKeyInput({ key: ' ', ctrlKey: true }, runningCtx).kind, 'togglePause', 'ctrl+space pauses when running');
  assertEqual(interpretKeyInput({ key: ' ' }, pausedCtx).kind, 'togglePause', 'space toggles pause');

  const move = interpretKeyInput({ key: 'ArrowLeft' }, pausedCtx);
  assertEqual(move.kind, 'cursorMove', 'arrow key should move cursor');
  if (move.kind === 'cursorMove') {
    assertEqual(move.dx, -1, 'cursorMove dx');
    assertEqual(move.dy, 0, 'cursorMove dy');
  }
});

test('input mapping handles move mode and mine gating', () => {
  const selectableCtx = { mode: 'normal', isPaused: false, hasSelectableAtCursor: true, canMine: false };
  const moveCtx = { mode: 'move', isPaused: false, hasSelectableAtCursor: true, canMine: false };
  const canMineCtx = { mode: 'normal', isPaused: false, hasSelectableAtCursor: true, canMine: true };
  const noMineCtx = { mode: 'normal', isPaused: false, hasSelectableAtCursor: true, canMine: false };

  assertEqual(interpretKeyInput({ key: 'Enter' }, selectableCtx).kind, 'enterMoveMode', 'enter should start move');
  assertEqual(interpretKeyInput({ key: 'Enter' }, moveCtx).kind, 'confirmMove', 'enter should confirm move');
  assertEqual(interpretKeyInput({ key: 'Escape' }, moveCtx).kind, 'cancelMove', 'escape cancels move');
  assertEqual(interpretKeyInput({ key: 'i' }, canMineCtx).kind, 'queueMine', 'mine when target exists');
  assertEqual(interpretKeyInput({ key: 'i' }, noMineCtx).kind, 'none', 'mine gated when no target');
});

test('non-walkable tiles block movement in sim', () => {
  let world = buildWorld(3, 3);
  world = setUnwalkable(world, 2, 1);
  let actors = createActors();
  actors = createActor(actors, { id: 1 }, [ActorComponents.position({ x: 1, y: 1 })]);

  const state: GameState = { world, actors, tick: 0, nextActorId: 10 };
  const result = step(state, [{ kind: 'move', actorId: 1, dir: 'E' }], 1);
  assertEqual(result.diff.actorMoves.length, 0, 'non-walkable tile should block move');
  assertPosition(getPosition(result.nextState.actors, 1), 1, 1, 'actor stays in place');
});

run();
